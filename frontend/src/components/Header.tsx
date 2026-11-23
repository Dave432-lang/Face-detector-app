import type { FC } from 'react';
import { ScanFace, AlertCircle, RefreshCw } from 'lucide-react';
import type { BackendHealthResponse } from '../types';

interface HeaderProps {
  health: BackendHealthResponse | null;
  checkingHealth: boolean;
  onRefreshHealth: () => void;
}

export const Header: FC<HeaderProps> = ({ health, checkingHealth, onRefreshHealth }) => {
  return (
    <header
      className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 pb-3 sticky top-0 z-30 transition-all"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <ScanFace className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight truncate">
              YOLO Face & Person Detector
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">Ultralytics Cloud Detection</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 shrink-0">
          {checkingHealth ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
              <span className="hidden sm:inline">Connecting…</span>
            </div>
          ) : health?.status === 'ok' ? (
            <div
              onClick={onRefreshHealth}
              title="Backend online & connected"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-400 cursor-pointer hover:bg-emerald-900/40 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Online</span>
            </div>
          ) : (
            <div
              onClick={onRefreshHealth}
              title="Cannot reach backend. Click to retry connection."
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-xs text-rose-400 cursor-pointer hover:bg-rose-900/40 transition-colors"
            >
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="font-medium">Offline</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
