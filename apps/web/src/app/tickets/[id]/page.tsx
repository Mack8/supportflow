"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { apiFetch } from "@/lib/api-client";
import {
  categoryLabel,
  formatDate,
  formatDateInputValue,
  isTicketOverdue,
  statusLabel,
  toIsoFromDateInput,
} from "@/lib/format";
import type {
  Comment,
  Ticket,
  TicketCategory,
  TicketStatus,
  User,
} from "@/types/domain";
import { CalendarClock, MessageSquare, Save } from "lucide-react";
import { useParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<TicketStatus>("OPEN");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [resolution, setResolution] = useState("");
  const [content, setContent] = useState("");
  const [userId, setUserId] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncTicketForm = useCallback((ticketData: Ticket) => {
    setStatus(ticketData.status);
    setCategory(ticketData.category);
    setAssignedToId(ticketData.assignedToId ?? "");
    setDueAt(formatDateInputValue(ticketData.dueAt));
    setResolution(ticketData.resolution ?? "");
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [ticketData, commentData, userData] = await Promise.all([
        apiFetch<Ticket>(`/tickets/${ticketId}`),
        apiFetch<Comment[]>(`/comments?ticketId=${ticketId}`),
        apiFetch<User[]>("/users"),
      ]);
      setTicket(ticketData);
      setComments(commentData);
      setUsers(userData);
      syncTicketForm(ticketData);
      setUserId(ticketData.createdById);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ticket");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const [ticketData, commentData, userData] = await Promise.all([
          apiFetch<Ticket>(`/tickets/${ticketId}`),
          apiFetch<Comment[]>(`/comments?ticketId=${ticketId}`),
          apiFetch<User[]>("/users"),
        ]);

        if (!ignore) {
          setTicket(ticketData);
          setComments(commentData);
          setUsers(userData);
          syncTicketForm(ticketData);
          setUserId(ticketData.createdById);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Could not load ticket");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      ignore = true;
    };
  }, [syncTicketForm, ticketId]);

  async function updateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await apiFetch<Ticket>(`/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          category,
          dueAt: dueAt ? toIsoFromDateInput(dueAt) : null,
          resolution: resolution.trim() || null,
          assignedToId: assignedToId || null,
        }),
      });
      setTicket(updated);
      syncTicketForm(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update ticket");
    } finally {
      setSaving(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiFetch<Comment>("/comments", {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          userId,
          content,
          isInternal,
        }),
      });
      setContent("");
      setIsInternal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add comment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {loading ? <LoadingState label="Loading ticket" /> : null}
      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      {ticket ? (
        <>
          <PageHeading
            title={ticket.title}
            description={`Created by ${ticket.createdBy?.name ?? "Unknown"} on ${formatDate(ticket.createdAt)}`}
          />

          <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SummaryPanel label="Status">
              <StatusBadge status={ticket.status} />
            </SummaryPanel>
            <SummaryPanel label="Priority">
              <PriorityBadge priority={ticket.priority} />
            </SummaryPanel>
            <SummaryPanel label="Category">
              <CategoryBadge category={ticket.category} />
            </SummaryPanel>
            <InfoPanel
              label="Assigned"
              value={ticket.assignedTo?.name ?? "Service desk queue"}
            />
            <InfoPanel label="Due date" value={formatDate(ticket.dueAt)} />
          </section>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <section className="space-y-5">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap gap-2">
                  {isTicketOverdue(ticket) ? (
                    <span className="inline-flex h-7 items-center gap-1 rounded-md bg-red-50 px-2.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                      <CalendarClock size={14} />
                      Overdue
                    </span>
                  ) : null}
                </div>
                <h2 className="mb-3 text-lg font-bold text-dark">
                  Description
                </h2>
                <p className="whitespace-pre-wrap text-base leading-7 text-gray-700">
                  {ticket.description}
                </p>
                {ticket.resolution ? (
                  <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
                    <h2 className="mb-2 text-sm font-bold text-green-800">
                      Resolution
                    </h2>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-green-900">
                      {ticket.resolution}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <InfoPanel
                  label="Last status change"
                  value={formatDate(ticket.lastStatusChangeAt)}
                />
                <InfoPanel
                  label="Resolved"
                  value={formatDate(ticket.resolvedAt)}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <MessageSquare size={20} />
                  Comments
                </h2>
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <article
                      key={comment.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-dark">
                          {comment.user?.name ?? "Unknown user"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-gray-700">
                        {comment.content}
                      </p>
                      {comment.isInternal ? (
                        <div className="mt-2 text-xs font-semibold text-yellow-700">
                          Internal note
                        </div>
                      ) : null}
                    </article>
                  ))}
                  {comments.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-500">
                      No comments yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <form
                onSubmit={updateTicket}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="mb-4 text-lg font-bold">Update ticket</h2>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Status
                    </span>
                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as TicketStatus)
                      }
                      className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
                    >
                      {Object.entries(statusLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-gray-700">
                        Category
                      </span>
                      <select
                        value={category}
                        onChange={(event) =>
                          setCategory(event.target.value as TicketCategory)
                        }
                        className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
                      >
                        {Object.entries(categoryLabel).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Due date
                    </span>
                    <input
                      type="datetime-local"
                      value={dueAt}
                      onChange={(event) => setDueAt(event.target.value)}
                      className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Assigned agent
                    </span>
                    <select
                      value={assignedToId}
                      onChange={(event) => setAssignedToId(event.target.value)}
                      className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Unassigned</option>
                      {users
                        .filter((user) => user.role !== "USER")
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Resolution
                    </span>
                    <textarea
                      value={resolution}
                      onChange={(event) => setResolution(event.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                  >
                    <Save size={18} />
                    Save
                  </button>
                </div>
              </form>

              <form
                onSubmit={addComment}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="mb-4 text-lg font-bold">Add comment</h2>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Author
                    </span>
                    <select
                      value={userId}
                      onChange={(event) => setUserId(event.target.value)}
                      className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
                      required
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-gray-700">
                      Comment
                    </span>
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      rows={5}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(event) => setIsInternal(event.target.checked)}
                      className="size-4 rounded border-gray-300"
                    />
                    Internal note
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                  >
                    Add comment
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function SummaryPanel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-dark">{value}</div>
    </div>
  );
}
