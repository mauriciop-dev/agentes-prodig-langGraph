
'use client';
import React from 'react';
import { SWOTData } from '@/lib/types';

export const SWOTAnalysis: React.FC<SWOTData> = ({ strengths = [], weaknesses = [], opportunities = [], threats = [] }) => {
  const Card = ({ title, items, colorClass, label }: { title: string, items: string[], colorClass: string, label: string }) => (
    <div className={`p-4 rounded-xl border shadow-sm ${colorClass}`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-black text-[10px] uppercase tracking-wider">{title}</h4>
        <span className="text-[18px] opacity-30">{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] leading-tight flex items-start gap-1.5 opacity-90">
            <span className="mt-1 w-1 h-1 rounded-full bg-current shrink-0"></span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <Card title="Fortalezas" items={strengths} colorClass="bg-emerald-50 border-emerald-100 text-emerald-800" label="F" />
      <Card title="Oportunidades" items={opportunities} colorClass="bg-sky-50 border-sky-100 text-sky-800" label="O" />
      <Card title="Debilidades" items={weaknesses} colorClass="bg-amber-50 border-amber-100 text-amber-800" label="D" />
      <Card title="Amenazas" items={threats} colorClass="bg-red-50 border-red-100 text-red-800" label="A" />
    </div>
  );
};
