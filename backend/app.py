import json
import os
import platform
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

# Load .env file if present (local dev only — no effect on Render/cloud)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass  # python-dotenv not installed — fine for cloud deploys

import cv2
import numpy as np
from flask import Flask, Response, jsonify, make_response, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from detector import YOLOEngine, CATEGORY_MAP

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
UPLOAD_DIR = PROJECT_DIR / "uploads"
OUTPUT_DIR = PROJECT_DIR / "outputs"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
HISTORY_FILE = OUTPUT_DIR / "history.json"

for directory in (UPLOAD_DIR, OUTPUT_DIR, SCREENSHOT_DIR, BASE_DIR / "models"):
    directory.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "*"))

_engine: YOLOEngine | None = None
_engine_error = ""
_camera: cv2.VideoCapture | None = None
_detection_active = True
_last_frame: np.ndarray | None = None
_latest_detections: list[dict[str, Any]] = []
_started_at = time.time()


def get_engine() -> YOLOEngine | None:
    global _engine, _engine_error
    if _engine is not None:
        return _engine
    try:
        model_name = os.getenv("YOLO_MODEL", str(PROJECT_DIR / "models" / "yolov8n.pt"))
        confidence = float(os.getenv("YOLO_CONFIDENCE", "0.4"))
        _engine = YOLOEngine(model_name=model_name, conf_threshold=confidence)
        _engine_error = ""
        return _engine
    except Exception as exc:
        _engine_error = str(exc)
        return None


def _prewarm_engine() -> None:
    """Load YOLO model in a background thread at startup so the first request is fast."""
    import logging
    log = logging.getLogger("visionai.prewarm")
    log.info("Pre-warming YOLO engine…")
    engine = get_engine()
    if engine:
        # Run a tiny dummy inference to trigger JIT compilation
        try:
            dummy = np.zeros((64, 64, 3), dtype=np.uint8)
            engine.detect_and_parse(dummy)
            log.info("YOLO engine warm-up complete.")
        except Exception as exc:
            log.warning("Warm-up inference failed: %s", exc)
    else:
        log.warning("YOLO engine failed to load: %s", _engine_error)


# Kick off pre-warming immediately (non-blocking)
threading.Thread(target=_prewarm_engine, daemon=True).start()


def load_history() -> list[dict[str, Any]]:
    if not HISTORY_FILE.exists():
        return []
    try:
        return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def save_history(entries: list[dict[str, Any]]) -> None:
    HISTORY_FILE.write_text(json.dumps(entries[:500], indent=2), encoding="utf-8")


def add_history(entry: dict[str, Any]) -> None:
    save_history([entry, *load_history()])


def file_url(filename: str) -> str:
    return f"/outputs/{filename}"


def parse_results(results: Any, class_names: list[str]) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    if not results or results[0].boxes is None:
        return objects

    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        label = class_names[cls_id] if cls_id < len(class_names) else str(cls_id)
        objects.append({
            "label": label,
            "confidence": float(box.conf[0]),
            "bbox": [float(v) for v in box.xyxy[0].tolist()],
        })
    return objects


def detect_frame(frame: np.ndarray) -> tuple[np.ndarray, list[dict[str, Any]], float]:
    engine = get_engine()
    if engine is None:
        return frame, [], 0.0
    return engine.detect_and_parse(frame)


def open_camera() -> cv2.VideoCapture | None:
    global _camera
    if _camera is not None and _camera.isOpened():
        return _camera

    index = int(os.getenv("CAMERA_INDEX", "0"))

    # On Windows, DirectShow (CAP_DSHOW) is far more reliable for webcam
    # access than the default backend (CAP_ANY), which often silently fails
    # with built-in and USB cameras.
    _backends = (
        [cv2.CAP_DSHOW, cv2.CAP_ANY]
        if platform.system() == "Windows"
        else [cv2.CAP_ANY]
    )

    cap: cv2.VideoCapture | None = None
    for backend in _backends:
        c = cv2.VideoCapture(index, backend)
        if c.isOpened():
            cap = c
            break
        c.release()

    # Fallback: try camera indices 1-4 with each backend
    if cap is None or not cap.isOpened():
        for fallback in range(1, 5):
            for backend in _backends:
                c = cv2.VideoCapture(fallback, backend)
                if c.isOpened():
                    cap = c
                    break
                c.release()
            if cap is not None and cap.isOpened():
                break

    if cap is None or not cap.isOpened():
        return None

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(os.getenv("CAMERA_WIDTH", "1280")))
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(os.getenv("CAMERA_HEIGHT", "720")))
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    _camera = cap
    return _camera


