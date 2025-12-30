
'use client';
import React from 'react';
import { ComparativeTableData } from '@/lib/types';

export const ComparativeTable: React.FC<ComparativeTableData> = ({ title, rows = [] }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-4">
      <div className="bg-slate-50 p-3 border-b border-slate-200">
        <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">{title}</h3>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-black">
          <tr>
            <th className="px-4 py-2">Proceso</th>
            <th className="px-4 py-2">Manual (Hoy)</th>
            <th className="px-4 py-2 text-cyan-600">Con IA (ProDig)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/30 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-600">{row.label}</td>
              <td className="px-4 py-3 text-slate-400 line-through decoration-red-300/50">{row.before}</td>
              <td className="px-4 py-3 font-bold text-emerald-600">{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
