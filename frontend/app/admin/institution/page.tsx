"use client";

import { useEffect, useState } from "react";
import { Save, Building2, Upload } from "lucide-react";

type InstitutionConfig = {
  institutionName: string;
  ruc: string;
  legalRepresentative: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  disclaimerText: string;
  primaryColor: string;
  secondaryColor: string;
};

export default function InstitutionAdminPage() {
  const [config, setConfig] = useState<InstitutionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/institution`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);

    try {
      // 1. Guardar datos de texto
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/institution`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          institutionName: config.institutionName,
          ruc: config.ruc,
          legalRepresentative: config.legalRepresentative,
          address: config.address,
          phone: config.phone,
          email: config.email,
          disclaimerText: config.disclaimerText,
          primaryColor: config.primaryColor || '#003b70',
          secondaryColor: config.secondaryColor || '#35b8db',
        }),
      });

      if (!res.ok) throw new Error("Error al guardar datos");

      // 2. Subir logo si hay uno nuevo
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        
        const logoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/institution/logo`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!logoRes.ok) throw new Error("Error al subir logo");
      }

      alert("Configuración guardada correctamente");
      await fetchConfig();
      setLogoFile(null); // Reset file input
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;
  if (!config) return <div className="p-8 text-center text-red-500">Error al cargar configuración</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Configuración Institucional</h1>
        <p className="text-slate-500 mt-1">Modifica los datos globales, logos y colores de tu Cooperativa.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        <div className="p-8 space-y-8">
          
          {/* Logo Section */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-secondary" /> Identidad Visual
            </h3>
            <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div className="w-32 h-32 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden border border-slate-200">
                {logoFile ? (
                  <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                ) : config.logoUrl ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'}${config.logoUrl}`} alt="Logo Institucional" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-slate-400 font-medium text-sm text-center">Sin logo</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Subir nuevo logotipo</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-brand-primary hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">Formatos permitidos: PNG, JPG. Máximo 5MB.</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Colores Section */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              Colores Corporativos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Color Principal (Botones, Cabeceras)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.primaryColor}
                    onChange={e => setConfig({...config, primaryColor: e.target.value})}
                    className="w-12 h-12 rounded cursor-pointer border-0"
                  />
                  <input 
                    type="text" 
                    value={config.primaryColor}
                    onChange={e => setConfig({...config, primaryColor: e.target.value})}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Color Secundario (Detalles, Acentos)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={config.secondaryColor}
                    onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                    className="w-12 h-12 rounded cursor-pointer border-0"
                  />
                  <input 
                    type="text" 
                    value={config.secondaryColor}
                    onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Datos Generales */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-sm font-semibold text-slate-700">Nombre de la Institución</label>
                <input 
                  type="text" 
                  required 
                  value={config.institutionName} 
                  onChange={e => setConfig({...config, institutionName: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">RUC</label>
                <input 
                  type="text" 
                  required 
                  maxLength={13}
                  value={config.ruc} 
                  onChange={e => setConfig({...config, ruc: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Representante Legal</label>
                <input 
                  type="text" 
                  required 
                  value={config.legalRepresentative} 
                  onChange={e => setConfig({...config, legalRepresentative: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                <input 
                  type="text" 
                  required 
                  value={config.phone} 
                  onChange={e => setConfig({...config, phone: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={config.email} 
                  onChange={e => setConfig({...config, email: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-sm font-semibold text-slate-700">Dirección</label>
                <input 
                  type="text" 
                  required 
                  value={config.address} 
                  onChange={e => setConfig({...config, address: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-sm font-semibold text-slate-700">Texto Legal (Aparece en PDFs)</label>
                <textarea 
                  required 
                  rows={3}
                  value={config.disclaimerText} 
                  onChange={e => setConfig({...config, disclaimerText: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none resize-none" 
                />
              </div>

            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-md hover:shadow-lg"
          >
            <Save className="w-5 h-5"/> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </form>
    </div>
  );
}