def encode_jpeg(frame: np.ndarray, quality: int = 82) -> bytes:
    ok, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise RuntimeError("Could not encode frame")
    return buffer.tobytes()


def placeholder_frame(message: str) -> np.ndarray:
    image = np.zeros((480, 640, 3), dtype="uint8")
    cv2.putText(image, message, (70, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (120, 120, 120), 2, cv2.LINE_AA)
    return image


def mjpeg_stream():
    global _last_frame, _latest_detections, _camera
    while True:
        cap = open_camera()
        if cap is None:
            frame = placeholder_frame("Camera Offline")
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + encode_jpeg(frame) + b"\r\n"
            time.sleep(0.5)
            continue

        ok, frame = cap.read()
        if not ok or frame is None:
            # Camera dropped — release and reset so open_camera() retries next cycle
            cap.release()
            _camera = None
            frame = placeholder_frame("No Camera Signal")
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + encode_jpeg(frame) + b"\r\n"
            time.sleep(0.5)
            continue
        elif _detection_active:
            frame, detections, _ = detect_frame(frame)
            _latest_detections = [
                {**d, "timestamp": int(time.time() * 1000), "camera": "default"}
                for d in detections
            ]

        _last_frame = frame.copy()
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + encode_jpeg(frame) + b"\r\n"


@app.get("/api/camera/frame")
def camera_frame():
    """Return a single JPEG frame from the camera.

    The frontend polls this endpoint via fetch() (which carries the
    ngrok-skip-browser-warning header) and renders the result to a canvas,
    bypassing the ngrok browser warning page that blocks <img src> MJPEG streams.
    """
    global _last_frame
    cap = open_camera()
    if cap is not None:
        ok, frame = cap.read()
        if ok and frame is not None:
            if _detection_active:
                frame, _, _ = detect_frame(frame)
            _last_frame = frame.copy()

    if _last_frame is not None:
        jpeg = encode_jpeg(_last_frame)
    else:
        jpeg = encode_jpeg(placeholder_frame("Camera Offline"))

    response = make_response(jpeg)
    response.headers["Content-Type"] = "image/jpeg"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response



@app.get("/api/health")
@app.get("/health")
def health():
    engine = get_engine()
    return jsonify({
        "ok": True,
        "status": "ok",
        "service": "visionai-backend",
        "backend": "flask",
        "detector_ready": engine is not None,
        "detector_error": _engine_error,
        "uptime": round(time.time() - _started_at, 1),
    })


@app.get("/api/status")
@app.get("/stats")
def status():
    engine = get_engine()
    cap = _camera
    return jsonify({
        "connected": cap is not None and cap.isOpened(),
        "detection_active": _detection_active,
        "fps": 0,
        "model": engine.model_name if engine else os.getenv("YOLO_MODEL", "yolov8n.pt"),
        "device": engine.device if engine else "unavailable",
        "objects": len(_latest_detections),
        "uptime": round(time.time() - _started_at, 1),
        "error": _engine_error,
    })


@app.get("/video_feed")
def video_feed():
    return Response(mjpeg_stream(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.post("/control")
@app.post("/api/control")
def control():
    global _detection_active
    body = request.get_json(silent=True) or {}
    action = body.get("action", "")
    engine = get_engine()

    if action in {"start", "resume"}:
        _detection_active = True
        if engine:
            engine.set_paused(False)
    elif action in {"stop", "pause"}:
        _detection_active = action != "stop"
        if engine:
            engine.set_paused(True)
    elif action == "set_conf" and engine:
        engine.set_conf(float(body.get("value", 0.4)))
    elif action == "set_filter" and engine:
        engine.set_filter(str(body.get("value", "all")))
    elif action == "switch_model" and engine:
        engine.switch_model(str(body.get("value", "yolov8n.pt")))

    return jsonify({"ok": True, "action": action, "detection_active": _detection_active})


@app.get("/api/detections/latest")
def latest_detections():
    return jsonify({"detections": _latest_detections})


@app.get("/api/categories")
@app.get("/categories")
def categories():
    return jsonify({"categories": list(CATEGORY_MAP.keys())})


@app.post("/api/detect/image")
def detect_image():
    upload = request.files.get("image")
    if upload is None:
        return jsonify({"success": False, "error": "Missing image file field named 'image'."}), 400

    filename = f"{uuid.uuid4().hex}_{secure_filename(upload.filename or 'image.jpg')}"
    input_path = UPLOAD_DIR / filename
    upload.save(input_path)

    frame = cv2.imread(str(input_path))
    if frame is None:
        return jsonify({"success": False, "error": "Could not decode image."}), 400

    annotated, objects, inference_time = detect_frame(frame)
    output_filename = f"detected_{Path(filename).stem}.jpg"
    output_path = OUTPUT_DIR / output_filename
    cv2.imwrite(str(output_path), annotated)

    result = {
        "id": uuid.uuid4().hex,
        "success": True,
        "filename": filename,
        "output_filename": output_filename,
        "output_url": file_url(output_filename),
        "download_url": file_url(output_filename),
        "objects": objects,
        "object_count": len(objects),
        "inference_time": inference_time,
        "resolution": f"{frame.shape[1]}x{frame.shape[0]}",
        "model": get_engine().model_name if get_engine() else "unavailable",
        "device": get_engine().device if get_engine() else "unavailable",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_type": "image",
    }
    add_history(result)
    return jsonify(result)


@app.post("/api/detect/video")
def detect_video():
    upload = request.files.get("video")
    if upload is None:
        return jsonify({"success": False, "error": "Missing video file field named 'video'."}), 400

    filename = f"{uuid.uuid4().hex}_{secure_filename(upload.filename or 'video.mp4')}"
    input_path = UPLOAD_DIR / filename
    upload.save(input_path)

    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        return jsonify({"success": False, "error": "Could not open video."}), 400

    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
    output_filename = f"detected_{Path(filename).stem}.mp4"
    output_path = OUTPUT_DIR / output_filename
    # Prefer H.264 (avc1) which all modern desktop browsers play natively
    # via the HTML5 <video> element. Fall back to mp4v if avc1 is unavailable
    # on the current OpenCV build (e.g. some Linux headless environments).
    _fourcc_avc1 = cv2.VideoWriter_fourcc(*"avc1")
    _fourcc_mp4v = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), _fourcc_avc1, fps, (width, height))
    if not writer.isOpened():
        writer = cv2.VideoWriter(str(output_path), _fourcc_mp4v, fps, (width, height))

    total_detections = 0
    frame_count = 0
    sample_objects: list[dict[str, Any]] = []
    started = time.perf_counter()

    while True:
        ok, frame = cap.read()
        if not ok or frame is None:
            break
        annotated, objects, _ = detect_frame(frame)
        writer.write(annotated)
        frame_count += 1
        total_detections += len(objects)
        if len(sample_objects) < 40:
            sample_objects.extend(objects[: 40 - len(sample_objects)])

    cap.release()
    writer.release()
    duration = frame_count / fps if fps else 0
    inference_time = time.perf_counter() - started

    result = {
        "id": uuid.uuid4().hex,
        "success": True,
        "filename": filename,
        "output_filename": output_filename,
        "output_url": file_url(output_filename),
        "download_url": file_url(output_filename),
        "objects": sample_objects,
        "object_count": len(sample_objects),
        "total_detections": total_detections,
        "inference_time": inference_time,
        "duration": duration,
        "frame_count": frame_count,
        "fps": fps,
        "resolution": f"{width}x{height}",
        "model": get_engine().model_name if get_engine() else "unavailable",
        "device": get_engine().device if get_engine() else "unavailable",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_type": "video",
    }
    add_history(result)
    return jsonify(result)


@app.get("/api/history")
def history():
    return jsonify(load_history())


@app.delete("/api/history")
def clear_history():
    save_history([])
    return jsonify({"ok": True})


@app.delete("/api/history/<entry_id>")
def delete_history(entry_id: str):
    save_history([entry for entry in load_history() if entry.get("id") != entry_id])
    return jsonify({"ok": True})


@app.get("/api/screenshots")
def screenshots():
    files = sorted(SCREENSHOT_DIR.glob("*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True)
    return jsonify([{
        "filename": file.name,
        "url": f"/outputs/screenshots/{file.name}",
        "download_url": f"/outputs/screenshots/{file.name}",
        "timestamp": datetime.fromtimestamp(file.stat().st_mtime).isoformat(),
        "size": file.stat().st_size,
    } for file in files])


@app.post("/api/screenshot/capture")
@app.post("/api/screenshot/manual")
@app.post("/api/camera/screenshot")
def capture_screenshot():
    global _last_frame
    if _last_frame is None:
        cap = open_camera()
        if cap is not None:
            ok, frame = cap.read()
            if ok:
                _last_frame = frame
    if _last_frame is None:
        return jsonify({"ok": False, "success": False, "error": "No frame available."}), 400

    filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.jpg"
    path = SCREENSHOT_DIR / filename
    cv2.imwrite(str(path), _last_frame)
    return jsonify({
        "ok": True,
        "success": True,
        "filename": filename,
        "path": f"/outputs/screenshots/{filename}",
    })


@app.delete("/api/screenshots/<filename>")
def delete_screenshot(filename: str):
    path = SCREENSHOT_DIR / secure_filename(filename)
    if path.exists():
        path.unlink()
    return jsonify({"ok": True})


@app.post("/api/voice/announce")
def voice_announce():
    body = request.get_json(silent=True) or {}
    text = str(body.get("text") or body.get("message") or "")
    if not text:
        return jsonify({"ok": False, "error": "Missing text."}), 400
    try:
        import pyttsx3

        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
        return jsonify({"ok": True})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


@app.get("/api/system")
def system_info():
    engine = get_engine()
    return jsonify({
        "model": engine.model_name if engine else os.getenv("YOLO_MODEL", "yolov8n.pt"),
        "device": engine.device if engine else "unavailable",
        "cuda_available": engine.device == "cuda" if engine else False,
        "opencv_version": cv2.__version__,
        "python_version": platform.python_version(),
        "platform": platform.platform(),
    })


@app.get("/outputs/<path:filename>")
def serve_output(filename: str):
    """Serve output files with full byte-range (HTTP 206) support.

    Desktop browsers require Range requests to play <video> elements inline.
    Flask's send_from_directory supports this when conditional=True is set.
    """
    response = send_from_directory(OUTPUT_DIR, filename, conditional=True, max_age=0)
    # Ensure video files are served with the correct MIME type so browsers
    # treat them as streamable video rather than a binary download.
    lower = filename.lower()
    if lower.endswith(".mp4"):
        response.headers["Content-Type"] = "video/mp4"
    elif lower.endswith(".webm"):
        response.headers["Content-Type"] = "video/webm"
    # Allow the frontend (possibly on a different port in dev) to fetch the file.
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.route("/")
def serve_root():
    dist_dir = PROJECT_DIR / "frontend" / "dist"
    if (dist_dir / "index.html").exists():
        return send_from_directory(dist_dir, "index.html")
    return "Frontend build not found. Please run 'npm run build' inside the frontend directory.", 404


@app.errorhandler(404)
def catch_all(e):
    # If the requested path is an API endpoint, return standard 404
    if request.path.startswith("/api/") or request.path == "/video_feed":
        return jsonify({"error": "Not Found"}), 404
    
    # Otherwise fallback to frontend index.html for SPA routing
    dist_dir = PROJECT_DIR / "frontend" / "dist"
    if (dist_dir / "index.html").exists():
        return send_from_directory(dist_dir, "index.html")
    return "Not Found", 404


def auto_start_ngrok(port: int) -> None:
    """Auto-start an ngrok tunnel if NGROK_AUTHTOKEN is set in the environment.

    Set NGROK_AUTHTOKEN in backend/.env once — tunnel opens automatically
    every time you run `python app.py`.  Optionally set NGROK_DOMAIN to a
    free static ngrok domain so your Vercel VITE_API_URL never changes.
    """
    token = os.getenv("NGROK_AUTHTOKEN", "").strip()
    if not token:
        return
    try:
        from pyngrok import ngrok, conf
        conf.get_default().auth_token = token

        domain = os.getenv("NGROK_DOMAIN", "").strip()
        kwargs = {"bind_tls": True}
        if domain:
            kwargs["hostname"] = domain

        tunnel = ngrok.connect(port, **kwargs)
        public_url = tunnel.public_url

        print("")
        print("=" * 60)
        print("  [NGROK] Tunnel is OPEN")
        print(f"  Public URL : {public_url}")
        print("  Set this as VITE_API_URL in Vercel then redeploy.")
        if domain:
            print("  (Using static domain -- URL never changes!)")
        print("=" * 60)
        print("")
    except Exception as exc:
        print(f"[ngrok] Could not start tunnel: {exc}")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    auto_start_ngrok(port)
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=port, debug=os.getenv("FLASK_DEBUG") == "1", threaded=True)
