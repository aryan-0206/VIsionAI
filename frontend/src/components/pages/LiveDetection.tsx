// ============================================================
// VisionAI — Live Detection Page
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video, Play, Square, Camera, Wifi, WifiOff,
  RefreshCw, ChevronDown, ChevronUp, Eye, Zap,
} from 'lucide-react';
import { useVisionStore } from '../../store/useVisionStore';
import { detectionOrchestrator } from '../../services/detectionOrchestrator';
import { notificationManager } from '../../services/notificationManager';
import { screenshotManager } from '../../services/screenshotManager';
import { Card, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AlertPanel } from '../panels/AlertPanel';
import { Timeline } from '../panels/Timeline';
import type { Detection, EventLogEntry } from '../../types';
import { generateId } from '../../utils/generateId';

// -----------------------------------------------------------
// Simulated demo detections (when backend not available)
// -----------------------------------------------------------
const DEMO_LABELS = ['person', 'car', 'dog', 'truck', 'bicycle', 'cat', 'bus'];
const DEMO_ZONES = [undefined, undefined, 'Zone A', 'restricted', 'Zone B', undefined];
const DEMO_CAMERAS = ['CAM-01', 'CAM-02', 'CAM-03'];

function generateDemoDetection(): Detection {
  const label = DEMO_LABELS[Math.floor(Math.random() * DEMO_LABELS.length)];
  const zone = DEMO_ZONES[Math.floor(Math.random() * DEMO_ZONES.length)];
  const camera = DEMO_CAMERAS[Math.floor(Math.random() * DEMO_CAMERAS.length)];
  const confidence = 0.55 + Math.random() * 0.44;
  const trackId = Math.floor(Math.random() * 20) + 1;

  return {
    id: generateId('det'),
    label,
    confidence,
    trackId,
    zone,
    camera,
    bbox: [
      Math.random() * 400,
      Math.random() * 300,
      50 + Math.random() * 100,
      80 + Math.random() * 120,
    ],
    timestamp: Date.now(),
  };
}

