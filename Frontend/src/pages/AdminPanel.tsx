import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Users, Clock, Trash2, Package } from "lucide-react";
import { Navigate } from "react-router-dom";
import { getLogs, useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { fetchAppointments } from "@/lib/appointmentsApi";
import { fetchServices } from "@/lib/servicesApi";
import AdminServicesTab from "@/components/AdminServicesTab";

type ApiUserRow = {
  id: number;
  full_name: string;
  email: string;
  role: { id: number; role_name: string } | null;
  registration_date?: string;
};

type RoleOption = {
  id: number;
  role_name: string;
};

type AuditRow = {
  id: number;
  action_datetime: string;
  action_type: string;
  action_object: string;
  result: string;
};

function roleLabel(roleName: string) {
  const r = roleName.toLowerCase();
  if (r === "client") return "Клиент";
  if (r === "master") return "Мастер";
  if (r === "admin") return "Админ";
  return roleName || "—";
}

const AdminPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "services" | "logs" | "local">("users");

  const { data: apiUsers = [], isError: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<ApiUserRow[]>("/api/users/"),
    enabled: user?.role === "admin",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => apiFetch<RoleOption[]>("/api/roles/"),
    enabled: user?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      apiFetch<ApiUserRow>(`/api/users/${userId}/`, {
        method: "PATCH",
        body: JSON.stringify({ role_id: roleId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const { data: auditLogs = [], isError: auditError } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => apiFetch<AuditRow[]>("/api/audit-logs/"),
    enabled: user?.role === "admin",
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
    enabled: user?.role === "admin",
  });

  const { data: servicesList = [] } = useQuery({
    queryKey: ["admin-services"],
    queryFn: fetchServices,
    enabled: user?.role === "admin",
  });

  const localLogs = activeTab === "local" ? getLogs() : [];

  const stats = {
    users: user?.role === "admin" ? apiUsers.length : 0,
    bookings: bookings.length,
    services: servicesList.length,
  };

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const masterRoleId = roles.find((r) => r.role_name.toLowerCase() === "master")?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground uppercase italic flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          Администрирование
        </h1>
        <p className="text-muted-foreground text-sm font-body mt-1">
          Пользователи, услуги, журнал сервера и локальные события. Роль можно сменить только с «Клиент» на «Мастер».
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Пользователи (API)", value: stats.users },
          { label: "Записи", value: stats.bookings },
          { label: "Услуги", value: stats.services },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border border-border/30 p-4"
          >
            <p className="font-heading text-2xl font-bold text-primary">{s.value}</p>
            <p className="text-muted-foreground text-xs font-body">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-border/20 flex-wrap">
        {[
          { key: "users" as const, label: "Пользователи", icon: Users },
          { key: "services" as const, label: "Услуги", icon: Package },
          { key: "logs" as const, label: "Журнал сервера", icon: Clock },
          { key: "local" as const, label: "Локальный журнал UI", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-heading uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {usersError && <p className="text-destructive text-sm">Не удалось загрузить пользователей.</p>}
      {updateRoleMutation.isError && (
        <p className="text-destructive text-sm">
          {updateRoleMutation.error instanceof Error ? updateRoleMutation.error.message : "Не удалось сменить роль."}
        </p>
      )}
      {auditError && <p className="text-destructive text-sm">Не удалось загрузить журнал аудита.</p>}

      {activeTab === "services" && <AdminServicesTab />}

      {activeTab === "users" && (
        <div className="border border-border/30 overflow-x-auto">
          <table className="w-full text-sm font-body" role="table">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left p-4">Имя</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Роль</th>
                <th className="text-left p-4 hidden md:table-cell">Регистрация</th>
                <th className="text-left p-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {apiUsers.map((u) => (
                <tr key={u.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 text-foreground">{u.full_name}</td>
                  <td className="p-4 text-muted-foreground">{u.email}</td>
                  <td className="p-4">
                    {u.role?.role_name?.toLowerCase() === "client" && masterRoleId != null ? (
                      <select
                        aria-label={`Роль: ${u.full_name}`}
                        className="bg-secondary/40 border border-border/40 text-foreground text-xs font-body rounded px-2 py-1.5 min-w-[9rem] max-w-full cursor-pointer hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                        value={u.role.id}
                        disabled={updateRoleMutation.isPending}
                        onChange={(e) => {
                          const roleId = Number(e.target.value);
                          if (Number.isNaN(roleId) || roleId === u.role?.id || roleId !== masterRoleId) return;
                          updateRoleMutation.mutate({ userId: u.id, roleId });
                        }}
                      >
                        <option value={u.role.id}>Клиент</option>
                        <option value={masterRoleId}>Мастер</option>
                      </select>
                    ) : (
                      <span
                        className={`text-xs border px-2 py-1 inline-block ${
                          u.role?.role_name?.toLowerCase() === "admin"
                            ? "text-primary border-primary/30"
                            : u.role?.role_name?.toLowerCase() === "master"
                              ? "text-blue-400 border-blue-400/30"
                              : "text-muted-foreground border-border/30"
                        }`}
                      >
                        {roleLabel(u.role?.role_name || "")}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                    {u.registration_date ? new Date(u.registration_date).toLocaleString("ru-RU") : "—"}
                  </td>
                  <td className="p-4">
                    <button type="button" className="text-muted-foreground hover:text-destructive transition-colors opacity-40 cursor-not-allowed" title="Удаление только через Django Admin">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="border border-border/30">
          {auditLogs.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">Журнал аудита пуст или недоступен</p>
          ) : (
            <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-secondary/20 transition-colors">
                  <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-body">
                      {log.action_type} · {log.action_object} · {log.result}
                    </p>
                    <p className="text-muted-foreground text-xs font-body mt-0.5">
                      {new Date(log.action_datetime).toLocaleString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "local" && (
        <div className="border border-border/30">
          {localLogs.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">Локальный журнал пуст</p>
          ) : (
            <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
              {localLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-secondary/20 transition-colors">
                  <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-body">{log.action}</p>
                    <p className="text-muted-foreground text-xs font-body mt-0.5">
                      {new Date(log.timestamp).toLocaleString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-muted-foreground/40 text-xs font-body text-right">
        ГОСТ Р ИСО 9241 — экран администратора и журнал действий
      </p>
    </div>
  );
};

export default AdminPanel;
