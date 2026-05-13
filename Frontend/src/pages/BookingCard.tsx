import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { appointmentToRow, cancelAppointment, type AppointmentApi } from "@/lib/appointmentsApi";
import { ArrowLeft, Edit, User, Scissors, CalendarDays, Clock, CreditCard, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import {
  fetchAiDataForAppointment,
  fetchNoShowModelInfo,
  parsePercent,
  predictNoShowForAppointment,
} from "@/lib/aiApi";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает подтверждения", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
  confirmed: { label: "Подтверждена", color: "text-primary border-primary/30 bg-primary/5" },
  completed: { label: "Завершена", color: "text-green-500 border-green-500/30 bg-green-500/5" },
  cancelled: { label: "Отменена", color: "text-destructive border-destructive/30 bg-destructive/5" },
  no_show: { label: "Неявка", color: "text-orange-500 border-orange-500/30 bg-orange-500/5" },
};

const riskLabel: Record<string, { label: string; cls: string }> = {
  green: { label: "Низкий риск", cls: "text-green-500 border-green-500/30 bg-green-500/5" },
  yellow: { label: "Средний риск", cls: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" },
  red: { label: "Высокий риск", cls: "text-destructive border-destructive/30 bg-destructive/5" },
};

const BookingCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canSeeAi = user?.role === "admin";
  const canCancel = !!user && user.role !== "master"; // client and admin can cancel from UI

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => apiFetch<AppointmentApi>(`/api/appointments/${id}/`),
    enabled: !!id,
  });

  const { data: modelInfo } = useQuery({
    queryKey: ["ai", "model-info"],
    queryFn: fetchNoShowModelInfo,
    enabled: canSeeAi,
    staleTime: 60_000,
  });

  const { data: aiData, isLoading: aiLoading, isError: aiIsError, error: aiError } = useQuery({
    queryKey: ["ai", "ai-data", id],
    queryFn: () => fetchAiDataForAppointment(id as string),
    enabled: canSeeAi && !!id,
  });

  const predictMutation = useMutation({
    mutationFn: () => predictNoShowForAppointment(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ai", "ai-data", id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelAppointment(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointment", id] });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const booking = raw ? appointmentToRow(raw) : null;

  if (isLoading) {
    return <p className="text-muted-foreground font-body text-sm py-12 text-center">Загрузка…</p>;
  }

  if (isError || !booking) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground font-body">Запись не найдена</p>
        <button type="button" onClick={() => navigate("/dashboard")} className="text-primary hover:underline text-sm mt-2">
          Вернуться
        </button>
      </div>
    );
  }

  const st = statusLabels[booking.status] || statusLabels.pending;

  const fields = [
    { icon: User, label: "Клиент", value: booking.clientName },
    { icon: Scissors, label: "Услуга", value: booking.service },
    { icon: User, label: "Мастер", value: booking.masterName },
    { icon: CalendarDays, label: "Дата", value: booking.date },
    { icon: Clock, label: "Время", value: booking.time },
    { icon: CreditCard, label: "Стоимость", value: `${booking.price.toLocaleString("ru-RU")} ₽` },
  ];

  const probability = parsePercent(aiData?.prediction_probability);
  const risk = aiData?.master_risk_color ? riskLabel[aiData.master_risk_color] : undefined;

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-body mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Назад к списку
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground uppercase italic">
          Карточка записи
        </h1>
        <div className="flex items-center gap-2">
          {(user?.role === "admin" || user?.role === "master") && (
            <Link
              to={`/dashboard/edit/${booking.id}`}
              className="flex items-center gap-2 border border-primary/50 text-primary text-xs font-heading uppercase tracking-wider px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Edit className="w-3 h-3" /> Редактировать
            </Link>
          )}
          {canCancel && booking.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 border border-border/40 text-muted-foreground text-xs font-heading uppercase tracking-wider px-4 py-2 hover:border-destructive/60 hover:text-destructive transition-colors disabled:opacity-50"
              title="Отменить запись"
            >
              <Trash2 className="w-3 h-3" /> Отменить
            </button>
          )}
        </div>
      </div>

      <div className="border border-border/40">
        <div className={`px-8 py-4 border-b border-border/20 ${st.color}`}>
          <span className="text-sm font-heading uppercase tracking-wider">
            {st.label}
          </span>
        </div>

        <div className="p-8 space-y-5">
          {fields.map((f) => (
            <div key={f.label} className="flex items-start gap-4">
              <f.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-body">{f.label}</p>
                <p className="text-foreground font-body text-sm mt-0.5">{f.value}</p>
              </div>
            </div>
          ))}

          {booking.notes && (
            <div className="flex items-start gap-4">
              <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-body">Примечания</p>
                <p className="text-foreground font-body text-sm mt-0.5">{booking.notes}</p>
              </div>
            </div>
          )}

          {canSeeAi && (
            <div className="pt-2">
              <div className="border border-border/40">
                <div className="px-6 py-4 border-b border-border/20 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-foreground font-heading uppercase tracking-wider text-sm">AI-анализ (риск неявки)</p>
                    <p className="text-muted-foreground text-xs font-body mt-1">
                      Модель: {modelInfo?.model_version || "—"} • {modelInfo?.model_type || "—"} •{" "}
                      {modelInfo?.is_trained ? "обучена" : "не обучена/не найдена"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => predictMutation.mutate()}
                    disabled={predictMutation.isPending}
                    className="border border-primary/50 text-primary text-xs font-heading uppercase tracking-wider px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
                    title="Рассчитать прогноз и сохранить в AI-данные"
                  >
                    {predictMutation.isPending ? "Расчёт…" : "Рассчитать"}
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {aiLoading && <p className="text-muted-foreground text-sm font-body">Загрузка AI-данных…</p>}

                  {aiIsError && (
                    <p className="text-destructive text-sm font-body">
                      {aiError instanceof Error ? aiError.message : "Не удалось загрузить AI-данные"}
                    </p>
                  )}

                  {!aiLoading && !aiIsError && !aiData && (
                    <p className="text-muted-foreground text-sm font-body">
                      AI-данных ещё нет. Нажмите «Рассчитать», чтобы получить прогноз.
                    </p>
                  )}

                  {aiData && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs border px-2 py-1 ${risk?.cls || "text-muted-foreground border-border/40"}`}>
                            {risk?.label || "—"}
                          </span>
                          <span className="text-muted-foreground text-xs font-body">
                            Вероятность: <span className="text-foreground">{aiData.prediction_probability}</span>
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs font-body">
                          {aiData.inference_time_ms ? `инференс: ${aiData.inference_time_ms} мс` : ""}
                        </span>
                      </div>

                      <Progress value={probability ?? 0} className="h-3" />

                      <div className="bg-secondary/40 border border-border/30 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-body">Рекомендация</p>
                        <p className="text-foreground font-body text-sm mt-1">{aiData.admin_recommendation || "—"}</p>
                      </div>
                    </>
                  )}

                  {predictMutation.isError && (
                    <p className="text-destructive text-sm font-body">
                      {predictMutation.error instanceof Error ? predictMutation.error.message : "Ошибка расчёта AI"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BookingCard;
