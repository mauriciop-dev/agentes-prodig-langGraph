
'use client';
import React, { useState } from 'react';

interface BusinessFormProps {
  title: string;
  fields: string[];
  onSubmit: (data: Record<string, string>) => void;
  disabled?: boolean;
}

export const BusinessForm: React.FC<BusinessFormProps> = ({ title, fields = [], onSubmit, disabled }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Asegurar que fields sea siempre un array
  const safeFields = Array.isArray(fields) ? fields : [];

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-emerald-200 shadow-lg mt-4 space-y-4">
      <h3 className="font-bold text-emerald-800 text-lg border-b border-emerald-100 pb-2">{title || 'Datos de la Empresa'}</h3>
      <div className="grid grid-cols-1 gap-4">
        {safeFields.map((field, idx) => {
          // Defensa crítica: convertir a string y manejar nulos
          const fieldName = String(field || `campo_${idx}`);
          const label = fieldName.replace(/_/g, ' ');
          
          return (
            <div key={`${fieldName}-${idx}`} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-emerald-600 uppercase">{label}</label>
              <input
                required
                disabled={disabled}
                className="p-2.5 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder={`Ingrese ${label.toLowerCase()}...`}
                onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
              />
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        Enviar Diagnóstico
      </button>
    </form>
  );
};
