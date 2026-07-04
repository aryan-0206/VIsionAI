// ============================================================
// VisionAI Phase 7C — Sidebar Navigation
// ============================================================
import {
  Video, Eye, Image, Film, BarChart2, Settings,
  ChevronLeft, ChevronRight, Zap, Bell, Shield,
  Activity, List, Camera,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useVisionStore } from '../store/useVisionStore';
import { Badge } from './ui/Badge';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'info' | 'success' | 'warning' | 'danger';
}

const navItems: NavItem[] = [
  { id: 'live',       label: 'Live Detection',    icon: <Video className="h-4 w-4" /> },
  { id: 'image',      label: 'Image Detection',   icon: <Image className="h-4 w-4" /> },
  { id: 'video',      label: 'Video Detection',   icon: <Film className="h-4 w-4" /> },
  { id: 'alerts',     label: 'Alert Center',      icon: <Bell className="h-4 w-4" />, badge: 'NEW', badgeVariant: 'danger' },
  { id: 'rules',      label: 'Alert Rules',       icon: <Shield className="h-4 w-4" /> },
  { id: 'events',     label: 'Event Log',         icon: <List className="h-4 w-4" /> },
  { id: 'timeline',   label: 'Timeline',          icon: <Activity className="h-4 w-4" /> },
  { id: 'analytics',  label: 'Analytics',         icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'settings',   label: 'Settings',          icon: <Settings className="h-4 w-4" /> },
];

export function Sidebar() {
  const { activeNav, setActiveNav, sidebarOpen, setSidebarOpen, backendConnected, alertPanel } = useVisionStore();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-700/50 bg-slate-900/80 backdrop-blur-xl transition-all duration-300',
        sidebarOpen ? 'w-56' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-slate-700/50 px-4">
        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
          <Eye className="h-4 w-4 text-white" />
          {backendConnected && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          )}
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide">VisionAI</p>
            <p className="text-[10px] text-slate-400">Phase 7C</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const showAlertBadge = item.id === 'alerts' && alertPanel.alertCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className={cn('flex-shrink-0', isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300')}>
                {item.icon}
              </span>

              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left font-medium truncate">{item.label}</span>
                  {showAlertBadge && (
                    <Badge variant="danger" className="text-[10px] px-1.5 py-0">
                      {alertPanel.alertCount > 99 ? '99+' : alertPanel.alertCount}
                    </Badge>
                  )}
                  {!showAlertBadge && item.badge && (
                    <Badge variant={item.badgeVariant ?? 'info'} className="text-[10px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status bar */}
      {sidebarOpen && (
        <div className="border-t border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', backendConnected ? 'bg-emerald-400' : 'bg-red-400')} />
            <span className="text-xs text-slate-400">
              {backendConnected ? 'Backend Connected' : 'Demo Mode'}
            </span>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex h-10 w-full items-center justify-center border-t border-slate-700/50 text-slate-500 transition hover:bg-slate-800/60 hover:text-slate-300"
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  );
}

// Compact icons-only used in collapsed state
export function SidebarIcon({ nav }: { nav: string }) {
  const map: Record<string, React.ReactNode> = {
    live:      <Video className="h-4 w-4" />,
    image:     <Image className="h-4 w-4" />,
    video:     <Film className="h-4 w-4" />,
    alerts:    <Bell className="h-4 w-4" />,
    rules:     <Shield className="h-4 w-4" />,
    events:    <List className="h-4 w-4" />,
    timeline:  <Activity className="h-4 w-4" />,
    analytics: <BarChart2 className="h-4 w-4" />,
    settings:  <Settings className="h-4 w-4" />,
    camera:    <Camera className="h-4 w-4" />,
    zap:       <Zap className="h-4 w-4" />,
  };
  return <>{map[nav] ?? null}</>;
}
