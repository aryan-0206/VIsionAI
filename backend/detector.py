"""
VisionAI — YOLO Engine (Batch 1)
=================================
Core YOLO architecture: model loading, inference, drawing, filtering.
Loaded ONCE at startup; never reloaded per frame.
"""

import time
import logging
from pathlib import Path
from typing import Optional, Any, Dict, List

import cv2
import numpy as np
import torch
from ultralytics import YOLO

logger = logging.getLogger("visionai.yolo_engine")

# ──────────────────────────────────────────────
# COCO class color palette  (80 classes)
# Each class gets a deterministic, visually distinct colour.
# ──────────────────────────────────────────────
def _build_palette(n: int = 80) -> list[tuple[int, int, int]]:
    """Generate n visually distinct BGR colours."""
    palette: list[tuple[int, int, int]] = []
    for i in range(n):
        # OpenCV HSV: H in [0,179], S in [0,255], V in [0,255]
        hue = int((i * 137.508) % 180)           # golden-angle, clamped to [0,179]
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
    "all":         [],   # empty → accept everything
}


class YOLOEngine:
    """
    Singleton-style YOLO inference engine.
    Load once; call detect() every frame.
    """

    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        conf_threshold: float = 0.40,
        device: Optional[str] = None,
    ) -> None:
        self.model_name = model_name
        self.conf_threshold = conf_threshold

        # ── Device selection ──────────────────
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        logger.info("YOLOEngine: device=%s", self.device)

        # ── Model loading (auto-download if missing) ──
        model_path = Path(model_name)
        logger.info("YOLOEngine: loading model %s …", model_name)
        try:
            self.model = YOLO(str(model_path))
            self.model.to(self.device)
            logger.info("YOLOEngine: model ready on %s", self.device)
        except Exception as exc:
            logger.exception("YOLOEngine: failed to load model — %s", exc)
            raise RuntimeError(f"Cannot load YOLO model '{model_name}': {exc}") from exc

        # Class names from model
        self.class_names: list[str] = list(self.model.names.values())
        logger.info("YOLOEngine: %d classes available", len(self.class_names))

        # Runtime toggles (mutated by API endpoints)
        self.show_boxes      = True
        self.show_labels     = True
        self.show_confidence = True
        self.paused          = False
        self.active_filter   = "all"        # "all" | "person" | "vehicles" | "animals" | "electronics"

        # Internal stats
        self._last_inference_ms = 0.0
        self._last_fps          = 0.0
        self._last_object_count = 0
        self._frame_count       = 0
        self._fps_timer         = time.time()

    # ──────────────────────────────────────────
    # Public: run inference on a BGR frame
    # ──────────────────────────────────────────
    def detect(self, frame: np.ndarray) -> np.ndarray:
        """
        Run YOLOv8 inference on *frame* (BGR numpy array).
        Returns the annotated frame (also BGR).
        When paused, returns the original frame unchanged.
        """
        if self.paused:
            return frame

        t0 = time.perf_counter()

        results = self.model(
            frame,
            conf=self.conf_threshold,
            verbose=False,
            device=self.device,
        )

        self._last_inference_ms = (time.perf_counter() - t0) * 1000

        # FPS via rolling window
        self._frame_count += 1
        elapsed = time.time() - self._fps_timer
        if elapsed >= 1.0:
            self._last_fps   = self._frame_count / elapsed
            self._frame_count = 0
            self._fps_timer  = time.time()

        # Draw detections onto frame
        annotated = self._draw(frame, results)
        return annotated

    def detect_and_parse(self, frame: np.ndarray) -> tuple[np.ndarray, list[dict[str, Any]], float]:
        """
        Run YOLOv8 inference.
        Returns (annotated_frame, list_of_objects, inference_time_seconds).
        """
        if self.paused:
            return frame, [], 0.0

        t0 = time.perf_counter()
        results = self.model(
            frame,
            conf=self.conf_threshold,
            verbose=False,
            device=self.device,
        )
        inference_time = time.perf_counter() - t0
        self._last_inference_ms = inference_time * 1000

        # FPS via rolling window
        self._frame_count += 1
        elapsed = time.time() - self._fps_timer
        if elapsed >= 1.0:
            self._last_fps   = self._frame_count / elapsed
            self._frame_count = 0
            self._fps_timer  = time.time()

        # Draw and extract objects
        annotated, objects = self._draw_and_extract(frame, results)
        return annotated, objects, inference_time

    def _draw_and_extract(self, frame: np.ndarray, results) -> tuple[np.ndarray, list[dict[str, Any]]]:
        out = frame.copy()
        count = 0
        objects: list[dict[str, Any]] = []

        result = results[0]
        if result.boxes is None:
            self._last_object_count = 0
            return out, []

        allowed = self._allowed_classes()

        for box in result.boxes:
            cls_id   = int(box.cls[0])
            conf     = float(box.conf[0])
            name     = self.class_names[cls_id] if cls_id < len(self.class_names) else str(cls_id)

            # Filter by category
            if allowed is not None and name.lower() not in allowed:
                continue

            objects.append({
                "label": name,
                "confidence": conf,
                "bbox": [float(v) for v in box.xyxy[0].tolist()],
            })

            count += 1
            color = CLASS_PALETTE[cls_id % len(CLASS_PALETTE)]

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            if self.show_boxes:
                self._draw_rounded_box(out, x1, y1, x2, y2, color)

            if self.show_labels or self.show_confidence:
                label = self._build_label(name, conf)
                self._draw_label(out, label, x1, y1, color)

        self._last_object_count = count
        return out, objects

    # ──────────────────────────────────────────
    # Drawing
    # ──────────────────────────────────────────
    def _draw(self, frame: np.ndarray, results) -> np.ndarray:
        out = frame.copy()
        count = 0

        result = results[0]
        if result.boxes is None:
            self._last_object_count = 0
            return out

        allowed = self._allowed_classes()

        for box in result.boxes:
            cls_id   = int(box.cls[0])
            conf     = float(box.conf[0])
            name     = self.class_names[cls_id] if cls_id < len(self.class_names) else str(cls_id)

            # Filter by category
            if allowed is not None and name.lower() not in allowed:
                continue

            count += 1
            color = CLASS_PALETTE[cls_id % len(CLASS_PALETTE)]

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            if self.show_boxes:
                self._draw_rounded_box(out, x1, y1, x2, y2, color)

            if self.show_labels or self.show_confidence:
                label = self._build_label(name, conf)
                self._draw_label(out, label, x1, y1, color)

        self._last_object_count = count
        return out

    def _draw_rounded_box(
        self,
        img: np.ndarray,
        x1: int, y1: int, x2: int, y2: int,
        color: tuple[int, int, int],
        thickness: int = 2,
        r: int = 8,
    ) -> None:
        """Draw a rectangle with rounded corners."""
        # Clamp radius
        r = min(r, (x2 - x1) // 4, (y2 - y1) // 4)

        # Straight segments
        cv2.line(img, (x1 + r, y1), (x2 - r, y1), color, thickness)
        cv2.line(img, (x1 + r, y2), (x2 - r, y2), color, thickness)
        cv2.line(img, (x1, y1 + r), (x1, y2 - r), color, thickness)
        cv2.line(img, (x2, y1 + r), (x2, y2 - r), color, thickness)

        # Corner arcs
        cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180,  0,  90, color, thickness)
        cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270,  0,  90, color, thickness)
        cv2.ellipse(img, (x1 + r, y2 - r), (r, r),  90,  0,  90, color, thickness)
        cv2.ellipse(img, (x2 - r, y2 - r), (r, r),   0,  0,  90, color, thickness)

        # Subtle fill for visibility
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

        # Background pill
        bx1 = x1
        by1 = max(0, y1 - th - 2 * pad)
        bx2 = x1 + tw + 2 * pad
        by2 = y1

        # Darken color for background
        bg_color = tuple(max(0, int(c * 0.6)) for c in color)
        cv2.rectangle(img, (bx1, by1), (bx2, by2), bg_color, -1)
        cv2.rectangle(img, (bx1, by1), (bx2, by2), color, 1)

        # White text
        cv2.putText(
            img, label,
            (bx1 + pad, by2 - pad),
            font, font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA,
        )

    # ──────────────────────────────────────────
    # Filtering helpers
    # ──────────────────────────────────────────
    def _allowed_classes(self) -> Optional[set[str]]:
        """Return a set of allowed class names, or None for 'all'."""
        if self.active_filter == "all":
            return None
        classes = CATEGORY_MAP.get(self.active_filter)
        if not classes:
            return None
        return {c.lower() for c in classes}

    # ──────────────────────────────────────────
    # Live statistics
    # ──────────────────────────────────────────
    def get_stats(self, width: int = 0, height: int = 0) -> dict:
        return {
            "fps":            round(self._last_fps, 1),
            "inference_ms":   round(self._last_inference_ms, 1),
            "objects":        self._last_object_count,
            "model":          self.model_name,
            "resolution":     f"{width}×{height}" if width and height else "—",
            "device":         self.device.upper(),
            "conf_threshold": self.conf_threshold,
            "paused":         self.paused,
            "show_boxes":     self.show_boxes,
            "show_labels":    self.show_labels,
            "show_confidence": self.show_confidence,
            "active_filter":  self.active_filter,
        }

    # ──────────────────────────────────────────
    # Control API
    # ──────────────────────────────────────────
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
        """Hot-swap the YOLO model (blocks until loaded)."""
        logger.info("YOLOEngine: switching to model %s …", model_name)
        self.model = YOLO(model_name)
        self.model.to(self.device)
        self.model_name   = model_name
        self.class_names  = list(self.model.names.values())
        logger.info("YOLOEngine: switched to %s", model_name)
