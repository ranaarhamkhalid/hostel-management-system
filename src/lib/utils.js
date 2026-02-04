import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const monthStr = (y, m) => {
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount || 0);
};

export const EMPTY = {
  rooms: [],
  seats: [],
  residents: [],
  messAttendance: [],
  customCharges: [],
  invoices: [],
  payments: [],
  expenses: [],
  residentHistory: [],
  auditLog: [],
  mealPrices: { breakfast: 0, lunch: 0, dinner: 0 }
};
