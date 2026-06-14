"use client";

import {
  ApiError,
  apiFetch,
  clearStoredToken,
  setStoredToken,
  setStoredUser,
} from "@/lib/api-client";
import type { LoginResponse, User } from "@/types/domain";
import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("Password123");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setMessage(`Signed in as ${session.user.email}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
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
            Use this page for real JWT testing. Local development can still use
            protected screens without a token while auth bypass is enabled.
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
              setMessage("Stored token cleared.");
            }}
            className="font-semibold text-gray-500"
          >
            Clear token
          </button>
        </div>

        <Link
          href="/dashboard"
          className="mt-6 flex h-10 items-center justify-center rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Continue to dashboard
        </Link>
      </section>
    </main>
  );
}
