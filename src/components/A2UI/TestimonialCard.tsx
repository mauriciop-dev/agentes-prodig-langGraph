
'use client';
import React from 'react';
import { TestimonialData } from '@/lib/types';

export const TestimonialCard: React.FC<TestimonialData> = ({ client, quote, result }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border-l-4 border-cyan-500 shadow-md mt-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 text-slate-100 text-6xl font-serif">“</div>
      <p className="text-slate-600 italic text-sm mb-4 relative z-10">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">{client[0]}</div>
        <div>
          <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{client}</p>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Resultado: {result}</p>
        </div>
      </div>
    </div>
  );
};
