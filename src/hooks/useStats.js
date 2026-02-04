import { useMemo } from 'react';
import { useData } from '../context/DataContext';

export function useStats() {
  const { db } = useData();

  return useMemo(() => {
    const totalSeats = db.seats.length;
    const occSeats = db.seats.filter(s => s.resident_id).length;
    const activeRes = db.residents.filter(r => r.status === "Active").length;
    
    // Financials (Current Month)
    const curMonth = new Date().toISOString().slice(0, 7);
    
    // Invoices
    const invoices = db.invoices.filter(i => i.month === curMonth);
    const totalDue = invoices.reduce((s, i) => s + i.total_due, 0);
    const collected = invoices.reduce((s, i) => s + i.amount_paid, 0);

    // Expenses
    const expenses = db.expenses.filter(e => e.date.startsWith(curMonth));
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Income (Real Payments)
    const payments = db.payments.filter(p => p.date.startsWith(curMonth));
    const income = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    // Pending Dues (Global)
    const residentsWithDues = db.residents
      .map(r => {
        // Sum of all unpaid invoices for this resident
        const unpaid = db.invoices
          .filter(i => i.resident_id === r.id && i.status !== 'Paid')
          .reduce((sum, inv) => sum + (inv.total_due - inv.amount_paid), 0);
        return { ...r, unpaid };
      })
      .filter(r => r.unpaid > 0)
      .sort((a, b) => b.unpaid - a.unpaid)
      .slice(0, 5);

    return {
      totalSeats,
      occSeats,
      activeRes,
      totalDue,
      collected,
      totalExpenses,
      income,
      topPending: residentsWithDues,
      occupancyRate: totalSeats ? Math.round((occSeats / totalSeats) * 100) : 0
    };
  }, [db]);
}
