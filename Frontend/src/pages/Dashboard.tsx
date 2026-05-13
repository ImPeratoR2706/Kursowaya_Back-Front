import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Clock, CheckCircle2, XCircle, Search, Eye, Edit, Trash2 } from "lucide-react";
import { addLog, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchAppointments, confirmAppointment, cancelAppointment, type BookingRow } from "@/lib/appointmentsApi";
import { fetchMasterNoShowStats, type MasterNoShowStat } from "@/lib/mastersApi";
import { predictNoShowForAppointment } from "@/lib/aiApi";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "text-yellow-500 border-yellow-500/30" },
  confirmed: { label: "Подтверждена", color: "text-primary border-primary/30" },
  completed: { label: "Завершена", color: "text-green-500 border-green-500/30" },
  cancelled: { label: "Отменена", color: "text-destructive border-destructive/30" },
  no_show: { label: "Неявка", color: "text-orange-500 border-orange-500/30" },
};

const riskLabels: Record<NonNullable<BookingRow["aiRiskColor"]>, { label: string; color: string }> = {
  green: { label: "Низкий", color: "text-green-500 border-green-500/30" },
  yellow: { label: "Средний", color: "text-yellow-500 border-yellow-500/30" },
  red: { label: "Высокий", color: "text-destructive border-destructive/30" },
};

