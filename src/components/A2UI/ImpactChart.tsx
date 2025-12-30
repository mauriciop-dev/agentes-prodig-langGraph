
'use client';
import React from 'react';

interface ImpactChartProps {
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

export const ImpactChart: React.FC<ImpactChartProps> = ({ title, labels, values, unit }) => {
  const maxValue = Math.max(...values, 1);
  
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md mt-4">
      <h3 className="font-bold text-gray-800 mb-6 text-center">{title}</h3>
      <div className="flex items-end justify-around h-48 gap-4 px-4">
        {values.map((val, idx) => (
          <div key={idx} className="flex flex-col items-center w-full group">
            <div className="relative w-full flex flex-col items-center">
              <span className="text-[10px] font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {val} {unit}
              </span>
              <div 
                className={`w-10 rounded-t-lg transition-all duration-1000 ${idx === 0 ? 'bg-gray-300' : 'bg-cyan-500 shadow-lg shadow-cyan-200'}`}
                style={{ height: `${(val / maxValue) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-gray-600 mt-2 text-center leading-tight">
              {labels[idx]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-center">
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Datos Proyectados por Pedro IA</span>
      </div>
    </div>
  );
};
