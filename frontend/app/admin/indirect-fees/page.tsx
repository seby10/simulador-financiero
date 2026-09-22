"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";
import { API_URL } from "@/lib/api";
import Modal from "@/components/ui/modal";

type FeeTypeEnum = 'FIXED_PER_INSTALLMENT' | 'PERCENTAGE_REMAINING_BALANCE' | 'PERCENTAGE_INITIAL_AMOUNT';

type IndirectFee = {
  id: number;
  name: string;
  feeType: FeeTypeEnum;
  value: string;
  isMandatory: boolean;
};

const FEE_TYPE_LABELS: Record<FeeTypeEnum, string> = {
  FIXED_PER_INSTALLMENT: "Monto Fijo por Cuota",
  PERCENTAGE_REMAINING_BALANCE: "Porcentaje sobre Saldo Restante",
  PERCENTAGE_INITIAL_AMOUNT: "Porcentaje sobre Monto Inicial",
};

export default function IndirectFeesAdminPage() {
  const [fees, setFees] = useState<IndirectFee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Partial<IndirectFee> | null>(null);

  const [modal, setModal] = useState<{isOpen: boolean, title: string, message: string, type: "success" | "error" | "warning" | "info", onConfirm?: () => void}>({
    isOpen: false,
    title: "",
    message: "",
    type: "success"
  });

  const fetchFees = async () => {
    try {
      const res = await fetch(`${API_URL}/credit/fees`);
      const data = await res.json();
      setFees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleOpenModal = (fee?: IndirectFee) => {
    if (fee) {
      setEditingFee(fee);
    } else {
      setEditingFee({
        name: "",
        feeType: "FIXED_PER_INSTALLMENT",
        value: "0.00",
        isMandatory: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFee(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee) return;

    try {
      const isEditing = !!editingFee.id;
      const url = `${API_URL}/credit/fees${isEditing ? `/${editingFee.id}` : ''}`;
      
      const { id, createdAt, updatedAt, ...payload } = editingFee as any;

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
      
      setModal({ isOpen: true, title: "Éxito", message: "Cargo guardado exitosamente", type: "success" });
      await fetchFees();
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setModal({ isOpen: true, title: "Error", message: err.message || "Error al guardar", type: "error" });
    }
  };

  const handleDelete = (id: number) => {
    setModal({
      isOpen: true,
      title: "Confirmar eliminación",
      message: "¿Seguro que deseas eliminar este cargo?",
      type: "warning",
      onConfirm: async () => {
        try {
          setModal({ ...modal, isOpen: false });
          const res = await fetch(`${API_URL}/credit/fees/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to delete");
          setModal({ isOpen: true, title: "Éxito", message: "Cargo eliminado", type: "success" });
          await fetchFees();
        } catch (err: any) {
          console.error(err);
          setModal({ isOpen: true, title: "Error", message: err.message || "Error al eliminar", type: "error" });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({...modal, isOpen: false})} 
        onConfirm={modal.onConfirm}
        title={modal.title} 
        message={modal.message} 
        type={modal.type} 
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Cargos Indirectos y Seguros</h1>
          <p className="text-slate-500 mt-1">Configura seguros, gastos administrativos y otros recargos aplicables a los créditos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cargo
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Tipo de Cálculo</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Obligatorio</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No hay cargos configurados.</td>
                </tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">#{fee.id}</td>
                    <td className="px-6 py-4 font-bold text-brand-primary">{fee.name}</td>
                    <td className="px-6 py-4 text-brand-secondary font-medium">{FEE_TYPE_LABELS[fee.feeType]}</td>
                    <td className="px-6 py-4">
                      {fee.feeType === 'FIXED_PER_INSTALLMENT' ? '$' : ''}
                      {Number(fee.value).toFixed(2)}
                      {fee.feeType !== 'FIXED_PER_INSTALLMENT' ? '%' : ''}
                    </td>
                    <td className="px-6 py-4">
                      {fee.isMandatory ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-xs">Sí</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold text-xs">No (Opcional)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(fee)}
                        className="p-2 text-slate-400 hover:text-brand-secondary hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(fee.id)}
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
      {isModalOpen && editingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-brand-primary px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-xl font-bold">{editingFee.id ? 'Editar Cargo' : 'Nuevo Cargo'}</h2>
              <button onClick={handleCloseModal} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nombre del Cargo (Ej. Seguro de Vida)</label>
                <input 
                  type="text" 
                  required 
                  value={editingFee.name || ''} 
                  onChange={e => setEditingFee({...editingFee, name: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Tipo de Cálculo</label>
                <select 
                  value={editingFee.feeType} 
                  onChange={e => setEditingFee({...editingFee, feeType: e.target.value as FeeTypeEnum})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none"
                >
                  {Object.entries(FEE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Si eliges "Monto Fijo", la cuota final del simulador no variará, ideal para el método Francés.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Valor {editingFee.feeType === 'FIXED_PER_INSTALLMENT' ? '(USD por cuota)' : '(Porcentaje %)'}
                </label>
                <input 
                  type="number" 
                  step="0.0001" 
                  required 
                  value={editingFee.value || ''} 
                  onChange={e => setEditingFee({...editingFee, value: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-secondary outline-none" 
                />
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <input 
                  type="checkbox" 
                  id="isMandatory"
                  checked={editingFee.isMandatory || false} 
                  onChange={e => setEditingFee({...editingFee, isMandatory: e.target.checked})} 
                  className="w-5 h-5 text-brand-secondary rounded focus:ring-brand-secondary" 
                />
                <label htmlFor="isMandatory" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  ¿Es obligatorio? (Aplicar a todos los créditos)
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
