"""
VisionAI - Phase 3
camera.py — Camera Manager, Frame Generator, FPS, Screenshots, Switching
"""

import cv2
import time
import threading
import os
import uuid
from collections import deque
from datetime import datetime


# ─────────────────────────────────────────────
#  Constants
# ─────────────────────────────────────────────

SCREENSHOTS_DIR = "screenshots"
JPEG_QUALITY    = 85          # MJPEG encode quality (0-100)
FPS_WINDOW      = 30          # Rolling window for average FPS

RESOLUTIONS = {
    "640x480":   (640, 480),
    "1280x720":  (1280, 720),
    "1920x1080": (1920, 1080),
}

# ─────────────────────────────────────────────
#  Ensure screenshots directory exists
# ─────────────────────────────────────────────

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────
#  FPS Tracker
# ─────────────────────────────────────────────

class FPSTracker:
    """Tracks live FPS, average FPS, and per-frame processing time."""

    def __init__(self, window: int = FPS_WINDOW):
        self._window       = window
        self._timestamps   : deque = deque(maxlen=window)
        self._proc_times   : deque = deque(maxlen=window)
        self._frame_start  = None
        self._lock         = threading.Lock()

    # ------------------------------------------------------------------
    def frame_start(self):
        self._frame_start = time.perf_counter()

    def frame_end(self):
        now = time.perf_counter()
        with self._lock:
            self._timestamps.append(now)
            if self._frame_start is not None:
                self._proc_times.append((now - self._frame_start) * 1000)  # ms
            self._frame_start = None

    # ------------------------------------------------------------------
    @property
    def live_fps(self) -> float:
        with self._lock:
            if len(self._timestamps) < 2:
                return 0.0
            elapsed = self._timestamps[-1] - self._timestamps[-2]
            return round(1.0 / elapsed, 1) if elapsed > 0 else 0.0

    @property
    def avg_fps(self) -> float:
        with self._lock:
            if len(self._timestamps) < 2:
                return 0.0
            span = self._timestamps[-1] - self._timestamps[0]
            if span <= 0:
                return 0.0
            return round((len(self._timestamps) - 1) / span, 1)

    @property
    def avg_proc_ms(self) -> float:
        with self._lock:
            if not self._proc_times:
                return 0.0
            return round(sum(self._proc_times) / len(self._proc_times), 2)

    def reset(self):
        with self._lock:
            self._timestamps.clear()
            self._proc_times.clear()
            self._frame_start = None

    def stats(self) -> dict:
        return {
            "live_fps":   self.live_fps,
            "avg_fps":    self.avg_fps,
            "proc_ms":    self.avg_proc_ms,
        }


# ─────────────────────────────────────────────
#  Camera Manager
# ─────────────────────────────────────────────

