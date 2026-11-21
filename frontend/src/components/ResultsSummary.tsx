import type { FC } from 'react';
import { Layers, Clock, Crosshair, ChevronRight } from 'lucide-react';
import type { DetectionItem, SpeedMetrics } from '../types';

interface ResultsSummaryProps {
  detections: DetectionItem[];
  speed?: SpeedMetrics;
  selectedDetectionId?: string | null;
  onSelectDetection?: (id: string | null) => void;
}

export const ResultsSummary: FC<ResultsSummaryProps> = ({
  detections,
  speed,
  selectedDetectionId,
  onSelectDetection,
}) => {
  const count = detections.length;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      {/* Header Stat row */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
              Detected Objects
            </span>
            <span className="text-xl font-extrabold text-white">
              {count} {count === 1 ? 'detection' : 'detections'}
            </span>
          </div>
        </div>

        {speed && speed.inference !== undefined && (
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{Math.round(speed.inference)}ms inference</span>
          </div>
        )}
      </div>

      {/* List of detections */}
      {count === 0 ? (
        <div className="py-6 text-center text-slate-400 text-sm">
          No objects detected above current confidence threshold. Try lowering the threshold or capturing another image.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {detections.map((det) => {
            const isSelected = selectedDetectionId === det.id;
            const percent = Math.round(det.confidence * 100);
            const boxW = Math.round(det.box.x2 - det.box.x1);
            const boxH = Math.round(det.box.y2 - det.box.y1);

            return (
              <div
                key={det.id}
                onClick={() => onSelectDetection && onSelectDetection(isSelected ? null : det.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: det.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {det.name}
                      </span>
                      {det.classId !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          cls:{det.classId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                      <Crosshair className="w-3 h-3 text-slate-500" />
                      <span>{boxW} × {boxH} px</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 block font-mono">
                      {percent}%
                    </span>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: det.color || '#10B981',
                        }}
                      />
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isSelected ? 'rotate-90 text-cyan-400' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
