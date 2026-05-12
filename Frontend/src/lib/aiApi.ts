import { apiFetch } from "@/lib/api";

export type NoShowModelInfo = {
  is_trained: boolean;
  model_type: string;
  model_version?: string;
  trained_at?: string;
  feature_names: string[];
  cat_features?: string[];
  validation_accuracy?: number;
  n_samples?: number;
  positive_class_is_no_show?: boolean;
};

export type AiTrainingRun = {
  id: number;
  created_at: string;
  created_by: { id: number; username: string; full_name?: string; email?: string; role?: unknown } | null;
  model_version: string;
  threshold: string | number;
  n_samples: number;
  n_positive: number;
  accuracy: string | number | null;
  precision: string | number | null;
  recall: string | number | null;
  f1: string | number | null;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  notes: string;
};

export type AidataApi = {
  id: number;
  appointment_id: number;
  input_features: Record<string, unknown>;
  target_value: number | null;
  prediction_probability: string; // ex: "12.34%"
  admin_recommendation: string;
  master_risk_color: string; // "green" | "yellow" | "red"
  inference_time_ms: string | number | null;
  model_version: string;
  created_at: string;
};

export type NoShowPredictionResponse = {
  appointment_id: number;
  prediction_probability: string; // ex: "12.34%"
  admin_recommendation: string;
  master_risk_color: string;
  inference_time_ms?: string | number | null;
  model_version: string;
  input_features: Record<string, unknown>;
  target_value?: number | null;
};

export async function fetchNoShowModelInfo(): Promise<NoShowModelInfo> {
  return apiFetch<NoShowModelInfo>("/api/ai/model-info/");
}

export async function fetchAiTrainingRuns(): Promise<AiTrainingRun[]> {
  return apiFetch<AiTrainingRun[]>("/api/ai-training-runs/");
}

export async function runAiTraining(params?: { threshold?: number; notes?: string }): Promise<AiTrainingRun> {
  const raw = params?.threshold ?? 0.5;
  const parsed = typeof raw === "number" ? raw : Number.parseFloat(String(raw).replace(",", "."));
  const thr = Number.isFinite(parsed) ? Math.min(0.99, Math.max(0.01, parsed)) : 0.5;
  return apiFetch<AiTrainingRun>("/api/ai-training-runs/run/", {
    method: "POST",
    body: JSON.stringify({
      threshold: thr,
      notes: params?.notes ?? "",
    }),
  });
}

export async function fetchAllAiData(): Promise<AidataApi[]> {
  return apiFetch<AidataApi[]>("/api/ai-data/");
}

export async function fetchAiDataForAppointment(appointmentId: string | number): Promise<AidataApi | null> {
  const list = await apiFetch<AidataApi[]>(`/api/ai-data/?appointment_id=${appointmentId}`);
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0] ?? null;
}

export async function predictNoShowForAppointment(appointmentId: string | number): Promise<NoShowPredictionResponse> {
  return apiFetch<NoShowPredictionResponse>(`/api/appointments/${appointmentId}/predict-no-show/`, {
    method: "POST",
    body: "{}",
  });
}

export function parsePercent(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number.parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

