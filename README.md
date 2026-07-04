# VisionAI

VisionAI is a full-stack object detection workspace consolidated from the Phase 1 through Phase 8 milestones. The final project uses a Vite React frontend and a Flask backend with YOLOv8, webcam streaming, image/video upload detection, screenshots, history, smart alerts, and voice notification hooks.

## Final Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, Zustand
- Backend: Flask, OpenCV, Ultralytics YOLOv8
- AI runtime: YOLOv8 model loading through `ultralytics`
- Default ports: frontend `5173`, backend `5000`

## Folder Structure

```text
VisionAI/
├── frontend/          # Vite React app
├── backend/           # Flask API, camera streaming, YOLO detector
├── ai/                # AI notes and experiments
├── models/            # Optional local model weights
├── uploads/           # Runtime uploads
├── outputs/           # Detection outputs and screenshots
├── docs/              # Project governance and release docs
├── docker/            # Container deployment files
├── README.md
├── .env.example
└── .gitignore
```

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Health check:

```bash
curl http://localhost:5000/api/health
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment

Create local `.env` files from `.env.example` as needed. The frontend reads `VITE_API_URL`; the backend reads `PORT`, `YOLO_MODEL`, camera settings, and CORS settings.

## Main API Endpoints

- `GET /api/health` - backend and detector health
- `GET /video_feed` - MJPEG webcam stream
- `GET /api/status` - camera/detector status
- `POST /api/detect/image` - upload and detect objects in an image
- `POST /api/detect/video` - upload and detect objects in a video
- `GET /api/detections/latest` - latest live detections
- `POST /api/screenshot/manual` - capture current frame
- `GET /api/screenshots` - list screenshots
- `GET /api/history` - detection history
- `POST /api/voice/announce` - optional pyttsx3 voice announcement

## Notes

The default backend looks for `models/yolov8n.pt`. The first YOLO request may download the model if it is not already available. Set `YOLO_MODEL` to a local path when deploying offline.
