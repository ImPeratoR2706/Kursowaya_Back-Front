import { apiFetch } from "./api";

export type AppointmentApi = {
  id: number;
  client: { id: number; full_name: string; email?: string } | null;
  master: { id: number; full_name: string; email?: string } | null;
  service: { id: number; service_name: string; price: string } | null;
  status: { id: number; status_code: string; status_name: string } | null;
  ai_data:
    | {
        prediction_probability: string; // ex: "12.34%"
        master_risk_color: string; // "green" | "yellow" | "red"
        model_version: string;
        created_at: string;
      }
    | null;
  start_datetime: string | null;
  end_datetime: string | null;
  comment: string;
  payment_status: string;
};

export type BookingRow = {
  id: string;
  clientName: string;
  masterName: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  price: number;
  notes?: string;
  aiProbability?: number | null; // 0..100
  aiRiskColor?: "green" | "yellow" | "red" | null;
};

function statusFromCode(code: string | undefined): BookingRow["status"] {
  const c = (code || "").toLowerCase();
  if (c === "pending" || c === "confirmed" || c === "completed" || c === "cancelled" || c === "no_show") {
    return c;
  }
  return "pending";
}

function extractNotes(comment: string): string | undefined {
  const parts = comment.split("\n\n");
  if (parts.length > 1) return parts.slice(1).join("\n\n").trim() || undefined;
  const lines = comment.split("\n").filter((l) => !l.startsWith("Тел:") && !l.startsWith("Филиал:"));
  const rest = lines.join("\n").trim();
  return rest || undefined;
}

function parsePercent(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number.parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function appointmentToRow(a: AppointmentApi): BookingRow {
  const start = a.start_datetime ? new Date(a.start_datetime) : null;
  const date = start ? start.toLocaleDateString("sv-SE") : "";
  const time = start
    ? start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";
  const price = a.service?.price ? Number.parseFloat(String(a.service.price)) : 0;
  const aiProb = parsePercent(a.ai_data?.prediction_probability);
  const aiColorRaw = (a.ai_data?.master_risk_color || "").toLowerCase();
  const aiColor =
    aiColorRaw === "green" || aiColorRaw === "yellow" || aiColorRaw === "red"
      ? (aiColorRaw as "green" | "yellow" | "red")
      : null;
  return {
    id: String(a.id),
    clientName: a.client?.full_name || "—",
    masterName: a.master?.full_name || "—",
    service: a.service?.service_name || "—",
    date,
    time,
    status: statusFromCode(a.status?.status_code),
    price: Number.isFinite(price) ? price : 0,
    notes: extractNotes(a.comment || ""),
    aiProbability: aiProb,
    aiRiskColor: aiColor,
  };
}

export async function fetchAppointments(): Promise<BookingRow[]> {
  const rows = await apiFetch<AppointmentApi[]>("/api/appointments/");
  return Array.isArray(rows) ? rows.map(appointmentToRow) : [];
}

export async function confirmAppointment(id: string) {
  return apiFetch<AppointmentApi>(`/api/appointments/${id}/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export async function cancelAppointment(id: string, comment?: string) {
  return apiFetch<AppointmentApi>(`/api/appointments/${id}/`, {
    method: "DELETE",
    body: comment ? JSON.stringify({ comment }) : undefined,
  });
}
