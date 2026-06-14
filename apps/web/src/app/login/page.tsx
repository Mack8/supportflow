"use client";

import {
  ApiError,
  apiFetch,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  setStoredUser,
} from "@/lib/api-client";
import type { LoginResponse, User } from "@/types/domain";
import { LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function redirectIfSessionIsValid() {
      if (!getStoredToken()) {
        setCheckingSession(false);
        return;
      }

      try {
        const user = await apiFetch<User>("/auth/me");

        if (!ignore) {
          setStoredUser(user);
          router.replace(getNextPath());
        }
      } catch {
        clearStoredToken();
        if (!ignore) {
          setCheckingSession(false);
        }
      }
    }

    void redirectIfSessionIsValid();

    return () => {
      ignore = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        await apiFetch<User>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
          skipAuth: true,
        });
        setMessage("User registered. You can sign in now.");
        setMode("login");
        return;
      }

      const session = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      setStoredToken(session.accessToken);
      setStoredUser(session.user);
      router.replace(getNextPath());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-2 p-4">
        <div className="text-sm font-semibold text-gray-500">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-2 p-4">
      <section className="w-full max-w-[440px] rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary text-white">
            {mode === "login" ? <LogIn size={24} /> : <UserPlus size={24} />}
          </div>
          <h1 className="text-2xl font-bold text-dark">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Access the support workspace with your assigned account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              required
            />
          </label>

          {error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-md bg-green-light-7 px-3 py-2 text-sm text-green">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setMessage(null);
            }}
            className="font-semibold text-primary"
          >
            {mode === "login" ? "Create an account" : "Back to sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearStoredToken();
              setMessage("Stored session cleared.");
            }}
            className="font-semibold text-gray-500"
          >
            Clear session
          </button>
        </div>
      </section>
    </main>
  );
}

function getNextPath() {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  const next = new URLSearchParams(window.location.search).get("next");

  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return "/dashboard";
}
