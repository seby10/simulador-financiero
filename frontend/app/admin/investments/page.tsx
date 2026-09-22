"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon } from "lucide-react";
import { API_URL } from "@/lib/api";
import Modal from "@/components/ui/modal";

type InvestmentPlan = {
  id: number;
  name: string;
  minAmount: string;
  maxAmount: string;
  termMinDays: number;
  termMaxDays: number;
  tea: string;
  allowsMonthlyPayout: boolean;
  requiredDocuments: string[];
  imageUrl?: string;
};

export default function InvestmentsAdminPage() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<InvestmentPlan> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, type: "success" | "error"}>({
    isOpen: false,
    title: "",
    message: "",
    type: "success"
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/investment/plans`);
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenModal = (plan?: InvestmentPlan) => {
    if (plan) {
      setEditingPlan(plan);
    } else {
      setEditingPlan({
        name: "",
        minAmount: "100",
        maxAmount: "100000",
        termMinDays: 30,
        termMaxDays: 360,
        tea: "8.5000",
        allowsMonthlyPayout: false,
        requiredDocuments: ["idFront", "idBack"],
        imageUrl: "",
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setImageFile(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      const isEditing = !!editingPlan.id;
      const url = `${API_URL}/investment/plans${isEditing ? `/${editingPlan.id}` : ''}`;
      
      const { id, createdAt, updatedAt, ...rest } = editingPlan as any;
      const payload = {
        ...rest,
        termMinDays: Number(editingPlan.termMinDays),
        termMaxDays: Number(editingPlan.termMaxDays),
      };

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
      const planId = data.id;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const imgRes = await fetch(`${API_URL}/investment/plans/${planId}/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!imgRes.ok) throw new Error("Error al subir imagen");
      }
      
      setModal({ isOpen: true, title: "Éxito", message: "Plan de inversión guardado exitosamente", type: "success" });
      await fetchPlans();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setModal({ isOpen: true, title: "Error", message: err.message || "Error al guardar", type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este plan de inversión?")) return;
    try {
      const res = await fetch(`${API_URL}/investment/plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setModal({ isOpen: true, title: "Éxito", message: "Plan de inversión eliminado", type: "success" });
      await fetchPlans();
    } catch (err: any) {
      console.error(err);
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
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Pólizas de Inversión (DPF)</h1>
          <p className="text-slate-500 mt-1">Configura los planes de inversión, montos mínimos, plazos y tasas de interés.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Plan
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre del Plan</th>
                <th className="px-6 py-4">Montos</th>
                <th className="px-6 py-4">Plazos (Días)</th>
                <th className="px-6 py-4">TEA (%)</th>
                <th className="px-6 py-4">Pago Mensual</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No hay planes de inversión.</td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">#{plan.id}</td>
                    <td className="px-6 py-4 font-bold text-brand-primary">{plan.name}</td>
                    <td className="px-6 py-4 text-brand-secondary font-medium">\${Number(plan.minAmount)} - \${Number(plan.maxAmount)}</td>
                    <td className="px-6 py-4">{plan.termMinDays} - {plan.termMaxDays} días</td>
                    <td className="px-6 py-4 font-bold">{Number(plan.tea).toFixed(2)}%</td>
                    <td className="px-6 py-4">
                      {plan.allowsMonthlyPayout ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">Permitido</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-xs">Al Vencimiento</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(plan)}
                        className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
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
      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="bg-brand-primary px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{editingPlan.id ? 'Editar Plan de Inversión' : 'Nuevo Plan'}</h2>
              <button onClick={handleCloseModal} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Nombre del Plan</label>
                  <input 
                    type="text" 
                    required 
                    value={editingPlan.name || ''} 
                    onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Monto Mínimo (USD)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingPlan.minAmount || ''} 
                    onChange={e => setEditingPlan({...editingPlan, minAmount: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Monto Máximo (USD)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingPlan.maxAmount || ''} 
                    onChange={e => setEditingPlan({...editingPlan, maxAmount: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Plazo Mínimo (Días)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingPlan.termMinDays || ''} 
                    onChange={e => setEditingPlan({...editingPlan, termMinDays: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Plazo Máximo (Días)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingPlan.termMaxDays || ''} 
                    onChange={e => setEditingPlan({...editingPlan, termMaxDays: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Tasa Efectiva Anual (TEA %)</label>
                  <input 
                    type="number" 
                    step="0.0001" 
                    required 
                    value={editingPlan.tea || ''} 
                    onChange={e => setEditingPlan({...editingPlan, tea: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Imagen del Plan (Opcional)
                  </label>
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
                    <input 
                      type="text" 
                      value={editingPlan.imageUrl || ''} 
                      onChange={e => setEditingPlan({...editingPlan, imageUrl: e.target.value})} 
                      className="flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                      placeholder="https://ejemplo.com/imagen.jpg o /uploads/..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <input 
                  type="checkbox" 
                  id="allowsMonthlyPayout"
                  checked={editingPlan.allowsMonthlyPayout || false} 
                  onChange={e => setEditingPlan({...editingPlan, allowsMonthlyPayout: e.target.checked})} 
                  className="w-5 h-5 text-brand-secondary rounded focus:ring-brand-secondary" 
                />
                <label htmlFor="allowsMonthlyPayout" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  ¿Permite pago de intereses mensuales?
                </label>
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
