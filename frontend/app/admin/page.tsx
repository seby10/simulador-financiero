export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
      <p className="text-slate-500">Bienvenido al Panel de Administración.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Tipos de Crédito</h3>
          <p className="text-3xl font-extrabold text-brand-secondary">4</p>
          <p className="text-sm text-slate-500 mt-2">Créditos configurados</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Pólizas / Inversiones</h3>
          <p className="text-3xl font-extrabold text-brand-secondary">4</p>
          <p className="text-sm text-slate-500 mt-2">Planes de Inversión</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Solicitudes Pendientes</h3>
          <p className="text-3xl font-extrabold text-orange-500">0</p>
          <p className="text-sm text-slate-500 mt-2">Por revisar</p>
        </div>
      </div>
    </div>
  );
}
