
'use client';
import React from 'react';

interface StepProcessProps {
  steps: string[];
  currentStep: number;
}

export const StepProcess: React.FC<StepProcessProps> = ({ steps, currentStep }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md mt-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">Roadmap de Implementación</h3>
      <div className="relative flex justify-between items-start">
        {/* Line Background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 -z-0"></div>
        
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          
          return (
            <div key={idx} className="relative z-10 flex flex-col items-center w-full px-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-500 border-emerald-100' : 
                  isCurrent ? 'bg-cyan-500 border-cyan-100 scale-110 shadow-lg' : 
                  'bg-white border-gray-100 text-gray-300'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>{idx + 1}</span>
                )}
              </div>
              <p className={`text-[10px] mt-2 font-bold text-center leading-tight ${isCurrent ? 'text-cyan-600' : 'text-gray-400'}`}>
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
