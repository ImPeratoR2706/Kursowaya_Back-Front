const STORAGE_ACCESS = "sb_access";
const STORAGE_REFRESH = "sb_refresh";

export function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;
  if (fromEnv !== undefined && fromEnv !== "") {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "http://127.0.0.1:8000";
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_ACCESS);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(STORAGE_ACCESS, access);
  localStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(STORAGE_REFRESH);
  if (!refresh) return false;
  const base = getApiBase();
  const url = `${base}/api/auth/refresh/`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = (await res.json()) as { access: string };
  localStorage.setItem(STORAGE_ACCESS, data.access);
  return true;
}

export function parseErrorDetail(text: string): string {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.non_field_errors) && typeof j.non_field_errors[0] === "string") {
      return j.non_field_errors[0];
    }
    const firstKey = Object.keys(j)[0];
    const val = j[firstKey];
    if (Array.isArray(val) && typeof val[0] === "string") return `${firstKey}: ${val[0]}`;
    if (typeof val === "string") return `${firstKey}: ${val}`;
  } catch {
    /* ignore */
  }
  return text || "Ошибка запроса";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const access = localStorage.getItem(STORAGE_ACCESS);
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const doFetch = () => fetch(url, { ...init, headers });

  let res = await doFetch();
  if (res.status === 401 && localStorage.getItem(STORAGE_REFRESH)) {
    const ok = await refreshAccessToken();
    if (ok) {
      headers.set("Authorization", `Bearer ${localStorage.getItem(STORAGE_ACCESS)}`);
      res = await fetch(url, { ...init, headers });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseErrorDetail(text));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const ct = res.headers.get("content-type");
  if (!ct || !ct.includes("application/json")) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * Запрос к API с тем же JWT и обновлением access, что и у {@link apiFetch};
 * возвращает «сырой» {@link Response} — статус и тело обрабатывает вызывающий код.
 */
export async function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const access = localStorage.getItem(STORAGE_ACCESS);
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const doFetch = () => fetch(url, { ...init, headers });

  let res = await doFetch();
  if (res.status === 401 && localStorage.getItem(STORAGE_REFRESH)) {
    const ok = await refreshAccessToken();
    if (ok) {
      headers.set("Authorization", `Bearer ${localStorage.getItem(STORAGE_ACCESS)}`);
      res = await fetch(url, { ...init, headers });
    }
  }

  return res;
}
