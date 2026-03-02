import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import i18n from "@/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat(i18n.language, {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
