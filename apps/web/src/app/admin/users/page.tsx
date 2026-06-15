"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Role, User } from "@/types/domain";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

type UserDraft = Pick<User, "name" | "email" | "role" | "isActive">;

const roles: Role[] = ["USER", "AGENT", "ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await apiFetch<User[]>("/users");
      setUsers(data);
      setDrafts(createDrafts(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(user: User) {
    const draft = drafts[user.id];

    if (!draft || !isDirty(user, draft)) {
      return;
    }

    setSavingId(user.id);
    setError(null);
    setMessage(null);

    try {
      await apiFetch<User>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      await loadUsers();
      setMessage(`${draft.name} updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialUsers() {
      try {
        const data = await apiFetch<User[]>("/users");

        if (!ignore) {
          setUsers(data);
          setDrafts(createDrafts(data));
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
        description="Manage support roles, account status and identity details for the workspace."
      />

      {loading ? <LoadingState label="Loading users" /> : null}
      {error ? <ErrorState message={error} onRetry={loadUsers} /> : null}
      {message ? (
        <div className="mb-4 rounded-lg border border-green/20 bg-green-light-7 p-4 text-sm font-semibold text-green">
          {message}
        </div>
      ) : null}

      {!loading && !error ? (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const draft = drafts[user.id] ?? toDraft(user);
                  const dirty = isDirty(user, draft);
                  const saving = savingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            setDraft(user.id, { name: event.target.value })
                          }
                          className="h-10 w-full min-w-[180px] rounded-md border border-gray-300 px-3 text-sm font-semibold text-dark outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="email"
                          value={draft.email}
                          onChange={(event) =>
                            setDraft(user.id, { email: event.target.value })
                          }
                          className="h-10 w-full min-w-[230px] rounded-md border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={draft.role}
                          onChange={(event) =>
                            setDraft(user.id, {
                              role: event.target.value as Role,
                            })
                          }
                          className="h-10 min-w-[130px] rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 outline-none focus:border-primary"
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <label className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(event) =>
                              setDraft(user.id, {
                                isActive: event.target.checked,
                              })
                            }
                            className="size-4 rounded border-gray-300"
                          />
                          {draft.isActive ? "Active" : "Inactive"}
                        </label>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {dirty ? (
                            <Badge className="bg-yellow-50 text-yellow-800 ring-yellow-200">
                              Unsaved
                            </Badge>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setDraft(user.id, toDraft(user), true)
                            }
                            disabled={!dirty || saving}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw size={16} />
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => saveUser(user)}
                            disabled={!dirty || saving}
                            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save size={16} />
                            {saving ? "Saving" : "Save"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );

  function setDraft(id: string, patch: Partial<UserDraft>, replace = false) {
    setDrafts((current) => ({
      ...current,
      [id]: replace
        ? (patch as UserDraft)
        : {
            ...(current[id] ?? toDraft(users.find((user) => user.id === id)!)),
            ...patch,
          },
    }));
  }
}

function createDrafts(users: User[]): Record<string, UserDraft> {
  return Object.fromEntries(users.map((user) => [user.id, toDraft(user)]));
}

function toDraft(user: User): UserDraft {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

function isDirty(user: User, draft: UserDraft) {
  return (
    user.name !== draft.name ||
    user.email !== draft.email ||
    user.role !== draft.role ||
    user.isActive !== draft.isActive
  );
}
