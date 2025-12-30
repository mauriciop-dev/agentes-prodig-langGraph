
'use client';
import React from 'react';
import { PriorityMatrixData } from '@/lib/types';

export const PriorityMatrix: React.FC<PriorityMatrixData> = ({ title, items = [] }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-6 text-center">{title}</h3>
      <div className="relative aspect-square w-full max-w-[400px] mx-auto border-2 border-slate-100 bg-slate-50/30">
        {/* Cuadrantes Labels */}
        <div className="absolute top-2 right-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">QUICK WINS</div>
        <div className="absolute bottom-2 left-2 text-[9px] font-black text-slate-400">DESCARTE</div>
        
        {/* Ejes */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200"></div>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200"></div>
        
        {/* Puntos */}
        {items.map((item, i) => (
          <div 
            key={i} 
            className="absolute w-3 h-3 bg-cyan-500 rounded-full border-2 border-white shadow-md group cursor-help transition-transform hover:scale-150"
            style={{ 
              left: `${item.difficulty}%`, 
              bottom: `${item.impact}%`,
              transform: 'translate(-50%, 50%)'
            }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-32 bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl">
              <p className="font-bold border-b border-white/20 pb-1 mb-1">{item.name}</p>
              <p>Impacto: {item.impact}%</p>
              <p>Dificultad: {item.difficulty}%</p>
            </div>
          </div>
        ))}

        {/* Labels Ejes */}
        <div className="absolute -left-8 top-1/2 -rotate-90 text-[10px] font-bold text-slate-400">IMPACTO</div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">DIFICULTAD</div>
      </div>
    </div>
  );
};
