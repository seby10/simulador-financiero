"use client";

import { useEffect, useState } from "react";
import { Save, Building2, Palette, Image as ImageIcon, Layout, Navigation, CreditCard, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import { API_URL } from "@/lib/api";

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
  accentColor?: string;
  navbarBgColor?: string;
  navbarTextColor?: string;
  pageBgColor?: string;
  cardBgColor?: string;
  footerBgColor?: string;
  footerTextColor?: string;
  heroImageUrl?: string;
  heroTitle: string;
  heroSubtitle: string;
};

export default function InstitutionAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<InstitutionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  // Modal State
  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, type: "success" | "error"}>({
    isOpen: false,
    title: "",
    message: "",
    type: "success"
  });

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/institution`);
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

  const getLogoSrc = () => {
    if (logoFile) return URL.createObjectURL(logoFile);
    if (!config?.logoUrl) return null;
    if (config.logoUrl.startsWith("http://") || config.logoUrl.startsWith("https://")) {
      return config.logoUrl;
    }
    return `${API_URL?.replace('/api', '')}${config.logoUrl}`;
  };

  const getHeroImageSrc = () => {
    if (heroFile) return URL.createObjectURL(heroFile);
    if (!config?.heroImageUrl) return null;
    if (config.heroImageUrl.startsWith("http://") || config.heroImageUrl.startsWith("https://")) {
      return config.heroImageUrl;
    }
    return `${API_URL?.replace('/api', '')}${config.heroImageUrl}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);

    try {
      // 1. Guardar datos de texto y colores completísimos
      const res = await fetch(`${API_URL}/institution`, {
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
          accentColor: config.accentColor || '#10b981',
          navbarBgColor: config.navbarBgColor || '#ffffff',
          navbarTextColor: config.navbarTextColor || '#1e293b',
          pageBgColor: config.pageBgColor || '#f8fafc',
          cardBgColor: config.cardBgColor || '#ffffff',
          footerBgColor: config.footerBgColor || '#003b70',
          footerTextColor: config.footerTextColor || '#e2e8f0',
          heroTitle: config.heroTitle || 'El respaldo financiero que necesitas.',
          heroSubtitle: config.heroSubtitle || 'Crecemos junto a ti.',
          heroImageUrl: config.heroImageUrl || '',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message 
          ? (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message)
          : "Error al guardar datos";
        throw new Error(errorMessage);
      }

      // 2. Subir logo si hay uno nuevo
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        
        const logoRes = await fetch(`${API_URL}/institution/logo`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!logoRes.ok) throw new Error("Error al subir logo");
      }

      // 3. Subir imagen hero si hay una nueva
      if (heroFile) {
        const formData = new FormData();
        formData.append("hero", heroFile);

        const heroRes = await fetch(`${API_URL}/institution/hero`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!heroRes.ok) throw new Error("Error al subir imagen de fondo");
      }

      setModal({ 
        isOpen: true, 
        title: "¡Configuración Guardada!", 
        message: "Los cambios de color, imágenes y datos institucionales se han aplicado correctamente.", 
        type: "success" 
      });

      await fetchConfig();
      setLogoFile(null);
      setHeroFile(null);
      
      // Update Next.js Server Components dynamically in this tab
      router.refresh();
      
      // Trigger update in other tabs (Landing Page)
      localStorage.setItem('institutionUpdated', Date.now().toString());

    } catch (err: any) {
      console.error(err);
      setModal({ isOpen: true, title: "Error", message: err.message || "Ocurrió un error al guardar", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;
  if (!config) return <div className="p-8 text-center text-red-500">Error al cargar configuración</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => {
          setModal({...modal, isOpen: false});
        }} 
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Configuración & Personalización Institucional</h1>
        <p className="text-slate-500 mt-1">Personaliza totalmente los colores, imágenes, logotipos e información global de la institución.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        <div className="p-8 space-y-8">
          
          {/* Logo Section */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-secondary" /> Logotipo Institucional
            </h3>
            <div className="flex items-center gap-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div className="w-32 h-32 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden border border-slate-200">
                {getLogoSrc() ? (
                  <img src={getLogoSrc()!} alt="Logo Institucional" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-slate-400 font-medium text-sm text-center">Sin logo</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Subir nuevo logotipo</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-brand-primary hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">Formatos permitidos: PNG, JPG, WebP. Máximo 5MB.</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Custom Palette Sections */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Palette className="w-5 h-5 text-brand-secondary" /> Personalización Completa de Colores
            </h3>
            <p className="text-xs text-slate-500 mb-6">Ajusta cada color del sitio web para que coincida perfectamente con tu manual de marca.</p>

            <div className="space-y-6">
              {/* 1. Colores de Marca */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-secondary" /> 1. Paleta de Marca Principal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Color Principal (Títulos, Botones)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.primaryColor || '#003b70'}
                        onChange={e => setConfig({...config, primaryColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.primaryColor || '#003b70'}
                        onChange={e => setConfig({...config, primaryColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Color Secundario (CTA, Badges)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.secondaryColor || '#35b8db'}
                        onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.secondaryColor || '#35b8db'}
                        onChange={e => setConfig({...config, secondaryColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Color de Acento / Éxito</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.accentColor || '#10b981'}
                        onChange={e => setConfig({...config, accentColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.accentColor || '#10b981'}
                        onChange={e => setConfig({...config, accentColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Encabezado & Navegación (Navbar) */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-brand-secondary" /> 2. Cabecera (Navbar)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fondo del Navbar</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.navbarBgColor || '#ffffff'}
                        onChange={e => setConfig({...config, navbarBgColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.navbarBgColor || '#ffffff'}
                        onChange={e => setConfig({...config, navbarBgColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Texto del Menú Navbar</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.navbarTextColor || '#1e293b'}
                        onChange={e => setConfig({...config, navbarTextColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.navbarTextColor || '#1e293b'}
                        onChange={e => setConfig({...config, navbarTextColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Fondo General & Tarjetas */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-secondary" /> 3. Estructura de Páginas & Tarjetas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fondo General de la Página</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.pageBgColor || '#f8fafc'}
                        onChange={e => setConfig({...config, pageBgColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.pageBgColor || '#f8fafc'}
                        onChange={e => setConfig({...config, pageBgColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fondo de las Tarjetas</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.cardBgColor || '#ffffff'}
                        onChange={e => setConfig({...config, cardBgColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.cardBgColor || '#ffffff'}
                        onChange={e => setConfig({...config, cardBgColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Pie de Página (Footer) */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-brand-secondary" /> 4. Pie de Página (Footer)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fondo del Footer</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.footerBgColor || '#003b70'}
                        onChange={e => setConfig({...config, footerBgColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.footerBgColor || '#003b70'}
                        onChange={e => setConfig({...config, footerBgColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Texto del Footer</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.footerTextColor || '#e2e8f0'}
                        onChange={e => setConfig({...config, footerTextColor: e.target.value})}
                        className="w-10 h-10 rounded cursor-pointer border-0 shrink-0"
                      />
                      <input 
                        type="text" 
                        value={config.footerTextColor || '#e2e8f0'}
                        onChange={e => setConfig({...config, footerTextColor: e.target.value})}
                        className="w-full px-2.5 py-1.5 border rounded-lg uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Landing Page Personalization */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-brand-secondary" /> Personalización Landing Page
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Título Principal</label>
                <input 
                  type="text" 
                  required 
                  value={config.heroTitle} 
                  onChange={e => setConfig({...config, heroTitle: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none font-bold text-sm" 
                  placeholder="El respaldo financiero que necesitas"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Subtítulo</label>
                <textarea 
                  required 
                  rows={2}
                  value={config.heroSubtitle} 
                  onChange={e => setConfig({...config, heroSubtitle: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none resize-none text-sm" 
                  placeholder="Crecemos junto a ti."
                />
              </div>

              {/* Hero Image Section */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Imagen de Fondo (Hero Banner)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="w-full sm:w-48 h-32 bg-slate-200 rounded-lg overflow-hidden relative border border-slate-300 flex items-center justify-center">
                    {getHeroImageSrc() ? (
                      <img src={getHeroImageSrc()!} alt="Hero Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-xs font-medium text-center p-2">Sin imagen de fondo</span>
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Subir nueva imagen desde tu equipo</label>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-brand-primary hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">O pegar URL externa:</span>
                      <input 
                        type="text" 
                        value={config.heroImageUrl || ''} 
                        onChange={e => setConfig({...config, heroImageUrl: e.target.value})} 
                        className="flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                        placeholder="https://ejemplo.com/imagen.jpg o /uploads/..."
                      />
                    </div>
                  </div>
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none text-sm" 
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none text-sm" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Representante Legal</label>
                <input 
                  type="text" 
                  required 
                  value={config.legalRepresentative} 
                  onChange={e => setConfig({...config, legalRepresentative: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none text-sm" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                <input 
                  type="text" 
                  required 
                  value={config.phone} 
                  onChange={e => setConfig({...config, phone: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none text-sm" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={config.email} 
                  onChange={e => setConfig({...config, email: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none text-sm" 
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-sm font-semibold text-slate-700">Dirección</label>
                <input 
                  type="text" 
                  required 
                  value={config.address} 
                  onChange={e => setConfig({...config, address: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none text-sm" 
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-sm font-semibold text-slate-700">Texto Legal (Aparece en PDFs)</label>
                <textarea 
                  required 
                  rows={3}
                  value={config.disclaimerText} 
                  onChange={e => setConfig({...config, disclaimerText: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none resize-none text-sm" 
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
