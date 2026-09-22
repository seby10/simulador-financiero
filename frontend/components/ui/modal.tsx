"use client";

import { X } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "info";
};

export default function Modal({ isOpen, onClose, title, message, type = "info" }: ModalProps) {
  if (!isOpen) return null;

  const bgColors = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  };

  const iconColors = {
    success: "text-emerald-500",
    error: "text-red-500",
    info: "text-blue-500",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className={`p-6 border-b ${bgColors[type]}`}>
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className={iconColors[type]}>
                {type === "success" && "✓"}
                {type === "error" && "✕"}
                {type === "info" && "ℹ"}
              </span>
              {title}
            </h3>
            <button onClick={onClose} className="hover:bg-black/10 p-1 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 text-slate-600">
          <p>{message}</p>
        </div>
        <div className="bg-slate-50 p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
