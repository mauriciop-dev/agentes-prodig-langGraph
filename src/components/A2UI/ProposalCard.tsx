
'use client';
import React from 'react';

interface ProposalCardProps {
  title: string;
  roi: string;
  cost: string;
  features: string[];
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ title, roi, cost, features }) => {
  return (
    <div className="bg-gradient-to-br from-sky-600 to-indigo-700 text-white p-6 rounded-2xl shadow-xl mt-4 border border-white/20">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
          RECOMENDADO
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
          <p className="text-[10px] uppercase opacity-70 font-bold">ROI Estimado</p>
          <p className="text-2xl font-black text-emerald-300">{roi}</p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
          <p className="text-[10px] uppercase opacity-70 font-bold">Inversión Base</p>
          <p className="text-2xl font-black">{cost}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase opacity-70">Entregables Clave:</p>
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
