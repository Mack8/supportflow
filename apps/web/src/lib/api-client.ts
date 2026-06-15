import type { User } from "@/types/domain";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const AUTH_TOKEN_KEY = "supportflow_token";
const AUTH_USER_KEY = "supportflow_user";

export const AUTH_CHANGE_EVENT = "supportflow_auth_changed";

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  notifyAuthChanged();
}

export function clearStoredToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  notifyAuthChanged();
}

export function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as User;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setStoredUser(user: User) {
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getStoredToken();

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? Array.isArray(data.message)
          ? data.message.join(", ")
          : String(data.message)
        : "API request failed";

    if (response.status === 401 && !options.skipAuth) {
      clearStoredToken();
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