const Dashboard = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canStaffActions = user?.role === "admin" || user?.role === "master";
  const canClientCancel = user?.role === "user";
  const canMasterSeeAiForecast = user?.role === "master";

  const { data: bookings = [], isLoading, isError, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const showMasterNoShow = user?.role === "admin" || user?.role === "master";
  const { data: masterNoShow = [], isError: masterStatsError } = useQuery({
    queryKey: ["masters", "no-show-stats"],
    queryFn: fetchMasterNoShowStats,
    enabled: showMasterNoShow,
  });

  const today = useMemo(() => new Date().toLocaleDateString("sv-SE"), []);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch =
        b.clientName.toLowerCase().includes(search.toLowerCase()) ||
        b.masterName.toLowerCase().includes(search.toLowerCase()) ||
        b.service.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || b.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [bookings, search, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      today: bookings.filter((b) => b.date === today).length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings, today]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["appointments"] });

  const predictMutation = useMutation({
    mutationFn: (appointmentId: string) => predictNoShowForAppointment(appointmentId),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await cancelAppointment(id);
      await invalidate();
      addLog(`Отмена записи ${id}`);
      toast({ title: "Запись отменена" });
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось отменить",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmAppointment(id);
      await invalidate();
      addLog(`Подтверждение записи ${id}`);
      toast({ title: "Запись подтверждена" });
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось подтвердить",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: string, status: BookingRow["status"]) => {
    if (status === "confirmed") {
      await handleConfirm(id);
      return;
    }
    toast({ title: "Смена статуса", description: "Используйте карточку записи или API для других статусов." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground uppercase italic">
          Панель управления
        </h1>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm font-body">Загрузка записей…</p>}
      {isError && (
        <p className="text-destructive text-sm font-body">
          {error instanceof Error ? error.message : "Не удалось загрузить записи"}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: CalendarDays, label: "Всего записей", value: stats.total },
          { icon: Clock, label: "Сегодня", value: stats.today },
          { icon: CheckCircle2, label: "Подтверждено", value: stats.confirmed },
          { icon: XCircle, label: "Отменено", value: stats.cancelled },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border border-border/30 p-4"
          >
            <s.icon className="w-5 h-5 text-primary mb-2" />
            <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-muted-foreground text-xs font-body">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, мастеру, услуге..."
            className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm pl-10 pr-4 py-3 focus:outline-none focus:border-primary transition-colors"
            aria-label="Поиск записей"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary"
          aria-label="Фильтр по статусу"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидает</option>
          <option value="confirmed">Подтверждена</option>
          <option value="completed">Завершена</option>
          <option value="cancelled">Отменена</option>
          <option value="no_show">Неявка</option>
        </select>
      </div>

      {showMasterNoShow && (
        <div className="border border-border/30 p-4 space-y-2">
          <p className="font-heading text-sm uppercase tracking-wider text-foreground">Неявки по мастерам</p>
          <p className="text-muted-foreground text-xs font-body">
            Доля неявок среди визитов с исходом: неявка / (завершено + неявка). Если таких записей нет — «—».
          </p>
          {masterStatsError && <p className="text-destructive text-xs">Не удалось загрузить статистику.</p>}
          {!masterStatsError && masterNoShow.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body" role="table">
                <thead>
                  <tr className="text-muted-foreground text-xs uppercase border-b border-border/30">
                    <th className="text-left py-2 pr-3">Мастер</th>
                    <th className="text-left py-2 pr-3">Завершено</th>
                    <th className="text-left py-2 pr-3">Неявок</th>
                    <th className="text-left py-2 pr-3">%</th>
                  </tr>
                </thead>
                <tbody>
                  {masterNoShow.map((row: MasterNoShowStat) => (
                    <tr key={row.master_id} className="border-b border-border/10">
                      <td className="py-2 pr-3 text-foreground">{row.full_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.completed_count}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.no_show_count}</td>
                      <td className="py-2 pr-3 text-foreground">
                        {row.no_show_rate_percent !== null && row.no_show_rate_percent !== undefined
                          ? `${row.no_show_rate_percent.toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-border/30 overflow-x-auto">
        <table className="w-full text-sm font-body" role="table">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left p-4">Клиент</th>
              <th className="text-left p-4 hidden md:table-cell">Услуга</th>
              <th className="text-left p-4 hidden md:table-cell">Мастер</th>
              <th className="text-left p-4">Дата</th>
              <th className="text-left p-4">Статус</th>
              {canMasterSeeAiForecast && <th className="text-left p-4">Прогноз ИИ</th>}
              <th className="text-left p-4">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                <td className="p-4 text-foreground">{b.clientName}</td>
                <td className="p-4 text-muted-foreground hidden md:table-cell">{b.service}</td>
                <td className="p-4 text-muted-foreground hidden md:table-cell">{b.masterName}</td>
                <td className="p-4 text-muted-foreground">
                  {b.date} {b.time}
                </td>
                <td className="p-4">
                  <span className={`text-xs border px-2 py-1 ${(statusLabels[b.status] || statusLabels.pending).color}`}>
                    {(statusLabels[b.status] || statusLabels.pending).label}
                  </span>
                </td>
                {canMasterSeeAiForecast && (
                  <td className="p-4">
                    {b.aiRiskColor && typeof b.aiProbability === "number" ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs border px-2 py-1 ${riskLabels[b.aiRiskColor].color}`}>
                          {riskLabels[b.aiRiskColor].label}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">{b.aiProbability.toFixed(0)}%</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => predictMutation.mutate(b.id)}
                        disabled={predictMutation.isPending}
                        className="text-xs border border-primary/40 text-primary px-2 py-1 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                        title="Рассчитать прогноз ИИ"
                      >
                        {predictMutation.isPending ? "Расчёт…" : "Рассчитать"}
                      </button>
                    )}
                  </td>
                )}
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link to={`/dashboard/booking/${b.id}`} className="text-muted-foreground hover:text-primary transition-colors" title="Просмотр">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {canStaffActions && (
                      <Link to={`/dashboard/edit/${b.id}`} className="text-muted-foreground hover:text-primary transition-colors" title="Редактировать">
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    {canStaffActions && b.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(b.id, "confirmed")}
                        className="text-muted-foreground hover:text-green-500 transition-colors"
                        title="Подтвердить"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {canStaffActions && b.status !== "cancelled" && (
                      <button type="button" onClick={() => handleDelete(b.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Отменить">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {canClientCancel && b.status !== "cancelled" && (
                      <button type="button" onClick={() => handleDelete(b.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Отменить">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={canMasterSeeAiForecast ? 7 : 6} className="p-8 text-center text-muted-foreground">
                  Записи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
