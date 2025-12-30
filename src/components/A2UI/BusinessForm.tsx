
'use client';
import React, { useState } from 'react';

interface BusinessFormProps {
  title: string;
  fields: string[];
  onSubmit: (data: Record<string, string>) => void;
  disabled?: boolean;
}

export const BusinessForm: React.FC<BusinessFormProps> = ({ title, fields, onSubmit, disabled }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-emerald-200 shadow-lg mt-4 space-y-4">
      <h3 className="font-bold text-emerald-800 text-lg border-b border-emerald-100 pb-2">{title}</h3>
      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-emerald-600 uppercase">{field.replace('_', ' ')}</label>
            <input
              required
              disabled={disabled}
              className="p-2.5 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder={`Ingrese ${field}...`}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            />
          </div>
        ))}
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
