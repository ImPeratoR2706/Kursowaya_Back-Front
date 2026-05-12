import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type ServiceItem = { id: number; service_name: string; price: string };
type MasterItem = { id: number; full_name: string };
type StatusItem = { id: number; status_code: string };

const timeSlots = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30",
];

const BookingSection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([
    { id: 1, service_name: "Мужская стрижка", price: "1200.00" },
    { id: 2, service_name: "Стрижка ножницами", price: "1600.00" },
    { id: 3, service_name: "Моделирование бороды", price: "900.00" },
    { id: 4, service_name: "Стрижка + борода", price: "1900.00" },
  ]);
  const [masters, setMasters] = useState<MasterItem[]>([
    { id: 1, full_name: "Иван Петров" },
    { id: 2, full_name: "Анна Смирнова" },
    { id: 3, full_name: "Дмитрий Кузнецов" },
  ]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [form, setForm] = useState({
    serviceId: "",
    masterId: "",
    date: "",
    time: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [svc, mas, st] = await Promise.all([
          apiFetch<ServiceItem[]>("/api/services/"),
          apiFetch<MasterItem[]>("/api/users/?role=master"),
          apiFetch<StatusItem[]>("/api/statuses/"),
        ]);
        if (cancelled) return;
        if (Array.isArray(svc) && svc.length) setServices(svc);
        if (Array.isArray(mas) && mas.length) setMasters(mas);
        if (Array.isArray(st) && st.length) setStatuses(st);
      } catch {
        // Keep fallback data (API может требовать авторизацию).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceId || !form.masterId || !form.date || !form.time) {
      toast({ title: "Заполните все поля", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Нужно войти", description: "Чтобы создать запись, войдите в личный кабинет.", variant: "destructive" });
      navigate("/login");
      return;
    }

    const pending = statuses.find((s) => (s.status_code || "").toLowerCase() === "pending");
    if (!pending) {
      toast({ title: "Статусы не загружены", description: "Не найден статус pending. Проверьте бэкенд /api/statuses/.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const start_datetime = `${form.date}T${form.time}:00`;
      await apiFetch("/api/appointments/", {
        method: "POST",
        body: JSON.stringify({
          master_id: Number(form.masterId),
          service_id: Number(form.serviceId),
          status_id: pending.id,
          start_datetime,
          comment: "",
        }),
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setForm({ serviceId: "", masterId: "", date: "", time: "" });
    } catch (err) {
      toast({
        title: "Не удалось создать запись",
        description: err instanceof Error ? err.message : "Ошибка запроса",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-secondary border border-border px-4 py-3.5 text-foreground font-body text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors appearance-none";

  return (
    <section id="booking" className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-4"
        >
          Запись
        </motion.h2>
        <p className="text-muted-foreground font-body text-sm mb-12">
          Выбери мастера, услугу и удобное время — мы всё подготовим к твоему визиту
        </p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-primary/30 p-12 text-center"
          >
            <div className="w-16 h-16 border border-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-2xl uppercase text-foreground mb-2">Вы записаны!</h3>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="border border-border/40 p-8 md:p-10 space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block font-heading">
                  Мастер
                </label>
                <select value={form.masterId} onChange={(e) => update("masterId", e.target.value)} className={inputClass}>
                  <option value="">Выберите мастера</option>
                  {masters.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block font-heading">
                  Услуга
                </label>
                <select value={form.serviceId} onChange={(e) => update("serviceId", e.target.value)} className={inputClass}>
                  <option value="">Выберите услугу</option>
                  {services.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.service_name} — {Number.parseFloat(String(s.price)).toLocaleString("ru-RU")} ₽
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block font-heading">
                  Дата
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block font-heading">
                  Время
                </label>
                <select value={form.time} onChange={(e) => update("time", e.target.value)} className={inputClass}>
                  <option value="">Выберите время</option>
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground font-heading text-base uppercase tracking-[0.2em] py-4 hover:bg-accent transition-colors duration-300 mt-2"
            >
              {submitting ? "Отправка…" : "Записаться"}
            </button>

            <p className="text-muted-foreground/50 text-xs text-center font-body">
              Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных
            </p>
          </motion.form>
        )}
      </div>
    </section>
  );
};

export default BookingSection;
