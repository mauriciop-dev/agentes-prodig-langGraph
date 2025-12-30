
'use client';
import React from 'react';
import { TechStackData } from '@/lib/types';

export const TechStackGrid: React.FC<TechStackData> = ({ title, stack = [] }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-4">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-50 pb-2">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stack.map((item, i) => (
          <div key={i} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-cyan-200 transition-colors">
            <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">{item.category}</span>
            <span className="text-xs font-black text-slate-700">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
