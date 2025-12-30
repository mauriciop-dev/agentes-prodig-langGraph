
'use client';
import React from 'react';
import { RiskData } from '@/lib/types';

export const RiskAssessment: React.FC<RiskData> = ({ risks = [] }) => {
  const getLevelStyles = (level: string) => {
    switch(level) {
      case 'high': return 'bg-red-500 border-red-200 text-red-700 bg-red-50';
      case 'medium': return 'bg-amber-500 border-amber-200 text-amber-700 bg-amber-50';
      default: return 'bg-emerald-500 border-emerald-200 text-emerald-700 bg-emerald-50';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Evaluación de Factibilidad y Riesgos</h3>
      <div className="space-y-3">
        {risks.map((risk, i) => (
          <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${getLevelStyles(risk.level)}`}>
            <div className={`w-3 h-3 rounded-full shrink-0 mt-1 animate-pulse shadow-sm ${
              risk.level === 'high' ? 'bg-red-500' : risk.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></div>
            <div>
              <p className="text-[10px] font-black uppercase mb-0.5">{risk.name}</p>
              <p className="text-[11px] leading-snug opacity-80">{risk.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
