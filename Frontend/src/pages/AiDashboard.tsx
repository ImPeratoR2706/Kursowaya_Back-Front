import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { BarChart3, Brain, History, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchAiTrainingRuns,
  fetchAllAiData,
  fetchNoShowModelInfo,
  parsePercent,
  runAiTraining,
  type AiTrainingRun,
} from "@/lib/aiApi";

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** API хранит accuracy/precision как долю 0..1 */
function formatFractionMetric(v: unknown): string {
  const n = toNum(v);
  if (n === null) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

function shortDt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const AiDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canSeeAi = user?.role === "admin";
  const [threshold, setThreshold] = useState("0.50");
  const [notes, setNotes] = useState("");

  const { data: modelInfo } = useQuery({
    queryKey: ["ai", "model-info"],
    queryFn: fetchNoShowModelInfo,
    enabled: canSeeAi,
    staleTime: 60_000,
  });

  const { data: runs } = useQuery({
    queryKey: ["ai", "training-runs"],
    queryFn: fetchAiTrainingRuns,
    enabled: canSeeAi,
  });

  const { data: allAi } = useQuery({
    queryKey: ["ai", "ai-data-all"],
    queryFn: fetchAllAiData,
    enabled: canSeeAi,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const t = Number.parseFloat(String(threshold).replace(",", "."));
      const tt = Number.isFinite(t) ? Math.min(0.99, Math.max(0.01, t)) : 0.5;
      return runAiTraining({ threshold: tt, notes });
    },
    onSuccess: async () => {
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["ai", "training-runs"] });
    },
  });

  const labeledAidataCount = useMemo(
    () => (allAi ?? []).filter((r) => r.target_value !== null && r.target_value !== undefined).length,
    [allAi],
  );

  const metricsSeries = useMemo(() => {
    const list = (runs ?? []).slice().reverse();
    return list.map((r) => ({
      at: shortDt(r.created_at),
      accuracy: toNum(r.accuracy),
      precision: toNum(r.precision),
      recall: toNum(r.recall),
      f1: toNum(r.f1),
      n: r.n_samples,
      threshold: toNum(r.threshold),
    }));
  }, [runs]);

  const lastRun = (runs ?? [])[0] ?? null;

  const confusionBars = useMemo(() => {
    if (!lastRun) return null;
    return [
      { name: "TP", value: lastRun.tp },
      { name: "FP", value: lastRun.fp },
      { name: "TN", value: lastRun.tn },
      { name: "FN", value: lastRun.fn },
    ];
  }, [lastRun]);

  const riskPie = useMemo(() => {
    const items = allAi ?? [];
    let green = 0;
    let yellow = 0;
    let red = 0;
    for (const row of items) {
      const c = (row.master_risk_color || "").toLowerCase();
      if (c === "green") green += 1;
      else if (c === "yellow") yellow += 1;
      else if (c === "red") red += 1;
    }
    const total = green + yellow + red;
    return [
      { name: "Низкий (green)", value: green, total, fill: "#22c55e" },
      { name: "Средний (yellow)", value: yellow, total, fill: "#eab308" },
      { name: "Высокий (red)", value: red, total, fill: "#ef4444" },
    ];
  }, [allAi]);

  const probabilities = useMemo(() => {
    const items = allAi ?? [];
    const buckets = [
      { label: "0–10%", from: 0, to: 10, value: 0 },
      { label: "10–25%", from: 10, to: 25, value: 0 },
      { label: "25–50%", from: 25, to: 50, value: 0 },
      { label: "50–75%", from: 50, to: 75, value: 0 },
      { label: "75–100%", from: 75, to: 100, value: 0 },
    ];
    for (const row of items) {
      const p = parsePercent(row.prediction_probability);
      if (p === null) continue;
      const b = buckets.find((x) => p >= x.from && p < x.to) ?? buckets[buckets.length - 1];
      b.value += 1;
    }
    return buckets;
  }, [allAi]);

  if (!canSeeAi) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-foreground uppercase italic">AI-панель</h1>
        <p className="text-muted-foreground font-body text-sm mt-2">Доступна только для роли администратор.</p>
        <Link to="/dashboard" className="text-primary hover:underline text-sm font-body mt-4 inline-block">
          Вернуться в панель
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground uppercase italic flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" /> AI-панель
          </h1>
        </div>
        <Link
          to="/dashboard"
          className="border border-primary/50 text-primary text-xs font-heading uppercase tracking-wider px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-all"
        >
          В кабинет
        </Link>
      </div>

      {labeledAidataCount === 0 && (
        <div className="border border-amber-500/40 bg-amber-500/10 text-foreground font-body text-sm px-4 py-3 rounded-sm">
          Метрики «Запустить» считаются только по записям <strong>Aidata</strong> с полем{" "}
          <strong>target_value</strong> (факт неявки). Сейчас размеченных строк нет — поэтому{" "}
          <strong>N = 0</strong> и пустые ACC/F1. Выполните на backend:{" "}
          <code className="text-xs bg-secondary/80 px-1 py-0.5 rounded">python manage.py seed_demo_data</code>{" "}
          (создаёт демо-разметку, если её ещё мало) или{" "}
          <code className="text-xs bg-secondary/80 px-1 py-0.5 rounded">python manage.py generate_ai_tests</code>
          .
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-border/40 p-6">
          <p className="text-foreground font-heading uppercase tracking-wider text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Модель
          </p>
          <div className="mt-3 space-y-2">
            <p className="text-muted-foreground text-xs font-body">
              Тип: <span className="text-foreground">{modelInfo?.model_type || "—"}</span>
            </p>
            <p className="text-muted-foreground text-xs font-body">
              Версия: <span className="text-foreground">{modelInfo?.model_version || "—"}</span>
            </p>
            <p className="text-muted-foreground text-xs font-body">
              Статус:{" "}
              <span className="text-foreground">{modelInfo?.is_trained ? "обучена (файл модели найден)" : "не обучена / файл модели отсутствует"}</span>
            </p>
            <p className="text-muted-foreground text-xs font-body">
              Trained at: <span className="text-foreground">{modelInfo?.trained_at || "—"}</span>
            </p>
            <p className="text-muted-foreground text-xs font-body">
              Features: <span className="text-foreground">{modelInfo?.feature_names?.length ?? 0}</span>
            </p>
          </div>
        </div>

        <div className="border border-border/40 p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-foreground font-heading uppercase tracking-wider text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> История обучения/оценки
            </p>
            <button
              type="button"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="flex items-center gap-2 border border-primary/50 text-primary text-xs font-heading uppercase tracking-wider px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
              title="Сохранить новый запуск в историю (на размеченных данных target_value)"
            >
              <RefreshCw className="w-3 h-3" />
              {runMutation.isPending ? "Запуск…" : "Запустить"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
                Порог (0.01 … 0.99)
              </label>
              <input
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                placeholder="0.50"
                inputMode="decimal"
                title="Класс «неявка», если p ≥ порог (после согласования с разметкой метрики стабильны)"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">Комментарий к запуску</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                placeholder="например: оценка на данных за месяц"
              />
            </div>
          </div>

          {runMutation.isError && (
            <p className="text-destructive text-sm font-body mt-3">
              {runMutation.error instanceof Error ? runMutation.error.message : "Не удалось выполнить запуск"}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border/40 p-6">
          <p className="text-foreground font-heading uppercase tracking-wider text-sm">Метрики качества по запускам</p>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="at" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: unknown) => [formatFractionMetric(v), ""]} />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" dot={false} />
                <Line type="monotone" dataKey="precision" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="recall" stroke="#eab308" dot={false} />
                <Line type="monotone" dataKey="f1" stroke="#ef4444" dot={false} />
                <Line type="monotone" dataKey="threshold" stroke="#94a3b8" dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-muted-foreground text-xs font-body mt-3">
            Последний запуск:{" "}
            <span className="text-foreground">
              {lastRun ? `${shortDt(lastRun.created_at)} • n=${lastRun.n_samples} • thr=${lastRun.threshold}` : "—"}
            </span>
          </p>
        </div>

        <div className="border border-border/40 p-6">
          <p className="text-foreground font-heading uppercase tracking-wider text-sm">Confusion matrix (последний запуск)</p>
          <div className="h-[280px] mt-4">
            {confusionBars ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confusionBars}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground font-body text-sm">Запусков ещё нет. Нажмите «Запустить».</p>
            )}
          </div>
          {lastRun && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-body text-muted-foreground">
              <div>
                Accuracy: <span className="text-foreground">{formatFractionMetric(lastRun.accuracy)}</span>
              </div>
              <div>
                F1: <span className="text-foreground">{formatFractionMetric(lastRun.f1)}</span>
              </div>
              <div>
                Precision: <span className="text-foreground">{formatFractionMetric(lastRun.precision)}</span>
              </div>
              <div>
                Recall: <span className="text-foreground">{formatFractionMetric(lastRun.recall)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border/40 p-6">
          <p className="text-foreground font-heading uppercase tracking-wider text-sm">Распределение риска (по AI-данным)</p>
          <div className="h-[260px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={riskPie} dataKey="value" nameKey="name" outerRadius={90}>
                  {riskPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-muted-foreground text-xs font-body mt-3">
            Всего AI-расчётов: <span className="text-foreground">{(allAi ?? []).length}</span>
          </p>
        </div>

        <div className="border border-border/40 p-6">
          <p className="text-foreground font-heading uppercase tracking-wider text-sm">Гистограмма вероятностей no-show</p>
          <div className="h-[260px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probabilities}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-muted-foreground text-xs font-body mt-3">
            Источник: сохранённые записи `Aidata` (после нажатия «Рассчитать» в карточке записи).
          </p>
        </div>
      </div>

      <div className="border border-border/40 p-6">
        <p className="text-foreground font-heading uppercase tracking-wider text-sm">Последние запуски</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead className="text-muted-foreground text-xs uppercase tracking-wider">
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-3">Дата</th>
                <th className="text-left py-2 pr-3">n</th>
                <th className="text-left py-2 pr-3">thr</th>
                <th className="text-left py-2 pr-3">acc</th>
                <th className="text-left py-2 pr-3">f1</th>
                <th className="text-left py-2 pr-3">комментарий</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {(runs ?? []).slice(0, 10).map((r: AiTrainingRun) => (
                <tr key={r.id} className="border-b border-border/20">
                  <td className="py-2 pr-3 whitespace-nowrap">{shortDt(r.created_at)}</td>
                  <td className="py-2 pr-3">{r.n_samples}</td>
                  <td className="py-2 pr-3">{String(r.threshold)}</td>
                  <td className="py-2 pr-3">{formatFractionMetric(r.accuracy)}</td>
                  <td className="py-2 pr-3">{formatFractionMetric(r.f1)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.notes || "—"}</td>
                </tr>
              ))}
              {(runs ?? []).length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={6}>
                    История пустая. Нажмите «Запустить», чтобы добавить первый запуск.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AiDashboard;

