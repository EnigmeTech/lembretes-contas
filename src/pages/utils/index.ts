import type { PaymentStatus } from "../types";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function ymFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function normalizeDateToNoon(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

export function statusFromDueDate(due: Date, paid: boolean) {
  if (paid) return "paid" as PaymentStatus;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due0 = new Date(due);
  due0.setHours(0, 0, 0, 0);
  return due0.getTime() < today.getTime()
    ? ("overdue" as PaymentStatus)
    : ("open" as PaymentStatus);
}

export function moneyBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function statusLabel(status: PaymentStatus) {
  if (status === "paid") return "Pago";
  if (status === "overdue") return "Atrasado";
  return "Em aberto";
}

export function statusChipColor(
  status: PaymentStatus
): "success" | "warning" | "default" {
  if (status === "paid") return "success";
  if (status === "overdue") return "warning";
  return "default";
}

// yyyy-mm-dd -> Date
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Date -> yyyy-mm-dd
export function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function parseReferenceMonthToDate(referenceMonth: string): Date | null {
  const v = referenceMonth.trim();

  let year: number | undefined;
  let month: number | undefined;

  let match = v.match(/^(\d{2})[\/-](\d{4})$/);
  if (match) {
    month = Number(match[1]) - 1;
    year = Number(match[2]);
  } else if ((match = v.match(/^(\d{4})[\/-](\d{2})$/))) {
    year = Number(match[1]);
    month = Number(match[2]) - 1;
  } else if (/^\d{6}$/.test(v)) {
    month = Number(v.slice(0, 2)) - 1;
    year = Number(v.slice(2));
  }

  if (year === undefined || month === undefined || month < 0 || month > 11) {
    return null;
  }

  return new Date(year, month, 1);
}
