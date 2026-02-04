import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Btn } from '../components/ui/Btn';
import { Table, TD } from '../components/ui/Table';
import { Input, Select } from '../components/ui/Forms';
import { todayStr } from '../lib/utils';

export default function AttendanceModule() {
  const { db, refresh, supabase } = useData();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");

  const residents = db.residents.filter(r => statusFilter === "All" ? true : r.status === statusFilter);
  
  const filteredResidents = useMemo(() => {
    if (!search) return residents;
    return residents.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [residents, search]);

  const getRoom = (rId) => {
    const seat = db.seats.find(s => s.resident_id === rId);
    if (!seat) return "-";
    const room = db.rooms.find(r => r.id === seat.room_id);
    return room ? room.number : "-";
  };

  const updateCost = async (rId, meal, val) => {
    try {
      const exist = db.messAttendance.find(a => a.resident_id === rId && a.date === date);
      const cost = Number(val);
      
      const payload = {
        resident_id: rId,
        date,
        breakfast: exist?.breakfast || false,
        lunch: exist?.lunch || false,
        dinner: exist?.dinner || false,
        breakfast_cost: Number(exist?.breakfast_cost || 0),
        lunch_cost: Number(exist?.lunch_cost || 0),
        dinner_cost: Number(exist?.dinner_cost || 0),
        // Update specific meal
        [meal]: cost > 0,
        [`${meal}_cost`]: cost
      };

      if (exist) payload.id = exist.id;

      const { error } = await supabase.from('mess_attendance').upsert(payload, { onConflict: 'resident_id, date' });
      if (error) throw error;
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const getStats = () => {
    const recs = db.messAttendance.filter(a => a.date === date);
    return {
      b: recs.reduce((sum, a) => sum + (a.breakfast_cost || 0), 0),
      d: recs.reduce((sum, a) => sum + (a.dinner_cost || 0), 0)
    };
  };

  const exportPDF = () => {
    const month = date.slice(0, 7); // YYYY-MM
    const daysInMonth = new Date(date.split('-')[0], date.split('-')[1], 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${month}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #ccc; padding: 4px; text-align: center; }
            th { background: #f0f0f0; }
            .name { text-align: left; width: 150px; }
            .room { width: 50px; }
            h2 { margin-bottom: 10px; }
            .summary { margin-bottom: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>Attendance Report: ${month}</h2>
          <div class="summary">
            Generated on: ${new Date().toLocaleDateString()}
          </div>
          <table>
            <thead>
              <tr>
                <th class="name">Resident</th>
                <th class="room">Room</th>
                ${days.map(d => `<th>${d}</th>`).join('')}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${residents.map(r => {
                let total = 0;
                const row = days.map(d => {
                   const dStr = `${month}-${String(d).padStart(2, '0')}`;
                   const att = db.messAttendance.find(a => a.resident_id === r.id && a.date === dStr);
                   const dayCost = (att?.breakfast_cost || 0) + (att?.dinner_cost || 0);
                   total += dayCost;
                   return `<td>${dayCost > 0 ? dayCost : '-'}</td>`;
                }).join('');
                return `<tr><td class="name">${r.name}</td><td class="room">${getRoom(r.id)}</td>${row}<td><strong>${total}</strong></td></tr>`;
              }).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const exportExcel = () => {
    const month = date.slice(0, 7);
    const daysInMonth = new Date(date.split('-')[0], date.split('-')[1], 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    let csv = "Resident,Room,";
    csv += days.map(d => `${d}`).join(",") + ",Total\n";

    residents.forEach(r => {
      let total = 0;
      const row = days.map(d => {
        const dStr = `${month}-${String(d).padStart(2, '0')}`;
        const att = db.messAttendance.find(a => a.resident_id === r.id && a.date === dStr);
        const dayCost = (att?.breakfast_cost || 0) + (att?.dinner_cost || 0);
        total += dayCost;
        return dayCost > 0 ? dayCost : "";
      }).join(",");
      csv += `"${r.name}","${getRoom(r.id)}",${row},${total}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${month}.csv`;
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const stats = getStats();

  return (
    <Card>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Mess Attendance</h3>
        <div className="flex-responsive" style={{ gap: 10 }}>
          <Btn variant="secondary" onClick={exportExcel}>Export Excel</Btn>
          <Btn variant="secondary" onClick={exportPDF}>Export PDF</Btn>
          <Select 
            value={statusFilter} 
            onChange={val => setStatusFilter(val)} 
            options={[{label: "Active Residents", value: "Active"}, {label: "Left Residents", value: "Left"}, {label: "All Residents", value: "All"}]}
            style={{ width: 160 }}
          />
          <Input placeholder="Search..." value={search} onChange={setSearch} style={{ width: 200 }} className="w-full-mobile" />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="w-full-mobile"
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
          />
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <StatBox label="Breakfast Total (PKR)" val={stats.b} color="var(--accent)" />
        <StatBox label="Dinner Total (PKR)" val={stats.d} color="var(--purple)" />
      </div>

      <Table headers={["Resident", "Room", "Breakfast (Cost)", "Dinner (Cost)"]} rows={filteredResidents} renderRow={r => {
        const att = db.messAttendance.find(a => a.resident_id === r.id && a.date === date);
        return (
          <>
            <TD style={{ fontWeight: 600 }}>{r.name}</TD>
            <TD><span style={{ fontSize: 12, color: "var(--text3)", background: "var(--surface2)", padding: "2px 6px", borderRadius: 4 }}>{getRoom(r.id)}</span></TD>
            <TD><PriceInput value={att?.breakfast_cost} onSave={v => updateCost(r.id, 'breakfast', v)} /></TD>
            <TD><PriceInput value={att?.dinner_cost} onSave={v => updateCost(r.id, 'dinner', v)} /></TD>
          </>
        );
      }} />
    </Card>
  );
}

function PriceInput({ value, onSave }) {
  const [val, setVal] = useState(value || "");
  
  useEffect(() => {
    setVal(value || "");
  }, [value]);

  return (
    <input 
      type="number" 
      value={val} 
      onChange={e => setVal(e.target.value)}
      onBlur={() => onSave(val)}
      placeholder="Cost..."
      style={{ 
        width: "100%", padding: "8px", fontSize: 14, borderRadius: 4, 
        border: "1px solid var(--border2)", background: "var(--surface)" 
      }}
    />
  );
}

function StatBox({ label, val, color }) {
  return (
    <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 4 }}>{val}</div>
    </div>
  );
}