// -----------------------------------------------------------
// Camera Feed Placeholder
// -----------------------------------------------------------
function CameraFeedPlaceholder({ isStreaming, onStart, onStop }: {
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const backendUrl = useVisionStore((s) => s.backendUrl);
  const backendConnected = useVisionStore((s) => s.backendConnected);
  const [showStream, setShowStream] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900">
      {/* Scanline overlay */}
      <div className="absolute inset-0 video-scanline opacity-30 pointer-events-none z-10" />

      {/* Backend stream */}
      {backendConnected && showStream ? (
        <img
          src={`${backendUrl}/video_feed`}
          alt="Live camera feed"
          className="h-full w-full object-cover"
          onError={() => setShowStream(false)}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-grid">
          {/* Grid corner decorations */}
          <div className="absolute top-3 left-3 h-6 w-6 border-l-2 border-t-2 border-emerald-500/50 rounded-tl" />
          <div className="absolute top-3 right-3 h-6 w-6 border-r-2 border-t-2 border-emerald-500/50 rounded-tr" />
          <div className="absolute bottom-3 left-3 h-6 w-6 border-l-2 border-b-2 border-emerald-500/50 rounded-bl" />
          <div className="absolute bottom-3 right-3 h-6 w-6 border-r-2 border-b-2 border-emerald-500/50 rounded-br" />

          <div className="text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700 mx-auto">
              <Video className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              {backendConnected ? 'Camera Ready' : 'Demo Mode Active'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {backendConnected
                ? 'Click "Start Stream" to view live feed'
                : 'Connect Flask backend for live camera feed'}
            </p>
          </div>

          {backendConnected && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Eye className="h-3.5 w-3.5" />}
              onClick={() => setShowStream(true)}
            >
              Load Stream
            </Button>
          )}
        </div>
      )}

      {/* Live indicator */}
      {isStreaming && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-red-500/40 bg-slate-900/90 px-3 py-1 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-xs font-semibold text-red-400 tracking-wide">LIVE</span>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {!isStreaming ? (
          <Button size="sm" variant="success" icon={<Play className="h-3.5 w-3.5" />} onClick={onStart}>
            Start Detection
          </Button>
        ) : (
          <Button size="sm" variant="danger" icon={<Square className="h-3.5 w-3.5" />} onClick={onStop}>
            Stop
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          icon={<Camera className="h-3.5 w-3.5" />}
          onClick={() => void screenshotManager.captureManual()}
          title="Manual screenshot"
        >
          Capture
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Detection Badges (current frame detections)
// -----------------------------------------------------------
function CurrentDetections() {
  const currentDetections = useVisionStore((s) => s.currentDetections);

  if (currentDetections.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {currentDetections.map((d, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold capitalize text-slate-200">{d.label}</span>
          {d.trackId !== undefined && (
            <span className="text-[10px] text-slate-500">#{d.trackId}</span>
          )}
          <span className={`text-[10px] font-bold ${
            d.confidence >= 0.9 ? 'text-emerald-400' :
            d.confidence >= 0.7 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {Math.round(d.confidence * 100)}%
          </span>
          {d.zone && (
            <Badge variant="warning" className="text-[9px] px-1.5">
              {d.zone}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------
// Stats Bar
// -----------------------------------------------------------
function StatsBar() {
  const events = useVisionStore((s) => s.events);
  const alertPanel = useVisionStore((s) => s.alertPanel);
  const settings = useVisionStore((s) => s.settings);

  const today = events.filter((e) => Date.now() - e.timestamp < 24 * 3600 * 1000);
  const intrusions = today.filter((e) => e.eventType === 'intrusion');
  const persons = today.filter((e) => e.object === 'person');

  const stats = [
    { label: 'Total Events', value: events.length, color: 'text-slate-300' },
    { label: 'Today',        value: today.length,    color: 'text-blue-400' },
    { label: 'Intrusions',   value: intrusions.length, color: intrusions.length > 0 ? 'text-red-400' : 'text-slate-400' },
    { label: 'Persons',      value: persons.length,  color: 'text-amber-400' },
    { label: 'Total Alerts', value: alertPanel.alertCount, color: 'text-violet-400' },
    { label: 'Active Rules',  value: settings.alertRules.filter((r) => r.enabled).length, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-slate-700/30 bg-slate-800/40 px-3 py-2 text-center">
          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-slate-500 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------
// Main Live Detection Page
// -----------------------------------------------------------
export function LiveDetection() {
  const {
    settings,
    isStreaming,
    setIsStreaming,
    addEvent,
    addToast,
    backendConnected,
    setBackendConnected,
    backendUrl,
    incrementAlertCount,
    setCurrentDetections,
  } = useVisionStore();

  const [showAlertPanel, setShowAlertPanel] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const healthRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // -------------------------------------------------------
  // Sync orchestrator settings
  // -------------------------------------------------------
  useEffect(() => {
    detectionOrchestrator.syncSettings(settings, backendUrl);
  }, [settings, backendUrl]);

  // -------------------------------------------------------
  // Register event handler from orchestrator
  // -------------------------------------------------------
  useEffect(() => {
    const unsubscribe = detectionOrchestrator.onEvent((entry: EventLogEntry) => {
      addEvent(entry);
      incrementAlertCount(entry);
    });

    const unsubNotify = notificationManager.onToast((toast) => {
      addToast(toast);
    });

    return () => {
      unsubscribe();
      unsubNotify();
    };
  }, [addEvent, addToast, incrementAlertCount]);

  // -------------------------------------------------------
  // Backend health check
  // -------------------------------------------------------
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(2000) });
        setBackendConnected(res.ok);
          } catch {
        setBackendConnected(false);
      }
    }

    checkHealth();
    healthRef.current = setInterval(checkHealth, 10000);
    return () => clearInterval(healthRef.current);
  }, [backendUrl, setBackendConnected]);

  // -------------------------------------------------------
  // Detection loop
  // -------------------------------------------------------
  const runDetectionCycle = useCallback(async () => {
    if (!backendConnected) {
      // Auto-fallback: generate demo detections when backend is offline
      const count = Math.floor(Math.random() * 3) + 1;
      const detections: Detection[] = Array.from({ length: count }, generateDemoDetection);
      setCurrentDetections(detections.map((d) => ({
        label: d.label,
        confidence: d.confidence,
        trackId: d.trackId,
        zone: d.zone,
      })));
      for (const det of detections) {
        await detectionOrchestrator.process(det, settings);
      }
    } else {
      // Poll backend
      try {
        const res = await fetch(`${backendUrl}/api/detections/latest`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return;
        const data = await res.json() as { detections?: Detection[] };
        if (data.detections?.length) {
          setCurrentDetections(data.detections.map((d) => ({
            label: d.label,
            confidence: d.confidence,
            trackId: d.trackId,
            zone: d.zone,
          })));
          await detectionOrchestrator.processBatch(data.detections, settings);
        } else {
          setCurrentDetections([]);
        }
      } catch {
        // silent fail
      }
    }
  }, [backendConnected, backendUrl, settings, setCurrentDetections]);

  // -------------------------------------------------------
  // Start / Stop streaming
  // -------------------------------------------------------
  function handleStart() {
    setIsStreaming(true);
    const pollInterval = backendConnected ? 1000 : 2000 + Math.random() * 3000;
    intervalRef.current = setInterval(() => {
      void runDetectionCycle();
    }, pollInterval);
  }

  function handleStop() {
    setIsStreaming(false);
    clearInterval(intervalRef.current);
    setCurrentDetections([]);
  }

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(healthRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/30">
            <Video className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">Live Detection</h1>
            <p className="text-[11px] text-slate-400">
              Real-time AI object detection with smart alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {backendConnected ? (
            <Badge variant="success" dot pulse>Backend Live</Badge>
          ) : (
            <Badge variant="warning" dot>Offline Mode</Badge>
          )}

          <button
            onClick={() => void detectionOrchestrator.syncSettings(settings, backendUrl)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
            title="Refresh settings"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar />

      {/* Main Grid */}
      <div className="grid flex-1 gap-4 lg:grid-cols-3 min-h-0">
        {/* Left: Camera + Controls */}
        <div className="flex flex-col gap-4 lg:col-span-2 min-h-0">
          <CameraFeedPlaceholder
            isStreaming={isStreaming}
            onStart={handleStart}
            onStop={handleStop}
          />

          {/* Current Detections */}
          <CurrentDetections />

          {/* Camera info */}
          <Card glass>
            <CardBody className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-800">
                  <Camera className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    {settings.detection.activeCamera || 'Default Camera'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Min Confidence: {Math.round(settings.detection.minConfidence * 100)}% ·{' '}
                    {settings.alertRules.filter((r) => r.enabled).length} active rules
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {backendConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-slate-500" />
                )}
                {isStreaming && (
                  <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: Panels */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Alert Panel */}
          <div>
            <button
              className="mb-2 flex w-full items-center justify-between text-xs text-slate-400 hover:text-slate-200"
              onClick={() => setShowAlertPanel(!showAlertPanel)}
            >
              <span className="font-semibold uppercase tracking-wide">Alert Center</span>
              {showAlertPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showAlertPanel && <AlertPanel />}
          </div>

          {/* Timeline */}
          <div>
            <button
              className="mb-2 flex w-full items-center justify-between text-xs text-slate-400 hover:text-slate-200"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <span className="font-semibold uppercase tracking-wide">Detection Timeline</span>
              {showTimeline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showTimeline && (
              <div className="max-h-[400px] overflow-y-auto">
                <Timeline />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
