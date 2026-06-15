import {
  categoryLabel,
  getPriorityClass,
  getStatusClass,
  getCategoryClass,
  priorityLabel,
  statusLabel,
} from "@/lib/format";
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/types/domain";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={getStatusClass(status)}>{statusLabel[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge className={getPriorityClass(priority)}>{priorityLabel[priority]}</Badge>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <Badge className={getCategoryClass(category)}>
      {categoryLabel[category]}
    </Badge>
  );
}