class CameraManager:
    """
    Thread-safe webcam manager.
    Handles open/close, pause/resume, resolution, switching, and screenshots.
    """

    # Camera states
    STATE_STOPPED    = "stopped"
    STATE_STREAMING  = "streaming"
    STATE_PAUSED     = "paused"
    STATE_ERROR      = "error"

    def __init__(self):
        self._cap          : cv2.VideoCapture | None = None
        self._lock         = threading.Lock()
        self._frame_lock   = threading.Lock()

        self._camera_index = 0
        self._resolution   = "640x480"
        self._state        = self.STATE_STOPPED

        self._last_frame   = None          # cached frame bytes (JPEG)
        self._raw_frame    = None          # raw numpy array for screenshots

        self._fps          = FPSTracker()
        self._error_msg    = ""

    # ──────────────────────────────────────────
    #  Public API
    # ──────────────────────────────────────────

    def start(self, camera_index: int = 0, resolution: str = "640x480") -> dict:
        """Open camera and begin streaming."""
        with self._lock:
            self._close_camera()

            self._camera_index = camera_index
            self._resolution   = resolution
            result = self._open_camera()

            if result["ok"]:
                self._state     = self.STATE_STREAMING
                self._error_msg = ""
                self._fps.reset()
            else:
                self._state     = self.STATE_ERROR
                self._error_msg = result["error"]

            return result

    def stop(self) -> dict:
        """Stop streaming and release camera."""
        with self._lock:
            self._close_camera()
            self._state       = self.STATE_STOPPED
            self._last_frame  = None
            self._raw_frame   = None
            self._fps.reset()
        return {"ok": True, "message": "Camera stopped."}

    def pause(self) -> dict:
        """Pause streaming (hold last frame)."""
        with self._lock:
            if self._state != self.STATE_STREAMING:
                return {"ok": False, "error": "Camera is not streaming."}
            self._state = self.STATE_PAUSED
        return {"ok": True, "message": "Camera paused."}

    def resume(self) -> dict:
        """Resume from paused state."""
        with self._lock:
            if self._state != self.STATE_PAUSED:
                return {"ok": False, "error": "Camera is not paused."}
            self._state = self.STATE_STREAMING
        return {"ok": True, "message": "Camera resumed."}

    def switch_camera(self, camera_index: int) -> dict:
        """Switch to a different camera index (restarts stream)."""
        resolution = self._resolution
        return self.start(camera_index, resolution)

    def set_resolution(self, resolution: str) -> dict:
        """Change resolution and restart stream."""
        if resolution not in RESOLUTIONS:
            return {"ok": False, "error": f"Unknown resolution: {resolution}"}
        camera_index = self._camera_index
        return self.start(camera_index, resolution)

    def capture_screenshot(self) -> dict:
        """Save current frame as a JPEG screenshot."""
        with self._frame_lock:
            frame = self._raw_frame

        if frame is None:
            return {"ok": False, "error": "No frame available."}

        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        uid      = uuid.uuid4().hex[:6]
        filename = f"screenshot_{ts}_{uid}.jpg"
        filepath = os.path.join(SCREENSHOTS_DIR, filename)

        success, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if not success:
            return {"ok": False, "error": "Failed to encode screenshot."}

        with open(filepath, "wb") as f:
            f.write(buf.tobytes())

        return {
            "ok":       True,
            "filename": filename,
            "path":     filepath,
            "message":  f"Screenshot saved: {filename}",
        }

    # ──────────────────────────────────────────
    #  Status / Stats
    # ──────────────────────────────────────────

    @property
    def state(self) -> str:
        return self._state

    @property
    def is_streaming(self) -> bool:
        return self._state == self.STATE_STREAMING

    @property
    def is_paused(self) -> bool:
        return self._state == self.STATE_PAUSED

    @property
    def is_active(self) -> bool:
        return self._state in (self.STATE_STREAMING, self.STATE_PAUSED)

    def status(self) -> dict:
        cap_open = self._cap is not None and self._cap.isOpened()
        w, h     = RESOLUTIONS.get(self._resolution, (0, 0))
        return {
            "state":          self._state,
            "connected":      cap_open,
            "camera_index":   self._camera_index,
            "resolution":     self._resolution,
            "width":          w,
            "height":         h,
            "fps_stats":      self._fps.stats(),
            "error":          self._error_msg,
        }

    # ──────────────────────────────────────────
    #  Frame Generator (MJPEG)
    # ──────────────────────────────────────────

    def frame_generator(self):
        """
        Generator yielding MJPEG multipart frames.
        Reads from camera when streaming, sends last frame when paused,
        and yields a placeholder when stopped.
        """
        BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"

        while True:
            state = self._state

            if state == self.STATE_STREAMING:
                frame_bytes = self._read_frame()
                if frame_bytes:
                    yield BOUNDARY + frame_bytes + b"\r\n"
                else:
                    time.sleep(0.033)

            elif state == self.STATE_PAUSED:
                with self._frame_lock:
                    fb = self._last_frame
                if fb:
                    yield BOUNDARY + fb + b"\r\n"
                time.sleep(0.1)          # low-CPU hold

            else:  # stopped / error
                placeholder = self._placeholder_frame()
                yield BOUNDARY + placeholder + b"\r\n"
                time.sleep(0.5)

    # ──────────────────────────────────────────
    #  Internal helpers
    # ──────────────────────────────────────────

    def _open_camera(self) -> dict:
        """Open cv2.VideoCapture with requested settings (lock held by caller)."""
        idx = self._camera_index
        cap = cv2.VideoCapture(idx, cv2.CAP_ANY)

        if not cap.isOpened():
            return {"ok": False, "error": f"Cannot open camera index {idx}."}

        w, h = RESOLUTIONS.get(self._resolution, (640, 480))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  w)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)   # minimize latency

        # Verify the camera actually delivers a frame
        ok, test = cap.read()
        if not ok or test is None:
            cap.release()
            return {"ok": False, "error": f"Camera {idx} opened but produced no frame."}

        self._cap = cap
        return {"ok": True}

    def _close_camera(self):
        """Release camera capture (lock held by caller)."""
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

    def _read_frame(self) -> bytes | None:
        """
        Read one frame from the camera.
        Returns JPEG bytes or None on failure.
        """
        self._fps.frame_start()

        cap = self._cap
        if cap is None or not cap.isOpened():
            self._state     = self.STATE_ERROR
            self._error_msg = "Camera disconnected."
            return None

        ok, frame = cap.read()
        if not ok or frame is None:
            self._state     = self.STATE_ERROR
            self._error_msg = "Failed to read frame."
            return None

        # Cache raw frame for screenshots
        with self._frame_lock:
            self._raw_frame = frame.copy()

        # Encode to JPEG
        success, buf = cv2.imencode(
            ".jpg", frame,
            [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        )

        self._fps.frame_end()

        if not success:
            return None

        fb = buf.tobytes()

        with self._frame_lock:
            self._last_frame = fb

        return fb

    def _placeholder_frame(self) -> bytes:
        """Return a small black JPEG placeholder frame."""
        import numpy as np
        img = np.zeros((480, 640, 3), dtype="uint8")
        cv2.putText(
            img, "Camera Offline", (160, 240),
            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (80, 80, 80), 2, cv2.LINE_AA
        )
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 60])
        return buf.tobytes()


# ─────────────────────────────────────────────
#  Module-level singleton
# ─────────────────────────────────────────────

camera_manager = CameraManager()
