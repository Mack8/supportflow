import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/types/domain";

export const statusLabel: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_USER: "Waiting user",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const priorityLabel: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const categoryLabel: Record<TicketCategory, string> = {
  GENERAL: "General",
  TECHNICAL: "Technical",
  BILLING: "Billing",
  ACCOUNT: "Account",
  FEATURE_REQUEST: "Feature request",
  INCIDENT: "Incident",
};

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function toIsoFromDateInput(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function isTicketClosed(ticket: Pick<Ticket, "status">) {
  return ticket.status === "RESOLVED" || ticket.status === "CLOSED";
}

export function isTicketOverdue(
  ticket: Pick<Ticket, "dueAt" | "status">,
  now = new Date(),
) {
  return Boolean(
    ticket.dueAt && !isTicketClosed(ticket) && new Date(ticket.dueAt) < now,
  );
}

export function getStatusClass(status: TicketStatus) {
  const classes: Record<TicketStatus, string> = {
    OPEN: "bg-blue-50 text-blue-700 ring-blue-200",
    IN_PROGRESS: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    WAITING_USER: "bg-orange-50 text-orange-800 ring-orange-200",
    RESOLVED: "bg-green-50 text-green-700 ring-green-200",
    CLOSED: "bg-gray-100 text-gray-700 ring-gray-200",
  };

  return classes[status];
}

export function getPriorityClass(priority: TicketPriority) {
  const classes: Record<TicketPriority, string> = {
    LOW: "bg-gray-100 text-gray-700 ring-gray-200",
    MEDIUM: "bg-blue-50 text-blue-700 ring-blue-200",
    HIGH: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    URGENT: "bg-red-50 text-red-700 ring-red-200",
  };

  return classes[priority];
}

export function getCategoryClass(category: TicketCategory) {
  const classes: Record<TicketCategory, string> = {
    GENERAL: "bg-gray-100 text-gray-700 ring-gray-200",
    TECHNICAL: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    BILLING: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ACCOUNT: "bg-sky-50 text-sky-700 ring-sky-200",
    FEATURE_REQUEST: "bg-violet-50 text-violet-700 ring-violet-200",
    INCIDENT: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return classes[category];
}
