import { getAccessToken } from "@/lib/insforge";

const DEFAULT_PROD_API_URL = "https://roadsafe-api-b867ea26-fd8d-4657-a03e-1453777a44d5.fly.dev";

const configuredBaseUrl = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "");
const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const pageIsLocalhost =
  typeof window === "undefined" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_URL = pageIsLocalhost
  ? configuredBaseUrl || "http://localhost:8000"
  : (configuredBaseUrl && !localhostPattern.test(configuredBaseUrl)
    ? configuredBaseUrl
    : DEFAULT_PROD_API_URL);

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type QueryValue = string | number | boolean | null | undefined | string[];

export type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: QueryParams): string {
  const baseUrl =
    API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const url = new URL(
    `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    baseUrl,
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== "") url.searchParams.append(key, item);
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function extractDetail(payload: unknown): { message: string; detail: unknown } {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") return { message: detail, detail };
    if (Array.isArray(detail)) {
      const first = detail[0] as Record<string, unknown> | undefined;
      const location = Array.isArray(first?.loc)
        ? first.loc.filter((part) => part !== "body").join(".")
        : "";
      const reason =
        (typeof first?.msg === "string" && first.msg) ||
        "One or more fields have invalid values.";
      return { message: location ? `${location}: ${reason}` : reason, detail };
    }
    if (detail && typeof detail === "object") {
      const record = detail as Record<string, unknown>;
      const message =
        (typeof record.message === "string" && record.message) ||
        (typeof record.error === "string" && record.error) ||
        "The request could not be completed.";
      return { message, detail };
    }
  }
  return { message: "The request could not be completed.", detail: payload };
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions & {
    params?: QueryParams;
    body?: unknown;
    formData?: FormData;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      "Cannot reach the RoadSafe API. Check that the backend is running and VITE_API_URL is correct.",
      0,
    );
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const { message, detail } = extractDetail(payload);
    throw new ApiError(message, response.status, detail);
  }
  return payload as T;
}

export const api = {
  get<T>(path: string, params?: QueryParams, options?: RequestOptions) {
    return request<T>("GET", path, { ...options, params });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, { ...options, body });
  },
  upload<T>(path: string, formData: FormData, options?: RequestOptions) {
    return request<T>("POST", path, { ...options, formData });
  },
  async download(path: string, params?: QueryParams, options?: RequestOptions) {
    const headers = new Headers();
    if (options?.auth) {
      const token = await getAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(buildUrl(path, params), { headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const { message, detail } = extractDetail(payload);
      throw new ApiError(message, response.status, detail);
    }
    return response.blob();
  },
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
