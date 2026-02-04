import React from 'react';
import { useData } from '../context/DataContext';
import { Card, CardHead } from '../components/ui/Card';
import { Table, TD } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

export default function ReportsModule() {
  const { db } = useData();

  const defaulters = db.residents.map(r => {
    const invs = db.invoices.filter(i => i.resident_id === r.id);
    const totalDue = invs.reduce((s, i) => s + i.total_due, 0);
    const totalPaid = invs.reduce((s, i) => s + i.amount_paid, 0);
    const balance = totalDue - totalPaid;
    
    // Get Room
    const seat = db.seats.find(s => s.resident_id === r.id);
    const room = seat ? db.rooms.find(rm => rm.id === seat.room_id) : null;
    
    return { ...r, balance, room_number: room ? room.number : "-" };
  }).filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance);

  // Income by Month
  const incomeByMonth = db.payments.reduce((acc, p) => {
    const m = p.date.slice(0, 7); // YYYY-MM
    acc[m] = (acc[m] || 0) + p.amount;
    return acc;
  }, {});
  
  const incomeRows = Object.entries(incomeByMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([m, amt]) => ({ month: m, amount: amt }));

  return (
    <div className="grid-2" style={{ gap: 20 }}>
      <Card>
        <CardHead title="Defaulters List" />
        <Table headers={["Resident", "Room", "Balance Due"]} rows={defaulters} renderRow={r => (
          <>
            <TD>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
            </TD>
            <TD>{r.room_number}</TD>
            <TD style={{ color: "var(--red)", fontWeight: 700 }}>{r.balance.toLocaleString()}</TD>
          </>
        )} />
      </Card>

      <Card>
        <CardHead title="Monthly Income" />
        <Table headers={["Month", "Total Collected"]} rows={incomeRows} renderRow={r => (
          <>
            <TD>{r.month}</TD>
            <TD style={{ color: "var(--accent)", fontWeight: 700 }}>{r.amount.toLocaleString()}</TD>
          </>
        )} />
      </Card>
    </div>
  );
}
