"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { CategoryBadge, PriorityBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { apiFetch } from "@/lib/api-client";
import { categoryLabel } from "@/lib/format";
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  User,
} from "@/types/domain";
import {
  ClipboardList,
  Clock3,
  FileText,
  Send,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const categoryPriority: Record<TicketCategory, TicketPriority> = {
  INCIDENT: "URGENT",
  TECHNICAL: "HIGH",
  BILLING: "MEDIUM",
  ACCOUNT: "MEDIUM",
  GENERAL: "MEDIUM",
  FEATURE_REQUEST: "LOW",
};

const priorityTarget: Record<TicketPriority, string> = {
  URGENT: "4 hours",
  HIGH: "24 hours",
  MEDIUM: "48 hours",
  LOW: "5 days",
};

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [createdById, setCreatedById] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requesters, setRequesters] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const computedPriority = useMemo(() => categoryPriority[category], [category]);
  const canCreateOnBehalf =
    currentUser?.role === "ADMIN" || currentUser?.role === "AGENT";
  const selectedRequester = requesters.find((user) => user.id === createdById);
  const requesterName = canCreateOnBehalf
    ? selectedRequester?.name ?? "Select requester"
    : currentUser?.name ?? "Current user";

  useEffect(() => {
    let ignore = false;

    async function loadRequesterContext() {
      try {
        const user = await apiFetch<User>("/auth/me");

        if (ignore) {
          return;
        }

        setCurrentUser(user);

        if (user.role !== "ADMIN" && user.role !== "AGENT") {
          setCreatedById(user.id);
          return;
        }

        const users = await apiFetch<User[]>("/users/requesters");

        if (ignore) {
          return;
        }

        setRequesters(users);
        setCreatedById(users[0]?.id ?? "");
        if (users.length === 0) {
          setError("No active requesters available.");
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Could not load user");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadRequesterContext();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const requesterId = canCreateOnBehalf ? createdById : currentUser?.id;

      if (!requesterId) {
        setError("Requester is required.");
        return;
      }

      const ticket = await apiFetch<Ticket>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category,
          createdById: requesterId,
        }),
      });

      router.push(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeading
        title="New ticket"
        description="Open a support request with the information the service desk needs to triage it."
      />

      {loading ? <LoadingState label="Loading requester" /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          {error ? <ErrorState message={error} /> : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {canCreateOnBehalf ? (
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <UserRound size={17} />
                  Requester
                </span>
                <select
                  value={createdById}
                  onChange={(event) => setCreatedById(event.target.value)}
                  className="h-12 w-full rounded-md border border-gray-300 px-3 text-base outline-none focus:border-primary"
                  required
                >
                  {requesters.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <ClipboardList size={17} />
                Subject
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-12 w-full rounded-md border border-gray-300 px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText size={17} />
                Category
              </span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as TicketCategory)
                }
                className="h-12 w-full rounded-md border border-gray-300 px-3 text-base outline-none focus:border-primary"
              >
                {Object.entries(categoryLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={11}
                className="w-full resize-y rounded-md border border-gray-300 px-3 py-3 text-base leading-7 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                required
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !createdById}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={18} />
                {saving ? "Creating..." : "Create ticket"}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-dark">Ticket summary</h2>
            <div className="space-y-4">
              <SummaryRow
                icon={<UserRound size={18} />}
                label="Requester"
                value={requesterName}
              />
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                  Category
                </div>
                <CategoryBadge category={category} />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                  Priority
                </div>
                <PriorityBadge priority={computedPriority} />
              </div>
              <SummaryRow
                icon={<Clock3 size={18} />}
                label="Target"
                value={priorityTarget[computedPriority]}
              />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-dark">Assignment</h2>
            <SummaryRow
              icon={<UserRound size={18} />}
              label="Owner"
              value="Service desk queue"
            />
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-gray-100 p-2 text-gray-600">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold uppercase text-gray-500">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-dark">{value}</div>
      </div>
    </div>
  );
}
