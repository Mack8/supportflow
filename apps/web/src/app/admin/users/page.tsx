"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { User } from "@/types/domain";
import { PowerOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      setUsers(await apiFetch<User[]>("/users"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(id: string) {
    if (!window.confirm("Deactivate this user?")) {
      return;
    }

    try {
      await apiFetch<User>(`/users/${id}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate user");
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialUsers() {
      try {
        const data = await apiFetch<User[]>("/users");

        if (!ignore) {
          setUsers(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Could not load users");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitialUsers();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AppShell>
      <PageHeading
        title="Users"
        description="Review user status and roles. Role changes are intentionally handled in the API roadmap."
      />

      {loading ? <LoadingState label="Loading users" /> : null}
      {error ? <ErrorState message={error} onRetry={loadUsers} /> : null}

      {!loading && !error ? (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-dark">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className="bg-blue-50 text-blue-700 ring-blue-200">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        className={
                          user.isActive
                            ? "bg-green-light-7 text-green ring-green/20"
                            : "bg-gray-100 text-gray-600 ring-gray-200"
                        }
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => deactivate(user.id)}
                        disabled={!user.isActive}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PowerOff size={16} />
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
