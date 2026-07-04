"""
VisionAI — YOLO Engine (Lightweight OpenCV DNN)
=================================================
Core YOLO architecture using OpenCV DNN.
Loads ONNX model to avoid heavy PyTorch/Ultralytics memory overhead on Render.
"""

import time
import logging
import urllib.request
from pathlib import Path
from typing import Optional, Any, Dict, List

import cv2
import numpy as np

logger = logging.getLogger("visionai.yolo_engine")

# ──────────────────────────────────────────────
# COCO class names (80 classes)
# ──────────────────────────────────────────────
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light",
    "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
    "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed",
    "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave", "oven",
    "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

# ──────────────────────────────────────────────
# COCO class color palette  (80 classes)
# ──────────────────────────────────────────────
def _build_palette(n: int = 80) -> list[tuple[int, int, int]]:
    """Generate n visually distinct BGR colours."""
    palette: list[tuple[int, int, int]] = []
    for i in range(n):
        hue = int((i * 137.508) % 180)
        hsv = np.uint8([[[hue, 220, 220]]])
        bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)[0][0]
        palette.append((int(bgr[0]), int(bgr[1]), int(bgr[2])))
    return palette

CLASS_PALETTE = _build_palette(80)

# ──────────────────────────────────────────────
# COCO class → category grouping
# ──────────────────────────────────────────────
CATEGORY_MAP: dict[str, list[str]] = {
    "person":      ["person"],
    "vehicles":    ["bicycle","car","motorbike","motorcycle","aeroplane","airplane",
                    "bus","train","truck","boat"],
    "animals":     ["cat","dog","horse","sheep","cow","elephant","bear","zebra",
                    "giraffe","bird"],
    "electronics": ["tv","tvmonitor","laptop","mouse","remote","keyboard",
                    "cell phone","microwave","oven","toaster"],
    "all":         [],
}


