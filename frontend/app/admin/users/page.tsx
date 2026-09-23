"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  CreditCard,
  Building,
  Lock,
  UserPlus,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type UserRole = "ADMIN" | "CUSTOMER";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  idNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  _count?: {
    applications: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "CUSTOMER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State for New User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    idNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    role: "CUSTOMER" as UserRole,
  });
  const [modalError, setModalError] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalSuccess, setModalSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/users`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener la lista de usuarios");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/auth/users/${user.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado del usuario");
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Error al actualizar usuario");
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch(`${API_URL}/auth/users/${userId}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Error al cambiar el rol del usuario");
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Error al cambiar rol");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");
    setModalSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Error al crear usuario");
      }
      setModalSuccess("¡Usuario creado exitosamente!");
      setModalForm({
        idNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        role: "CUSTOMER",
      });
      fetchUsers();
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess("");
      }, 1500);
    } catch (err: any) {
      setModalError(err.message || "Error al procesar la solicitud");
    } finally {
      setModalSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = search.toLowerCase();
    const matchesSearch =
      u.fullName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.idNumber && u.idNumber.toLowerCase().includes(query));

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && u.isActive) ||
      (statusFilter === "INACTIVE" && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const totalCustomers = users.filter((u) => u.role === "CUSTOMER").length;
  const totalAdmins = users.filter((u) => u.role === "ADMIN").length;
  const totalInactive = users.filter((u) => !u.isActive).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#f1a501]">
              ADMINISTRACIÓN DE SISTEMA
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#14183e] font-serif-title">
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control de cuentas, asignación de roles y permisos de acceso a la plataforma.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#df6951] hover:bg-[#c85640] text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-md flex items-center justify-between hover:shadow-lg transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Total Usuarios</p>
            <p className="text-3xl font-black text-[#14183e]">{totalUsers}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#14183e]/5 flex items-center justify-center text-[#14183e]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-md flex items-center justify-between hover:shadow-lg transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Clientes / Inversionistas</p>
            <p className="text-3xl font-black text-[#f1a501]">{totalCustomers}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#f1a501]">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-md flex items-center justify-between hover:shadow-lg transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Administradores</p>
            <p className="text-3xl font-black text-[#df6951]">{totalAdmins}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#df6951]">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-md flex items-center justify-between hover:shadow-lg transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Cuentas Inactivas</p>
            <p className="text-3xl font-black text-slate-400">{totalInactive}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#f1a501] focus:border-transparent font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-[#14183e] bg-slate-50 outline-none cursor-pointer"
            >
              <option value="ALL">Todos los roles</option>
              <option value="CUSTOMER">Clientes</option>
              <option value="ADMIN">Administradores</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-[#14183e] bg-slate-50 outline-none cursor-pointer"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>

          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
            title="Recargar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <span className="animate-spin inline-block w-8 h-8 border-3 border-[#f1a501] border-t-transparent rounded-full" />
            <p className="font-semibold text-sm">Cargando lista de usuarios...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-rose-600 font-semibold text-sm">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-[#14183e] text-lg font-serif-title">No se encontraron usuarios</p>
            <p className="text-xs text-slate-400">Intenta cambiar los filtros o el término de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-extrabold uppercase tracking-wider text-[#5e6282]">
                  <th className="py-4 px-6">Usuario</th>
                  <th className="py-4 px-6">Identificación</th>
                  <th className="py-4 px-6">Contacto</th>
                  <th className="py-4 px-6">Pólizas DPF</th>
                  <th className="py-4 px-6">Rol</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User Profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#14183e] to-slate-700 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#14183e]">{u.fullName}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            Registrado: {new Date(u.createdAt).toLocaleDateString("es-EC")}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* ID Number */}
                    <td className="py-4 px-6 font-mono text-slate-700 font-semibold">
                      {u.idNumber || "Sin cédula"}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {u.email}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {u.phone || "N/A"}
                        </p>
                      </div>
                    </td>

                    {/* Applications Count */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-[#f1a501] border border-amber-200/80">
                        <FileText className="w-3.5 h-3.5" />
                        {u._count?.applications || 0} Pólizas
                      </span>
                    </td>

                    {/* Role Pill & Switcher */}
                    <td className="py-4 px-6">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border outline-none cursor-pointer ${
                          u.role === "ADMIN"
                            ? "bg-orange-50 text-[#df6951] border-orange-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        <option value="CUSTOMER">CLIENTE</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Activa
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Inactiva
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          u.isActive
                            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {u.isActive ? "Desactivar Acceso" : "Activar Acceso"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Creating New User */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14183e]/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#14183e] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#f1a501]" />
                </div>
                <div>
                  <h3 className="font-bold font-serif-title text-xl">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-300">Registra un cliente o nuevo administrador</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser} className="p-6 sm:p-8 space-y-4">
              {modalError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Cédula de Identidad *
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={10}
                    placeholder="10 dígitos"
                    value={modalForm.idNumber}
                    onChange={(e) => setModalForm({ ...modalForm, idNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium focus:ring-2 focus:ring-[#f1a501] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Rol de la Cuenta *
                  </label>
                  <select
                    value={modalForm.role}
                    onChange={(e) => setModalForm({ ...modalForm, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#14183e] bg-slate-50 outline-none"
                  >
                    <option value="CUSTOMER">Cliente / Inversionista</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Nombres *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: María José"
                    value={modalForm.firstName}
                    onChange={(e) => setModalForm({ ...modalForm, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#f1a501] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Apellidos *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Andrade"
                    value={modalForm.lastName}
                    onChange={(e) => setModalForm({ ...modalForm, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#f1a501] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={modalForm.email}
                    onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#f1a501] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Teléfono Móvil *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="0991234567"
                    value={modalForm.phone}
                    onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#f1a501] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">
                    Contraseña *
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    value={modalForm.password}
                    onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#f1a501] outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#df6951] hover:bg-[#c85640] shadow-md transition-all disabled:opacity-50"
                >
                  {modalSaving ? "Guardando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
