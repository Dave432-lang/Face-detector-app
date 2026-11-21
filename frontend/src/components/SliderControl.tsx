import type { FC } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface SliderControlProps {
  confidence: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const SliderControl: FC<SliderControlProps> = ({
  confidence,
  onChange,
  disabled = false,
}) => {
  const percentage = Math.round(confidence * 100);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="confidence-slider"
          className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          Confidence Threshold
        </label>
        <span className="text-sm font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/40 px-2.5 py-0.5 rounded-full">
          {percentage}%
        </span>
      </div>

      <div className="relative flex items-center">
        <input
          id="confidence-slider"
          type="range"
          min="0.10"
          max="0.90"
          step="0.01"
          value={confidence}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
        <span>10% (More sensitive)</span>
        <span>50%</span>
        <span>90% (High precision)</span>
      </div>
    </div>
  );
};
