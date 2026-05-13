import { apiFetch, apiRequest, parseErrorDetail } from "@/lib/api";

export type ServiceDto = {
  id: number;
  service_name: string;
  duration_minutes: number;
  price: string;
  category: string;
};

export type ServiceWritePayload = {
  service_name: string;
  duration_minutes: number;
  price: string;
  category: string;
};

export async function fetchServices(): Promise<ServiceDto[]> {
  return apiFetch<ServiceDto[]>("/api/services/");
}

export async function createService(body: ServiceWritePayload): Promise<ServiceDto> {
  return apiFetch<ServiceDto>("/api/services/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateService(id: number, body: Partial<ServiceWritePayload>): Promise<ServiceDto> {
  return apiFetch<ServiceDto>(`/api/services/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** 409 от API: у услуги есть записи, нужен повторный DELETE с confirm. */
export class ServiceDeleteConflictError extends Error {
  readonly appointmentsLinked: number;

  constructor(message: string, appointmentsLinked: number) {
    super(message);
    this.name = "ServiceDeleteConflictError";
    this.appointmentsLinked = appointmentsLinked;
  }
}

/**
 * Удалить услугу. Без `confirmed` при наличии визитов вернётся 409 → {@link ServiceDeleteConflictError}.
 * С `confirmed: true` удаляются все связанные записи (визиты), затем услуга.
 */
export async function deleteService(id: number, confirmed = false): Promise<void> {
  const path = confirmed ? `/api/services/${id}/?confirm=1` : `/api/services/${id}/`;
  const res = await apiRequest(path, { method: "DELETE" });
  if (res.status === 409) {
    const data = (await res.json()) as { detail?: string; appointments_linked?: number };
    throw new ServiceDeleteConflictError(
      typeof data.detail === "string" ? data.detail : "Требуется подтверждение удаления",
      Number(data.appointments_linked) || 0,
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseErrorDetail(text));
  }
}
