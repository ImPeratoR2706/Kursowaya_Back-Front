import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addLog, useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { AppointmentApi } from "@/lib/appointmentsApi";
import { validateAppointmentStartInFuture, validateNotes } from "@/lib/formValidation";
import { ArrowLeft } from "lucide-react";

type ServiceItem = { id: number; service_name: string; price: string };
type StatusItem = { id: number; status_code: string; status_name: string };
type UserItem = { id: number; full_name: string; email?: string };

type FormStatus = "pending" | "confirmed" | "completed" | "cancelled";

function parseComment(comment: string) {
  const notes = comment
    .replace(/Тел:\s*[^\n]*/g, "")
    .replace(/Филиал:\s*[^\n]*/g, "")
    .replace(/\n\n+/g, "\n")
    .trim();
  return { notes };
}

function buildComment(notes: string) {
  return notes.trim();
}

function splitDateTime(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("sv-SE"),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

const BookingForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMaster = user?.role === "master";

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [masters, setMasters] = useState<UserItem[]>([]);
  const [clients, setClients] = useState<UserItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(0);
  const [masterId, setMasterId] = useState(0);
  const [serviceId, setServiceId] = useState(0);
  const [statusId, setStatusId] = useState(0);

  const [form, setForm] = useState({
    clientName: "",
    masterName: "",
    service: "",
    date: "",
    time: "",
    status: "pending" as FormStatus,
    notes: "",
  });

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const displayPrice = selectedService ? Number.parseFloat(String(selectedService.price)) || 0 : 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [svc, st, mas] = await Promise.all([
          apiFetch<ServiceItem[]>("/api/services/"),
          apiFetch<StatusItem[]>("/api/statuses/"),
          apiFetch<UserItem[]>("/api/users/?role=master"),
        ]);
        if (cancelled) return;
        setServices(Array.isArray(svc) ? svc : []);
        setStatuses(Array.isArray(st) ? st : []);
        setMasters(Array.isArray(mas) ? mas : []);
        if (user?.role === "admin" || user?.role === "master") {
          const cl = await apiFetch<UserItem[]>("/api/users/?role=client");
          if (!cancelled) setClients(Array.isArray(cl) ? cl : []);
        }
      } catch (e) {
        if (!cancelled) setCatalogError(e instanceof Error ? e.message : "Ошибка загрузки справочников");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const a = await apiFetch<AppointmentApi>(`/api/appointments/${id}/`);
        if (cancelled || !a) return;
        const { date, time } = splitDateTime(a.start_datetime);
        const { notes } = parseComment(a.comment || "");
        setClientId(a.client?.id ?? 0);
        setMasterId(a.master?.id ?? 0);
        setServiceId(a.service?.id ?? 0);
        setStatusId(a.status?.id ?? 0);
        setForm({
          clientName: a.client?.full_name || "",
          masterName: a.master?.full_name || "",
          service: a.service?.service_name || "",
          date,
          time,
          status: (a.status?.status_code?.toLowerCase() as FormStatus) || "pending",
          notes,
        });
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Ошибка",
            description: e instanceof Error ? e.message : "Не удалось загрузить запись",
            variant: "destructive",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, toast]);

  useEffect(() => {
    const m = masters.find((x) => x.id === masterId);
    if (m) setForm((p) => ({ ...p, masterName: m.full_name }));
  }, [masterId, masters]);

  useEffect(() => {
    const s = services.find((x) => x.id === serviceId);
    if (s) setForm((p) => ({ ...p, service: s.service_name }));
  }, [serviceId, services]);

  useEffect(() => {
    const c = clients.find((x) => x.id === clientId);
    if (c) setForm((p) => ({ ...p, clientName: c.full_name }));
  }, [clientId, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const notesErr = validateNotes(form.notes);
    if (notesErr) {
      toast({ title: "Проверьте форму", description: notesErr, variant: "destructive" });
      return;
    }
    const startErr = validateAppointmentStartInFuture(form.date, form.time, { isEdit });
    if (startErr) {
      toast({ title: "Проверьте форму", description: startErr, variant: "destructive" });
      return;
    }
    const pending = statuses.find((s) => s.status_code.toLowerCase() === "pending");
    const createStatusId = isEdit ? statusId : pending?.id || statusId;
    if (!masterId || !serviceId || !createStatusId) {
      toast({ title: "Проверьте форму", description: "Выберите мастера, услугу и статус.", variant: "destructive" });
      return;
    }
    if (user?.role === "admin" && !clientId) {
      toast({ title: "Клиент", description: "Выберите клиента из списка.", variant: "destructive" });
      return;
    }
    const start_datetime = `${form.date}T${form.time}:00`;
    const comment = buildComment(form.notes);
    const body: Record<string, unknown> = {
      master_id: masterId,
      service_id: serviceId,
      status_id: createStatusId,
      start_datetime,
      comment,
    };
    if (user?.role === "admin") {
      body.client_id = clientId;
    }
    try {
      if (isEdit) {
        await apiFetch(`/api/appointments/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({
            ...body,
            status_id: statusId || createStatusId,
          }),
        });
        addLog(`Редактирование записи ${id}`);
        toast({ title: "Запись обновлена" });
      } else {
        await apiFetch("/api/appointments/", {
          method: "POST",
          body: JSON.stringify(body),
        });
        addLog(`Создание новой записи: ${form.clientName || user?.name}`);
        toast({ title: "Запись создана" });
      }
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось сохранить",
        variant: "destructive",
      });
    }
  };

  const set = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-body mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Назад к списку
      </button>

      <h1 className="font-heading text-3xl font-bold text-foreground uppercase italic mb-6">
        {isEdit ? "Редактирование записи" : "Новая запись"}
      </h1>

      {catalogError && <p className="text-destructive text-sm font-body mb-4">{catalogError}</p>}

      <form onSubmit={handleSubmit} className="border border-border/40 p-8 space-y-5">
        {user?.role === "admin" && (
          <div>
            <label htmlFor="clientId" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Клиент *
            </label>
            <select
              id="clientId"
              required
              value={clientId || ""}
              onChange={(e) => setClientId(Number(e.target.value))}
              className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary"
            >
              <option value="">Выберите клиента</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {user?.role === "client" && (
          <p className="text-muted-foreground text-sm font-body">
            Клиент: <span className="text-foreground">{user.name}</span> (вы)
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="service" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Услуга *
            </label>
            {isMaster ? (
              <p className="text-foreground font-body text-sm py-3 border border-border/20 px-4 bg-secondary/20">
                {form.service || "—"}
              </p>
            ) : (
              <select
                id="service"
                required
                value={serviceId || ""}
                onChange={(e) => setServiceId(Number(e.target.value))}
                className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary"
              >
                <option value="">Выберите услугу</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.service_name} — {Number.parseFloat(String(s.price)).toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="master" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Мастер *
            </label>
            {isMaster ? (
              <p className="text-foreground font-body text-sm py-3 border border-border/20 px-4 bg-secondary/20">
                {form.masterName || "—"}
              </p>
            ) : (
              <select
                id="master"
                required
                value={masterId || ""}
                onChange={(e) => setMasterId(Number(e.target.value))}
                className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary"
              >
                <option value="">Выберите мастера</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="date" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Дата *
            </label>
            <input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              readOnly={isMaster}
              className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Время *
            </label>
            <input
              id="time"
              type="time"
              required
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              readOnly={isMaster}
              className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">Цена (из услуги)</label>
            <p className="text-foreground font-body text-sm py-3 border border-border/20 px-4 bg-secondary/20">
              {displayPrice ? `${displayPrice.toLocaleString("ru-RU")} ₽` : "—"}
            </p>
          </div>
          {isEdit && (
            <div>
              <label htmlFor="status" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
                Статус
              </label>
              <select
                id="status"
                value={statusId || ""}
                onChange={(e) => {
                  const sid = Number(e.target.value);
                  setStatusId(sid);
                  const st = statuses.find((s) => s.id === sid);
                  if (st) setForm((p) => ({ ...p, status: st.status_code.toLowerCase() as FormStatus }));
                }}
                className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
            Примечания
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="border border-primary text-primary font-heading text-sm uppercase tracking-[0.2em] px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            {isEdit ? "Сохранить" : "Создать запись"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="border border-border/40 text-muted-foreground font-heading text-sm uppercase tracking-[0.2em] px-8 py-3 hover:border-foreground/30 transition-all duration-300"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
