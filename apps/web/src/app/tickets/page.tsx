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
  isTicketClosed,
  isTicketOverdue,
  priorityLabel,
  statusLabel,
} from "@/lib/format";
import type {
  PaginatedResponse,
  PaginationMeta,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  User,
} from "@/types/domain";
import {
  AlertTriangle,
  CalendarClock,
  Filter,
  Inbox,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const statusOptions: Array<TicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_USER",
  "RESOLVED",
  "CLOSED",
];

const priorityOptions: Array<TicketPriority | "ALL"> = [
  "ALL",
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const categoryOptions: Array<TicketCategory | "ALL"> = [
  "ALL",
  "GENERAL",
  "TECHNICAL",
  "BILLING",
  "ACCOUNT",
  "FEATURE_REQUEST",
  "INCIDENT",
];

type AssigneeFilter = "ALL" | "UNASSIGNED" | string;

type TicketFilters = {
  q: string;
  status: TicketStatus | "ALL";
  priority: TicketPriority | "ALL";
  category: TicketCategory | "ALL";
  assignee: AssigneeFilter;
  overdueOnly: boolean;
};

function buildTicketsPath(filters: TicketFilters, page: number, limit: number) {
  const params = new URLSearchParams();
  const search = filters.q.trim();

  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) params.set("q", search);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.priority !== "ALL") params.set("priority", filters.priority);
  if (filters.category !== "ALL") params.set("category", filters.category);
  if (filters.assignee === "UNASSIGNED") params.set("unassigned", "true");
  if (filters.assignee !== "ALL" && filters.assignee !== "UNASSIGNED") {
    params.set("assignedToId", filters.assignee);
  }
  if (filters.overdueOnly) params.set("overdue", "true");

  const query = params.toString();
  return `/tickets${query ? `?${query}` : ""}`;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TicketStatus | "ALL">("ALL");
  const [priority, setPriority] = useState<TicketPriority | "ALL">("ALL");
  const [category, setCategory] = useState<TicketCategory | "ALL">("ALL");
  const [assignee, setAssignee] = useState<AssigneeFilter>("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({ q, status, priority, category, assignee, overdueOnly }),
    [q, status, priority, category, assignee, overdueOnly],
  );

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const [ticketData, userData] = await Promise.all([
        apiFetch<PaginatedResponse<Ticket>>(
          buildTicketsPath(filters, page, limit),
        ),
        apiFetch<User[]>("/users"),
      ]);
      setTickets(ticketData.data);
      setMeta(ticketData.meta);
      setUsers(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadFilteredTickets() {
      try {
        const [ticketData, userData] = await Promise.all([
          apiFetch<PaginatedResponse<Ticket>>(
            buildTicketsPath(filters, page, limit),
          ),
          apiFetch<User[]>("/users"),
        ]);

        if (!ignore) {
          setTickets(ticketData.data);
          setMeta(ticketData.meta);
          setUsers(userData);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Could not load tickets");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadFilteredTickets();

    return () => {
      ignore = true;
    };
  }, [filters, page]);

  const metrics = useMemo(() => {
    const active = tickets.filter((ticket) => !isTicketClosed(ticket)).length;
    const overdue = tickets.filter((ticket) => isTicketOverdue(ticket)).length;
    const urgent = tickets.filter((ticket) => ticket.priority === "URGENT").length;
    const unassigned = tickets.filter((ticket) => !ticket.assignedToId).length;

    return { active, overdue, urgent, unassigned };
  }, [tickets]);

  function markLoading() {
    setLoading(true);
  }

  function resetPageAndMarkLoading() {
    setPage(1);
    markLoading();
  }

  function resetFilters() {
    markLoading();
    setPage(1);
    setQ("");
    setStatus("ALL");
    setPriority("ALL");
    setCategory("ALL");
    setAssignee("ALL");
    setOverdueOnly(false);
  }

  return (
    <AppShell>
      <PageHeading
        title="Tickets"
        description="Track ownership, category, SLA target, priority and current support status."
        action={
          <Link
            href="/tickets/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <Plus size={18} />
            New ticket
          </Link>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Active"
          value={metrics.active}
          icon={<Inbox size={20} />}
        />
        <MetricCard
          label="Overdue"
          value={metrics.overdue}
          icon={<CalendarClock size={20} />}
          tone={metrics.overdue > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="Urgent"
          value={metrics.urgent}
          icon={<AlertTriangle size={20} />}
          tone={metrics.urgent > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Unassigned"
          value={metrics.unassigned}
          icon={<UserRound size={20} />}
        />
      </section>

      <section className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={18} />
          Filters
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))_auto]">
          <label className="relative block">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={q}
              onChange={(event) => {
                resetPageAndMarkLoading();
                setQ(event.target.value);
              }}
              placeholder="Search tickets"
              className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              resetPageAndMarkLoading();
              setStatus(event.target.value as TicketStatus | "ALL");
            }}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All statuses" : statusLabel[option]}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => {
              resetPageAndMarkLoading();
              setPriority(event.target.value as TicketPriority | "ALL");
            }}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
          >
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All priorities" : priorityLabel[option]}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => {
              resetPageAndMarkLoading();
              setCategory(event.target.value as TicketCategory | "ALL");
            }}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All categories" : categoryLabel[option]}
              </option>
            ))}
          </select>
          <select
            value={assignee}
            onChange={(event) => {
              resetPageAndMarkLoading();
              setAssignee(event.target.value);
            }}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-primary"
          >
            <option value="ALL">All assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {users
              .filter((user) => user.role !== "USER")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
          <label className="flex h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => {
                resetPageAndMarkLoading();
                setOverdueOnly(event.target.checked);
              }}
              className="size-4 rounded border-gray-300"
            />
            Overdue
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
        <div className="mt-3 text-sm font-medium text-gray-500">
          {meta?.total ?? 0} tickets match the current filters
        </div>
      </section>

      {loading ? <LoadingState label="Loading tickets" /> : null}
      {error ? <ErrorState message={error} onRetry={loadTickets} /> : null}

      {!loading && !error ? (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => {
                  const overdue = isTicketOverdue(ticket);

                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="font-semibold text-dark hover:text-primary"
                        >
                          {ticket.title}
                        </Link>
                        <div className="mt-1 max-w-[360px] truncate text-xs text-gray-500">
                          {ticket.description}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <CategoryBadge category={ticket.category} />
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {ticket.createdBy?.name ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {ticket.assignedTo?.name ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            overdue
                              ? "font-semibold text-red-700"
                              : "text-gray-600"
                          }
                        >
                          {formatDate(ticket.dueAt)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {ticket._count?.comments ?? 0}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {formatDate(ticket.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No tickets match the current filters.
            </div>
          ) : null}
        </section>
      ) : null}

      {!loading && !error && meta ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            Page {meta.page} of {Math.max(meta.totalPages, 1)} - Showing{" "}
            {tickets.length} of {meta.total}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                markLoading();
                setPage((current) => Math.max(current - 1, 1));
              }}
              disabled={meta.page <= 1}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                markLoading();
                setPage((current) =>
                  Math.min(current + 1, Math.max(meta.totalPages, 1)),
                );
              }}
              disabled={meta.page >= Math.max(meta.totalPages, 1)}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-700"
      : tone === "warning"
        ? "bg-yellow-50 text-yellow-800"
        : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-dark">{value}</div>
        </div>
        <div className={`rounded-md p-2 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
}
