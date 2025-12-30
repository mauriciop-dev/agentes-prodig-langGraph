
'use client';
import React, { useState } from 'react';
import { ROICalculatorData } from '@/lib/types';

export const InteractiveROICalculator: React.FC<ROICalculatorData> = ({ title, hourlyRate, hoursLost, efficiencyGain }) => {
  const [rate, setRate] = useState(hourlyRate);
  const [hours, setHours] = useState(hoursLost);
  const [gain, setGain] = useState(efficiencyGain);

  const monthlySavings = (rate * hours * (gain / 100)).toLocaleString('es-CO');
  const yearlySavings = (rate * hours * (gain / 100) * 12).toLocaleString('es-CO');

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl mt-4 border border-slate-700">
      <h3 className="font-bold text-cyan-400 text-xs uppercase tracking-widest mb-6">{title}</h3>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-[10px] mb-2 font-bold uppercase text-slate-400">
            <span>Costo Hora (Promedio)</span>
            <span className="text-cyan-400">${rate}/hr</span>
          </div>
          <input type="range" min="10" max="500" step="5" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-2 font-bold uppercase text-slate-400">
            <span>Horas perdidas/mes</span>
            <span className="text-cyan-400">{hours} hrs</span>
          </div>
          <input type="range" min="1" max="1000" step="10" value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-2 font-bold uppercase text-slate-400">
            <span>Eficiencia con IA</span>
            <span className="text-cyan-400">{gain}%</span>
          </div>
          <input type="range" min="5" max="95" step="5" value={gain} onChange={(e) => setGain(Number(e.target.value))} className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
        </div>

        <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <p className="text-[9px] uppercase font-black text-slate-500 mb-1">Ahorro Mensual</p>
            <p className="text-xl font-black text-emerald-400">${monthlySavings}</p>
          </div>
          <div className="bg-cyan-600 p-4 rounded-xl shadow-lg shadow-cyan-900/20">
            <p className="text-[9px] uppercase font-black text-white/70 mb-1">Ahorro Anual</p>
            <p className="text-xl font-black text-white">${yearlySavings}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