class YOLOEngine:
    """
    Singleton-style YOLO inference engine using OpenCV DNN.
    Loads yolov8n.onnx for lightweight execution.
    """

    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        conf_threshold: float = 0.40,
        device: Optional[str] = None,
    ) -> None:
        # Convert any .pt requests to .onnx for lightweight backend
        if model_name.endswith(".pt"):
            model_name = model_name.replace(".pt", ".onnx")

        self.model_name = model_name
        self.conf_threshold = conf_threshold
        self.nms_threshold = 0.45
        self.device = "CPU"

        model_path = Path(model_name)
        if not model_path.exists():
            model_path.parent.mkdir(parents=True, exist_ok=True)
            logger.info("YOLOEngine: downloading model %s …", model_name)
            url = "https://huggingface.co/cabelo/yolov8/resolve/main/yolov8n.onnx"
            try:
                urllib.request.urlretrieve(url, str(model_path))
            except Exception as e:
                logger.exception("Failed to download ONNX model: %s", e)
                raise RuntimeError(f"Cannot download YOLO ONNX model: {e}") from e

        logger.info("YOLOEngine: loading model %s via cv2.dnn …", model_name)
        try:
            self.net = cv2.dnn.readNet(str(model_path))
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            logger.info("YOLOEngine: model ready on CPU")
        except Exception as exc:
            logger.exception("YOLOEngine: failed to load model — %s", exc)
            raise RuntimeError(f"Cannot load YOLO model '{model_name}': {exc}") from exc

        self.class_names: list[str] = COCO_CLASSES

        # Runtime toggles
        self.show_boxes      = True
        self.show_labels     = True
        self.show_confidence = True
        self.paused          = False
        self.active_filter   = "all"

        # Internal stats
        self._last_inference_ms = 0.0
        self._last_fps          = 0.0
        self._last_object_count = 0
        self._frame_count       = 0
        self._fps_timer         = time.time()

    def detect(self, frame: np.ndarray) -> np.ndarray:
        """Run inference and return only the annotated frame."""
        annotated, _, _ = self.detect_and_parse(frame)
        return annotated

    def detect_and_parse(self, frame: np.ndarray) -> tuple[np.ndarray, list[dict[str, Any]], float]:
        """
        Run YOLOv8 inference using OpenCV DNN.
        Returns (annotated_frame, list_of_objects, inference_time_seconds).
        """
        if self.paused:
            return frame, [], 0.0

        t0 = time.perf_counter()
        height, width = frame.shape[:2]

        # YOLOv8 ONNX expects 640x640 input
        blob = cv2.dnn.blobFromImage(frame, 1/255.0, (640, 640), swapRB=True, crop=False)
        self.net.setInput(blob)
        outputs = self.net.forward() # shape: (1, 84, 8400)

        output = outputs[0].T # shape: (8400, 84)

        boxes = []
        confidences = []
        class_ids = []

        for row in output:
            classes_scores = row[4:]
            max_idx = np.argmax(classes_scores)
            max_score = classes_scores[max_idx]

            if max_score >= self.conf_threshold:
                cx, cy, w, h = row[0:4]

                # Rescale coordinates to original frame size
                x_center = cx * (width / 640.0)
                y_center = cy * (height / 640.0)
                box_width = w * (width / 640.0)
                box_height = h * (height / 640.0)

                left = int(x_center - box_width / 2)
                top = int(y_center - box_height / 2)

                boxes.append([left, top, int(box_width), int(box_height)])
                confidences.append(float(max_score))
                class_ids.append(int(max_idx))

        indices = cv2.dnn.NMSBoxes(boxes, confidences, self.conf_threshold, self.nms_threshold)

        inference_time = time.perf_counter() - t0
        self._last_inference_ms = inference_time * 1000

        # FPS via rolling window
        self._frame_count += 1
        elapsed = time.time() - self._fps_timer
        if elapsed >= 1.0:
            self._last_fps   = self._frame_count / elapsed
            self._frame_count = 0
            self._fps_timer  = time.time()

        out = frame.copy()
        count = 0
        objects: list[dict[str, Any]] = []
        allowed = self._allowed_classes()

        if len(indices) > 0:
            # Flatten indices if nested (depends on OpenCV version)
            flat_indices = np.array(indices).flatten()
            for i in flat_indices:
                box = boxes[i]
                conf = confidences[i]
                cls_id = class_ids[i]
                name = self.class_names[cls_id] if cls_id < len(self.class_names) else str(cls_id)

                if allowed is not None and name.lower() not in allowed:
                    continue

                x1, y1, w_val, h_val = box
                x2 = x1 + w_val
                y2 = y1 + h_val

                objects.append({
                    "label": name,
                    "confidence": conf,
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                })

                count += 1
                color = CLASS_PALETTE[cls_id % len(CLASS_PALETTE)]

                if self.show_boxes:
                    self._draw_rounded_box(out, x1, y1, x2, y2, color)

                if self.show_labels or self.show_confidence:
                    label = self._build_label(name, conf)
                    self._draw_label(out, label, x1, y1, color)

        self._last_object_count = count
        return out, objects, inference_time

    def _draw_rounded_box(
        self,
        img: np.ndarray,
        x1: int, y1: int, x2: int, y2: int,
        color: tuple[int, int, int],
        thickness: int = 2,
        r: int = 8,
    ) -> None:
        r = min(r, (x2 - x1) // 4, (y2 - y1) // 4)
        if r > 0:
            cv2.line(img, (x1 + r, y1), (x2 - r, y1), color, thickness)
            cv2.line(img, (x1 + r, y2), (x2 - r, y2), color, thickness)
            cv2.line(img, (x1, y1 + r), (x1, y2 - r), color, thickness)
            cv2.line(img, (x2, y1 + r), (x2, y2 - r), color, thickness)
            cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180,  0,  90, color, thickness)
            cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270,  0,  90, color, thickness)
            cv2.ellipse(img, (x1 + r, y2 - r), (r, r),  90,  0,  90, color, thickness)
            cv2.ellipse(img, (x2 - r, y2 - r), (r, r),   0,  0,  90, color, thickness)
        else:
            cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)

        overlay = img.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        cv2.addWeighted(overlay, 0.08, img, 0.92, 0, img)

    def _build_label(self, name: str, conf: float) -> str:
        parts: list[str] = []
        if self.show_labels:
            parts.append(name.capitalize())
        if self.show_confidence:
            parts.append(f"{conf * 100:.0f}%")
        return " ".join(parts)

    def _draw_label(
        self,
        img: np.ndarray,
        label: str,
        x1: int, y1: int,
        color: tuple[int, int, int],
    ) -> None:
        font       = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        thickness  = 1
        pad        = 5

        (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)

        bx1 = x1
        by1 = max(0, y1 - th - 2 * pad)
        bx2 = x1 + tw + 2 * pad
        by2 = y1

        bg_color = tuple(max(0, int(c * 0.6)) for c in color)
        cv2.rectangle(img, (bx1, by1), (bx2, by2), bg_color, -1)
        cv2.rectangle(img, (bx1, by1), (bx2, by2), color, 1)

        cv2.putText(
            img, label,
            (bx1 + pad, by2 - pad),
            font, font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA,
        )

    def _allowed_classes(self) -> Optional[set[str]]:
        if self.active_filter == "all":
            return None
        classes = CATEGORY_MAP.get(self.active_filter)
        if not classes:
            return None
        return {c.lower() for c in classes}

    def get_stats(self, width: int = 0, height: int = 0) -> dict:
        return {
            "fps":            round(self._last_fps, 1),
            "inference_ms":   round(self._last_inference_ms, 1),
            "objects":        self._last_object_count,
            "model":          self.model_name,
            "resolution":     f"{width}×{height}" if width and height else "—",
            "device":         self.device,
            "conf_threshold": self.conf_threshold,
            "paused":         self.paused,
            "show_boxes":     self.show_boxes,
            "show_labels":    self.show_labels,
            "show_confidence": self.show_confidence,
            "active_filter":  self.active_filter,
        }

    def set_conf(self, value: float) -> None:
        self.conf_threshold = max(0.01, min(1.0, value))

    def set_show_boxes(self, value: bool) -> None:
        self.show_boxes = value

    def set_show_labels(self, value: bool) -> None:
        self.show_labels = value

    def set_show_confidence(self, value: bool) -> None:
        self.show_confidence = value

    def set_paused(self, value: bool) -> None:
        self.paused = value

    def set_filter(self, category: str) -> None:
        if category in CATEGORY_MAP:
            self.active_filter = category

    def switch_model(self, model_name: str) -> None:
        logger.info("YOLOEngine: switching to model %s …", model_name)
        if model_name.endswith(".pt"):
            model_name = model_name.replace(".pt", ".onnx")

        model_path = Path(model_name)
        if not model_path.exists():
            model_path.parent.mkdir(parents=True, exist_ok=True)
            url = "https://huggingface.co/cabelo/yolov8/resolve/main/yolov8n.onnx"
            urllib.request.urlretrieve(url, str(model_path))

        self.net = cv2.dnn.readNet(str(model_path))
        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        self.model_name   = model_name
        logger.info("YOLOEngine: switched to %s", model_name)
