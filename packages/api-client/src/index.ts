export * from "./types";

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export class ApiError extends Error {
  status: number;
  code: string;
  feature?: string;

  constructor(status: number, code: string, message: string, feature?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.feature = feature;
  }
}

export interface ApiFetchOptions extends RequestInit {
  /** Stable idempotency key for a logical mutation; generated automatically for POST/PATCH if omitted. */
  idempotencyKey?: string;
}

/**
 * Browser BFF API fetch client with automatic deduplicated 401 refresh & retry.
 */
export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { idempotencyKey, ...requestInit } = init ?? {};
  const method = (requestInit.method ?? "GET").toUpperCase();
  const isMutating = method === "POST" || method === "PATCH";
  const isMultipart = typeof FormData !== "undefined" && requestInit.body instanceof FormData;

  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !isMultipart && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isMutating && !isMultipart && !headers.has("Idempotency-Key")) {
    const key =
      idempotencyKey ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : undefined);
    if (key) {
      headers.set("Idempotency-Key", key);
    }
  }

  const execute = () =>
    fetch(path, {
      ...requestInit,
      credentials: "same-origin",
      headers,
    });

  let response = await execute();

  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await execute();
    } else if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    let payload: { code?: string; message?: string; feature?: string } = {};
    try {
      payload = await response.json();
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(
      response.status,
      payload.code ?? `HTTP_${response.status}`,
      payload.message ?? response.statusText,
      payload.feature
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
