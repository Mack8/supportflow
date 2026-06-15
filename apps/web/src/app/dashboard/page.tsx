"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/layout/page-heading";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { formatDate, statusLabel } from "@/lib/format";
import type {
  Comment,
  PaginatedResponse,
  Ticket,
  TicketStatus,
  User,
} from "@/types/domain";
import { MessageSquare, TicketCheck, Timer, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  tickets: Ticket[];
  comments: Comment[];
  currentUser: User;
  userCount?: number;
};

const statuses: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_USER",
  "RESOLVED",
  "CLOSED",
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData(): Promise<DashboardData> {
    const currentUser = await apiFetch<User>("/auth/me");
    const [ticketPage, comments, users] = await Promise.all([
      apiFetch<PaginatedResponse<Ticket>>("/tickets?limit=100"),
      apiFetch<Comment[]>("/comments"),
      currentUser.role === "ADMIN"
        ? apiFetch<User[]>("/users")
        : Promise.resolve([] as User[]),
    ]);

    return {
      tickets: ticketPage.data,
      comments,
      currentUser,
      userCount: currentUser.role === "ADMIN" ? users.length : undefined,
    };
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      setData(await fetchDashboardData());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const dashboardData = await fetchDashboardData();

        if (!ignore) {
          setData(dashboardData);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "Could not load dashboard",
          );
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
  }, []);

  const summary = useMemo(() => {
    const tickets = data?.tickets ?? [];
    return {
      open: tickets.filter((ticket) => ticket.status === "OPEN").length,
      active: tickets.filter((ticket) =>
        ["OPEN", "IN_PROGRESS", "WAITING_USER"].includes(ticket.status),
      ).length,
      urgent: tickets.filter((ticket) => ticket.priority === "URGENT").length,
    };
  }, [data]);
  const isCustomerView = data?.currentUser.role === "USER";

  return (
    <AppShell>
      <PageHeading
        title="Dashboard"
        description={
          isCustomerView
            ? "Review your support requests and recent ticket activity."
            : "Operational view of tickets, workload and recent support activity."
        }
        action={
          <Link
            href="/tickets/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            New ticket
          </Link>
        }
      />

      {loading ? <LoadingState label="Loading dashboard" /> : null}
      {error ? <ErrorState message={error} onRetry={loadData} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={isCustomerView ? "My tickets" : "Total tickets"}
              value={data.tickets.length}
              icon={<TicketCheck size={22} />}
            />
            <MetricCard
              label="Active tickets"
              value={summary.active}
              icon={<Timer size={22} />}
            />
            {data.userCount !== undefined ? (
              <MetricCard
                label="Users"
                value={data.userCount}
                icon={<Users size={22} />}
              />
            ) : (
              <MetricCard
                label="Urgent"
                value={summary.urgent}
                icon={<Timer size={22} />}
              />
            )}
            <MetricCard
              label={isCustomerView ? "Public updates" : "Comments"}
              value={data.comments.length}
              icon={<MessageSquare size={22} />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-dark">
                {isCustomerView ? "My recent tickets" : "Recent tickets"}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-3">Title</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Priority</th>
                      {!isCustomerView ? (
                        <th className="px-3 py-3">Requester</th>
                      ) : null}
                      <th className="px-3 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.tickets.slice(0, 8).map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4">
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="font-semibold text-dark hover:text-primary"
                          >
                            {ticket.title}
                          </Link>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-3 py-4">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        {!isCustomerView ? (
                          <td className="px-3 py-4 text-gray-600">
                            {ticket.createdBy?.name ?? "-"}
                          </td>
                        ) : null}
                        <td className="px-3 py-4 text-gray-600">
                          {formatDate(ticket.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.tickets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No tickets to show yet.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-dark">Status mix</h2>
              <div className="space-y-3">
                {statuses.map((status) => {
                  const count = data.tickets.filter(
                    (ticket) => ticket.status === status,
                  ).length;
                  const pct = data.tickets.length
                    ? Math.round((count / data.tickets.length) * 100)
                    : 0;

                  return (
                    <div key={status}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">
                          {statusLabel[status]}
                        </span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
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
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-3xl font-bold text-dark">{value}</div>
      <div className="mt-1 text-sm font-medium text-gray-500">{label}</div>
    </div>
  );
}
