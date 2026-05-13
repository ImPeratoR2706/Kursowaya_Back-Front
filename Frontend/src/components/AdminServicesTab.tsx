import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createService,
  deleteService,
  fetchServices,
  ServiceDeleteConflictError,
  type ServiceDto,
  type ServiceWritePayload,
  updateService,
} from "@/lib/servicesApi";

const emptyForm: ServiceWritePayload = {
  service_name: "",
  duration_minutes: 60,
  price: "1500.00",
  category: "",
};

function formatPriceInput(v: string): string {
  const t = v.replace(",", ".").trim();
  if (!t) return "";
  const n = Number.parseFloat(t);
  if (Number.isNaN(n)) return t;
  return n.toFixed(2);
}

const AdminServicesTab = () => {
  const queryClient = useQueryClient();
  const [newRow, setNewRow] = useState<ServiceWritePayload>({ ...emptyForm, category: "Услуга" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ServiceWritePayload>(emptyForm);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: services = [], isError, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: fetchServices,
  });

  const sorted = useMemo(() => [...services].sort((a, b) => a.service_name.localeCompare(b.service_name, "ru")), [services]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  const createMut = useMutation({
    mutationFn: (body: ServiceWritePayload) => createService(body),
    onSuccess: () => {
      invalidate();
      setNewRow({ ...emptyForm, category: "Услуга" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: ServiceWritePayload }) => updateService(id, body),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const startEdit = (s: ServiceDto) => {
    setEditingId(s.id);
    setEditDraft({
      service_name: s.service_name,
      duration_minutes: s.duration_minutes,
      price: String(s.price),
      category: s.category || "",
    });
  };

  const handleDelete = async (s: ServiceDto) => {
    setDeleteError(null);
    setDeletingId(s.id);
    try {
      await deleteService(s.id, false);
      invalidate();
    } catch (e) {
      if (e instanceof ServiceDeleteConflictError && e.appointmentsLinked > 0) {
        const ok = window.confirm(
          `${e.message}\n\nУдалить услугу «${s.service_name}» и все ${e.appointmentsLinked} связанных записей (визитов)? Это действие необратимо.`,
        );
        if (ok) {
          try {
            await deleteService(s.id, true);
            invalidate();
          } catch (e2) {
            setDeleteError(e2 instanceof Error ? e2.message : "Не удалось удалить услугу.");
          }
        }
      } else {
        setDeleteError(e instanceof Error ? e.message : "Не удалось удалить услугу.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRow.service_name.trim();
    if (name.length < 2) return;
    const price = formatPriceInput(newRow.price);
    if (!price || Number.parseFloat(price) <= 0) return;
    createMut.mutate({
      ...newRow,
      service_name: name,
      price,
      category: (newRow.category || "Услуга").trim(),
    });
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId == null) return;
    const name = editDraft.service_name.trim();
    if (name.length < 2) return;
    const price = formatPriceInput(editDraft.price);
    if (!price || Number.parseFloat(price) <= 0) return;
    updateMut.mutate({
      id: editingId,
      body: {
        ...editDraft,
        service_name: name,
        price,
        category: (editDraft.category || "Услуга").trim(),
      },
    });
  };

  const err =
    createMut.error instanceof Error
      ? createMut.error.message
      : updateMut.error instanceof Error
        ? updateMut.error.message
        : null;

  return (
    <div className="space-y-6">
      {isError && <p className="text-destructive text-sm">Не удалось загрузить услуги.</p>}
      {deleteError && <p className="text-destructive text-sm">{deleteError}</p>}
      {err && <p className="text-destructive text-sm">{err}</p>}

      <form
        onSubmit={submitNew}
        className="border border-border/30 p-4 space-y-3 bg-secondary/10"
      >
        <p className="text-sm font-heading uppercase tracking-wider text-primary">Новая услуга</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs text-muted-foreground font-body">
            Название
            <input
              required
              minLength={2}
              maxLength={150}
              className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm text-foreground rounded"
              value={newRow.service_name}
              onChange={(e) => setNewRow((r) => ({ ...r, service_name: e.target.value }))}
            />
          </label>
          <label className="block text-xs text-muted-foreground font-body">
            Длительность (мин)
            <input
              required
              type="number"
              min={1}
              max={1440}
              className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm text-foreground rounded"
              value={newRow.duration_minutes}
              onChange={(e) => setNewRow((r) => ({ ...r, duration_minutes: Number(e.target.value) || 1 }))}
            />
          </label>
          <label className="block text-xs text-muted-foreground font-body">
            Цена (₽)
            <input
              required
              className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm text-foreground rounded"
              value={newRow.price}
              onChange={(e) => setNewRow((r) => ({ ...r, price: e.target.value }))}
            />
          </label>
          <label className="block text-xs text-muted-foreground font-body">
            Категория
            <input
              maxLength={120}
              className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm text-foreground rounded"
              value={newRow.category}
              onChange={(e) => setNewRow((r) => ({ ...r, category: e.target.value }))}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={createMut.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </form>

      <div className="border border-border/30 overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Загрузка…</p>
        ) : (
          <table className="w-full text-sm font-body min-w-[640px]">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left p-3">Название</th>
                <th className="text-left p-3 w-28">Мин</th>
                <th className="text-left p-3 w-32">Цена</th>
                <th className="text-left p-3">Категория</th>
                <th className="text-right p-3 min-w-[10rem]">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) =>
                editingId === s.id ? (
                  <tr key={s.id} className="border-b border-border/10 bg-secondary/20">
                    <td colSpan={5} className="p-3">
                      <form onSubmit={submitEdit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                        <label className="block text-xs text-muted-foreground">
                          Название
                          <input
                            required
                            minLength={2}
                            className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm rounded"
                            value={editDraft.service_name}
                            onChange={(e) => setEditDraft((d) => ({ ...d, service_name: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Минуты
                          <input
                            required
                            type="number"
                            min={1}
                            max={1440}
                            className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm rounded"
                            value={editDraft.duration_minutes}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, duration_minutes: Number(e.target.value) || 1 }))
                            }
                          />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Цена
                          <input
                            required
                            className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm rounded"
                            value={editDraft.price}
                            onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                          />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Категория
                          <input
                            maxLength={120}
                            className="mt-1 w-full bg-background border border-border/40 px-2 py-1.5 text-sm rounded"
                            value={editDraft.category}
                            onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))}
                          />
                        </label>
                        <div className="flex gap-2 sm:col-span-2 lg:col-span-4 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border/40 hover:bg-secondary/50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Отмена
                          </button>
                          <button
                            type="submit"
                            disabled={updateMut.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground disabled:opacity-50"
                          >
                            Сохранить
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-border/10 hover:bg-secondary/20">
                    <td className="p-3 text-foreground">{s.service_name}</td>
                    <td className="p-3 text-muted-foreground">{s.duration_minutes}</td>
                    <td className="p-3 text-muted-foreground">
                      {Number.parseFloat(String(s.price)).toLocaleString("ru-RU", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ₽
                    </td>
                    <td className="p-3 text-muted-foreground">{s.category || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(s)}
                          disabled={deletingId === s.id}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                          title="Удалить услугу"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminServicesTab;
