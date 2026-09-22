"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";
import { API_URL } from "@/lib/api";
import Modal from "@/components/ui/modal";

type CreditType = {
  id: number;
  name: string;
  description: string | null;
  minAmount: string;
  maxAmount: string;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate: string;
  imageUrl: string | null;
};

export default function CreditsAdminPage() {
  const [credits, setCredits] = useState<CreditType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Partial<CreditType> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, type: "success" | "error"}>({
    isOpen: false,
    title: "",
    message: "",
    type: "success"
  });

  const fetchCredits = async () => {
    try {
      const res = await fetch(`${API_URL}/credit/types`);
      const data = await res.json();
      setCredits(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleOpenModal = (credit?: CreditType) => {
    if (credit) {
      setEditingCredit(credit);
    } else {
      setEditingCredit({
        name: "",
        description: "",
        minAmount: "500",
        maxAmount: "30000",
        minTermMonths: 3,
        maxTermMonths: 60,
        annualInterestRate: "16",
        imageUrl: ""
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCredit(null);
    setImageFile(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredit) return;

    try {
      const isEditing = !!editingCredit.id;
      const url = `${API_URL}/credit/types${isEditing ? `/${editingCredit.id}` : ''}`;
      
      const { id, createdAt, updatedAt, ...payload } = editingCredit as any;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errStr = "Failed to save";
        try {
          const errData = await res.json();
          errStr = Array.isArray(errData.message) ? errData.message.join(', ') : errData.message || errStr;
        } catch(e) {}
        throw new Error(errStr);
      }
      
      const data = await res.json();
      const creditId = data.id;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const imgRes = await fetch(`${API_URL}/credit/types/${creditId}/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!imgRes.ok) throw new Error("Error al subir imagen");
      }
      
      setModal({ isOpen: true, title: "Éxito", message: "Crédito guardado exitosamente", type: "success" });
      await fetchCredits();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setModal({ isOpen: true, title: "Error", message: err.message || "Error al guardar", type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este crédito?')) return;
    try {
      const res = await fetch(`${API_URL}/credit/types/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error("Error al eliminar");
      setModal({ isOpen: true, title: "Éxito", message: "Crédito eliminado", type: "success" });
      fetchCredits();
    } catch(err: any) {
      setModal({ isOpen: true, title: "Error", message: err.message || "Error al eliminar", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Tipos de Crédito</h1>
          <p className="text-slate-500 mt-1">Administra los productos de crédito disponibles en el simulador.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Crédito
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Monto Rango</th>
                <th className="px-6 py-4">Plazo Rango</th>
                <th className="px-6 py-4">Tasa Nominal</th>
                <th className="px-6 py-4">Imagen URL</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : credits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No hay créditos configurados.</td>
                </tr>
              ) : (
                credits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">#{credit.id}</td>
                    <td className="px-6 py-4 font-bold text-brand-primary">{credit.name}</td>
                    <td className="px-6 py-4">${credit.minAmount} - ${credit.maxAmount}</td>
                    <td className="px-6 py-4">{credit.minTermMonths} - {credit.maxTermMonths} meses</td>
                    <td className="px-6 py-4">{Number(credit.annualInterestRate).toFixed(2)}%</td>
                    <td className="px-6 py-4">
                      {credit.imageUrl ? (
                        <a href={`${credit.imageUrl.startsWith('http') ? '' : API_URL?.replace('/api', '')}${credit.imageUrl}`} target="_blank" className="text-brand-secondary underline max-w-[150px] truncate block">Ver imagen</a>
                      ) : (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Sin Imagen</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(credit)}
                        className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(credit.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && editingCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-brand-primary px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{editingCredit.id ? 'Editar Crédito' : 'Nuevo Crédito'}</h2>
              <button onClick={handleCloseModal} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Nombre del Crédito</label>
                  <input type="text" required value={editingCredit.name || ''} onChange={e => setEditingCredit({...editingCredit, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Tasa Nominal Anual (%)</label>
                  <input type="number" step="0.01" required value={editingCredit.annualInterestRate || ''} onChange={e => setEditingCredit({...editingCredit, annualInterestRate: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Monto Mínimo (USD)</label>
                  <input type="number" required value={editingCredit.minAmount || ''} onChange={e => setEditingCredit({...editingCredit, minAmount: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Monto Máximo (USD)</label>
                  <input type="number" required value={editingCredit.maxAmount || ''} onChange={e => setEditingCredit({...editingCredit, maxAmount: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Plazo Mínimo (meses)</label>
                  <input type="number" required value={editingCredit.minTermMonths || ''} onChange={e => setEditingCredit({...editingCredit, minTermMonths: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Plazo Máximo (meses)</label>
                  <input type="number" required value={editingCredit.maxTermMonths || ''} onChange={e => setEditingCredit({...editingCredit, maxTermMonths: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Imagen del Crédito</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-brand-primary hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">O pegar URL externa:</span>
                  <input type="text" value={editingCredit.imageUrl || ''} onChange={e => setEditingCredit({...editingCredit, imageUrl: e.target.value})} placeholder="https://... o /uploads/..." className="flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button type="submit" className="bg-brand-secondary hover:bg-brand-secondary/90 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                  <Save className="w-5 h-5"/> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
