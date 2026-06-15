export type Role = "USER" | "AGENT" | "ADMIN";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_USER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketCategory =
  | "GENERAL"
  | "TECHNICAL"
  | "BILLING"
  | "ACCOUNT"
  | "FEATURE_REQUEST"
  | "INCIDENT";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
  dueAt: string | null;
  lastStatusChangeAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  resolution: string | null;
  createdById: string;
  assignedToId: string | null;
  createdBy?: Pick<User, "id" | "name" | "email" | "role" | "isActive">;
  assignedTo?: Pick<User, "id" | "name" | "email" | "role" | "isActive"> | null;
  _count?: {
    comments: number;
  };
};

export type Comment = {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  ticketId: string;
  userId: string;
  user?: Pick<User, "id" | "name" | "email" | "role" | "isActive">;
  ticket?: Pick<Ticket, "id" | "title" | "status" | "priority">;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  user: User;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type TicketStats = {
  total: number;
  active: number;
  urgent: number;
  overdue: number;
  unassigned: number;
  byStatus: Record<TicketStatus, number>;
};
