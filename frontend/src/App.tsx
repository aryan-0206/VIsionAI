// ============================================================
// VisionAI Phase 7C — Main Application Entry Point
// Smart AI Assistant, Voice Alerts & Automation
// ============================================================
import { useEffect } from 'react';
import { useVisionStore } from './store/useVisionStore';
import { voiceManager } from './services/voiceManager';
import { screenshotManager } from './services/screenshotManager';
import { notificationManager } from './services/notificationManager';
import { detectionOrchestrator } from './services/detectionOrchestrator';

// Layout
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { LiveDetection } from './components/pages/LiveDetection';
import { AlertCenterPage } from './components/pages/AlertCenterPage';
import { AlertRulesPage } from './components/pages/AlertRulesPage';
import { EventLogPage } from './components/pages/EventLogPage';
import { TimelinePage } from './components/pages/TimelinePage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { PlaceholderPage } from './components/pages/PlaceholderPage';

// ============================================================
// Page Router
// ============================================================
function PageContent({ nav }: { nav: string }) {
  switch (nav) {
    case 'live':      return <LiveDetection />;
    case 'alerts':    return <AlertCenterPage />;
    case 'rules':     return <AlertRulesPage />;
    case 'events':    return <EventLogPage />;
    case 'timeline':  return <TimelinePage />;
    case 'analytics': return <AnalyticsPage />;
    case 'settings':  return <SettingsPage />;
    case 'image':     return <PlaceholderPage type="image" />;
    case 'video':     return <PlaceholderPage type="video" />;
    default:          return <LiveDetection />;
  }
}

// ============================================================
// App Root
// ============================================================
export default function App() {
  const { activeNav, settings, backendUrl, addToast, addEvent, incrementAlertCount } = useVisionStore();

  // -------------------------------------------------------
  // Bootstrap all managers on mount
  // -------------------------------------------------------
  useEffect(() => {
    // Sync voice manager
    voiceManager.configure({
      enabled: settings.voice.enabled,
      volume: settings.voice.volume,
      cooldownSeconds: settings.voice.cooldownSeconds,
      backendUrl,
    });

    // Sync screenshot manager
    screenshotManager.configure({
      enabled: settings.autoScreenshot.enabled,
      mode: settings.autoScreenshot.mode,
      savePath: settings.autoScreenshot.savePath,
      backendUrl,
    });

    // Sync notification manager
    notificationManager.configure({
      enabled: settings.notifications.enabled,
      duration: settings.notifications.duration,
    });

    // Sync orchestrator
    detectionOrchestrator.syncSettings(settings, backendUrl);

    // Register voice status listener
    const unsubVoice = voiceManager.onStatusChange((status) => {
      useVisionStore.getState().updateVoiceStatus(status);
    });

    // Register screenshot capture listener
    const unsubScreenshot = screenshotManager.onCapture((result) => {
      useVisionStore.getState().updateScreenshotStatus(result.success ? 'active' : 'error');
      if (result.success && result.path) {
        addToast({
          style: 'success',
          title: '📸 Screenshot Saved',
          object: 'screenshot',
          confidence: 1,
          timestamp: Date.now(),
          zone: result.path,
          duration: 4000,
        });
      }
    });

    // Register notification handler
    const unsubNotify = notificationManager.onToast((toast) => {
      addToast(toast);
    });

    // Register orchestrator event handler
    const unsubEvent = detectionOrchestrator.onEvent((entry) => {
      addEvent(entry);
      incrementAlertCount(entry);
    });

    // Welcome toast in demo mode
    if (!useVisionStore.getState().backendConnected) {
      setTimeout(() => {
        addToast({
          style: 'info',
          title: '🤖 VisionAI Ready',
          object: 'system',
          confidence: 1,
          timestamp: Date.now(),
          zone: 'Demo Mode Active',
          duration: 6000,
        });
      }, 1000);
    }

    return () => {
      unsubVoice();
      unsubScreenshot();
      unsubNotify();
      unsubEvent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------
  // Re-sync managers when settings change
  // -------------------------------------------------------
  useEffect(() => {
    detectionOrchestrator.syncSettings(settings, backendUrl);
    voiceManager.configure({
      enabled: settings.voice.enabled,
      volume: settings.voice.volume,
      cooldownSeconds: settings.voice.cooldownSeconds,
      backendUrl,
    });
    screenshotManager.configure({
      enabled: settings.autoScreenshot.enabled,
      mode: settings.autoScreenshot.mode,
      savePath: settings.autoScreenshot.savePath,
      backendUrl,
    });
    notificationManager.configure({
      enabled: settings.notifications.enabled,
      duration: settings.notifications.duration,
    });
  }, [settings, backendUrl]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 bg-grid">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <PageContent nav={activeNav} />
        </main>
      </div>

      {/* Toast notifications (fixed overlay) */}
      <ToastContainer />
    </div>
  );
}
