
'use client';
import React from 'react';
import { GanttData } from '@/lib/types';

export const GanttMiniTimeline: React.FC<GanttData> = ({ title, phases = [] }) => {
  const totalWeeks = Math.max(...phases.map(p => p.start + p.duration), 8);
  
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4 overflow-x-auto">
      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-6">{title}</h3>
      <div className="min-w-[400px]">
        {/* Header Semanas */}
        <div className="flex border-b border-slate-100 mb-4 pb-2">
          <div className="w-1/3 text-[9px] font-black text-slate-400">FASE</div>
          <div className="w-2/3 flex justify-between text-[9px] font-black text-slate-300">
            {Array.from({ length: totalWeeks }).map((_, i) => (
              <span key={i} className="flex-1 text-center">W{i+1}</span>
            ))}
          </div>
        </div>
        {/* Filas */}
        <div className="space-y-4">
          {phases.map((phase, i) => (
            <div key={i} className="flex items-center">
              <div className="w-1/3 text-[10px] font-bold text-slate-600 pr-4">{phase.name}</div>
              <div className="w-2/3 relative h-2.5 bg-slate-50 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all duration-1000"
                  style={{ 
                    left: `${(phase.start / totalWeeks) * 100}%`,
                    width: `${(phase.duration / totalWeeks) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
