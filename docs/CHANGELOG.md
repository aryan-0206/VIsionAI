# Changelog

All notable changes to VisionAI are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2024-12-01 🎉 FINAL RELEASE

### 🚀 Added — Phase 1: Core Infrastructure
- Flask application server with MJPEG streaming endpoint
- OpenCV camera capture with configurable device index
- Basic YOLOv8 inference integration via Ultralytics
- Single-page HTML/CSS/JavaScript frontend
- Dark theme with cyan/purple neon aesthetic

### ✨ Added — Phase 2: Detection Modes
- **Live camera stream** detection with real-time bounding boxes
- **Image upload** detection with static file analysis
- **Video file** detection with frame-by-frame processing
- Confidence threshold slider (0.1–0.99)
- Per-class color-coded bounding boxes
- Class label badges with confidence percentage

### 🤖 Added — Phase 3: AI Enhancement
- Full **YOLOv8 model suite** (n/s/m/l/x) with hot-swap
- **GPU acceleration** via CUDA — up to 82 FPS (RTX 3080)
- Configurable IoU threshold for NMS
- Model loading indicator with status feedback
- Inference time display (milliseconds)

### 📡 Added — Phase 4: Camera Streaming
- MJPEG streaming with configurable quality/resolution
- FPS counter display (live-updated every second)
- Camera selection by device index
- Stream health monitoring and auto-reconnect

### ⚡ Added — Phase 5: Performance Optimization
- Multi-threaded frame pipeline (capture → inference → stream)
- Frame-skip optimization for CPU-only mode
- Pre-allocated NumPy buffer pool (eliminates GC pauses)
- Resolution scaling for speed/accuracy tradeoff

### 👥 Added — Phase 6: Multi-Object Tracking
- **ByteTrack** algorithm integration (primary)
- **BoT-SORT** algorithm as alternative
- Persistent object IDs across frames
- Color-coded trajectory visualization (30-point history)
- Tracker selection in settings panel

### 🔢 Added — Phase 7: Smart Counting
- Per-class object counters in real-time
- Total object count display in HUD
- Entry/exit counting for line crossing
- Configurable alert threshold per class
- Counter reset button (keyboard: `R`)

### 🗺 Added — Phase 8: ROI & Polygon Zones
- Interactive canvas-based polygon drawing tool
- ROI masking — restrict detection to drawn region
- Zone visualization overlay with opacity control
- Polygon vertex editing and deletion
- ROI coordinates saved in settings

### ➡️ Added — Phase 9: Line Crossing
- Virtual tripwire drawing with two-point line
- Bidirectional crossing detection (A→B and B→A)
- Per-direction crossing counters
- Trajectory intersection math for precision
- Line crossing events logged to history

### 🚨 Added — Phase 10: Intrusion Detection
- Zone intrusion alerts when objects enter restricted polygons
- Configurable dwell-time threshold (prevents false alerts)
- Auto-screenshot on first intrusion event
- Visual alert overlay (red border flash)
- Intrusion events tagged in detection history

### 🔊 Added — Phase 11: Voice Alerts
- pyttsx3 TTS engine integration
- Announces detected class names and counts
- Configurable alert threshold (by object count)
- Voice alert toggle button + keyboard shortcut `V`
- Voice engine status indicator

### 🔔 Added — Phase 12: Smart Notifications
- Browser Push Notification API integration
- Configurable notification triggers (class, count, zone)
- Notification permission request on first launch
- Notification history in sidebar
- Sound + visual notification badge

### 📸 Added — Phase 13: Auto Screenshot
- Automatic screenshot on intrusion/alert events
- Timer-based captures (configurable interval)
- EXIF metadata injection (class counts, timestamp)
- Screenshot filenames: `capture_YYYYMMDD_HHMMSS.jpg`
- Storage to `static/screenshots/` directory

### 📜 Added — Phase 14: Detection History
- JSON-based detection event store
- Searchable by class, source, date range
- Sortable by time, object count, inference speed
- Export to JSON download
- Clear history with confirmation dialog
- Maximum record limit (default: 1000)

### 🖼 Added — Phase 15: Screenshot Gallery
- Grid gallery view of all auto-captured screenshots
- Image preview lightbox with navigation
- Sort by date or object count
- Delete individual screenshots
- Download button for each screenshot
- Empty state illustration

### 🎨 Phase 16 — Final Polish (v1.0.0)
- Glass morphism UI overhaul throughout
- Neon glow effects (cyan + purple palette)
- Smooth CSS transitions on all interactive elements
- Micro-interactions on buttons, cards, toggles
- Responsive layout (mobile/tablet/desktop verified)
- Loading skeletons for async operations
- Error boundaries with user-friendly messages
- Empty states with helpful guidance
- Settings persistence (localStorage + backend)
- Performance benchmark data display
- Professional README, CHANGELOG, LICENSE
- Keyboard shortcuts panel
- Full documentation

---

## [0.9.0] — 2024-11-15 — RC1

- Feature-complete pre-release
- All detection modes functional
- Tracking and zone logic implemented
- Initial documentation

## [0.5.0] — 2024-10-01 — Beta

- Live camera detection working
- YOLOv8 integration complete
- Basic Flask server running

## [0.1.0] — 2024-09-01 — Alpha

- Project scaffolding
- Basic Flask + OpenCV setup
- Proof of concept detection

---

[1.0.0]: https://github.com/yourusername/VisionAI/releases/tag/v1.0.0
[0.9.0]: https://github.com/yourusername/VisionAI/releases/tag/v0.9.0
[0.5.0]: https://github.com/yourusername/VisionAI/releases/tag/v0.5.0
[0.1.0]: https://github.com/yourusername/VisionAI/releases/tag/v0.1.0
