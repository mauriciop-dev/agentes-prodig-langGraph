
'use client';
import React, { useEffect, useState } from 'react';

interface ImpactChartProps {
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

export const ImpactChart: React.FC<ImpactChartProps> = ({ title, labels = [], values = [], unit }) => {
  const [mounted, setMounted] = useState(false);
  
  // Forzar una pequeña demora para que la animación de Tailwind (duration-1000) se vea al cargar
  useEffect(() => {
    setMounted(true);
  }, []);

  // Limpieza y validación de datos
  const safeValues = values.map(v => Number(v) || 0);
  const maxValue = Math.max(...safeValues, 1);
  
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md mt-4 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="font-bold text-gray-800 mb-6 text-center text-sm uppercase tracking-wide">{title}</h3>
      
      <div className="flex items-end justify-around h-48 gap-2 px-2 border-b border-gray-100">
        {safeValues.map((val, idx) => {
          const percentage = (val / maxValue) * 100;
          const label = labels[idx] || `Dato ${idx + 1}`;
          
          return (
            <div key={idx} className="flex flex-col items-center flex-1 h-full group justify-end">
              {/* Contenedor de la barra con altura total para que el % funcione */}
              <div className="relative w-full h-full flex flex-col justify-end items-center mb-2">
                {/* Tooltip o valor sobre la barra */}
                <span className="text-[10px] font-black text-cyan-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                  {val}{unit}
                </span>
                
                {/* La Barra */}
                <div 
                  className={`w-8 sm:w-12 rounded-t-md transition-all duration-1000 ease-out shadow-sm ${
                    idx === 0 
                      ? 'bg-slate-200 border-t border-slate-300' 
                      : 'bg-gradient-to-t from-cyan-600 to-cyan-400 border-t border-cyan-300 shadow-cyan-100 shadow-md'
                  }`}
                  style={{ 
                    height: mounted ? `${percentage}%` : '0%' 
                  }}
                >
                  {/* Brillo decorativo */}
                  <div className="w-full h-1/2 bg-white/10 rounded-t-md"></div>
                </div>
              </div>
              
              {/* Etiqueta */}
              <span className="text-[10px] font-bold text-gray-500 text-center leading-tight h-8 flex items-center">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-tighter">
        <span>Eficiencia técnica</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-cyan-500 rounded-full"></span> 
          Proyección Pedro IA
        </span>
      </div>
    </div>
  );
};
