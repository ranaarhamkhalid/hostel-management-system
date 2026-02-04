import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useStats } from '../hooks/useStats';
import { Card, CardHead } from '../components/ui/Card';
import { Table, TD } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Btn } from '../components/ui/Btn';
import { fmtDate, formatMoney } from '../lib/utils';
import { 
  IconPerson, IconRoom, IconInvoice, IconCheck, 
  IconPayment, IconExpense, IconReport 
} from '../components/Icons';

export default function Dashboard() {
  const { db, loading, error } = useData();
  const stats = useStats();
  const navigate = useNavigate();
  const [showAudit, setShowAudit] = useState(false);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Loading system...</div>;
  if (error) return (
    <div style={{ padding: 20, background: "var(--red-light)", color: "var(--red)", borderRadius: 10 }}>
      <strong>System Error:</strong> {error}
      <div style={{ marginTop: 10, fontSize: 13 }}>Please check your Supabase connection settings in DataContext.jsx</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header & Quick Actions */}
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
          <div style={{ color: "var(--text3)", fontSize: 13 }}>Welcome back, System Admin</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="ghost" onClick={() => setShowAudit(true)}>View Audit Log</Btn>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4">
        <StatCard icon={IconPerson} label="Active Residents" val={stats.activeRes} sub={`${stats.occSeats} / ${stats.totalSeats} Beds Occupied`} color="var(--accent)" />
        <StatCard icon={IconRoom} label="Occupancy Rate" val={`${stats.occupancyRate}%`} sub="Capacity Utilization" color="var(--blue)" />
        <StatCard icon={IconInvoice} label="Pending Dues" val={formatMoney(stats.totalDue - stats.collected)} sub="Uncollected Revenue" color="var(--amber)" />
        <StatCard icon={IconCheck} label="Cash in Hand" val={formatMoney(stats.income - stats.totalExpenses)} sub="Income - Expenses (This Month)" color="var(--purple)" />
      </div>

      {/* Financial Overview & Quick Access */}
      <div className="grid-2-1">
        
        {/* Financial Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="grid-2">
             <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" }}>Income (This Month)</div>
                  <IconPayment width={20} color="var(--green)" />
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green)" }}>{formatMoney(stats.income)}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Collected from payments</div>
             </Card>
             <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" }}>Expenses (This Month)</div>
                  <IconExpense width={20} color="var(--red)" />
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "var(--red)" }}>{formatMoney(stats.totalExpenses)}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Operational costs</div>
             </Card>
          </div>

          <Card>
            <CardHead title="Top Pending Dues" />
            <Table headers={["Resident", "Unpaid Amount", "Status"]} rows={stats.topPending} renderRow={r => {
              const seat = db.seats.find(s => s.resident_id === r.id);
              const room = seat ? db.rooms.find(rm => rm.id === seat.room_id) : null;
              return (
                <>
                  <TD>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    {room && <div style={{ fontSize: 11, color: "var(--text3)" }}>Room {room.number}</div>}
                  </TD>
                  <TD style={{ color: "var(--red)", fontWeight: 700 }}>{formatMoney(r.unpaid)}</TD>
                  <TD><Badge color="red">Overdue</Badge></TD>
                </>
              );
            }} />
            {stats.topPending.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--text3)" }}>No pending dues found.</div>}
          </Card>
        </div>

        {/* Side Panel: Quick Actions & Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <CardHead title="Quick Actions" />
            <div style={{ padding: 20, display: "grid", gap: 10 }}>
              <Btn variant="secondary" style={{ justifyContent: "start" }} onClick={() => navigate('/residents')}>+ Add New Resident</Btn>
              <Btn variant="secondary" style={{ justifyContent: "start" }} onClick={() => navigate('/expenses')}>+ Add Expense</Btn>
              <Btn variant="secondary" style={{ justifyContent: "start" }} onClick={() => navigate('/reports')}>View Reports</Btn>
            </div>
          </Card>

          <Card>
            <CardHead title="System Status" />
            <div style={{ padding: 20 }}>
              <StatusItem label="Database" status="Connected" color="var(--green)" />
              <StatusItem label="Last Backup" status="Auto-synced" color="var(--text2)" />
              <StatusItem label="Security" status="RLS Enabled" color="var(--blue)" />
              <StatusItem label="Version" status="v3.1.0" color="var(--text3)" />
            </div>
          </Card>
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAudit && (
        <Modal title="System Audit Log" open={showAudit} onClose={() => setShowAudit(false)}>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <Table headers={["Time", "Action", "Details"]} rows={db.auditLog} renderRow={l => (
              <>
                <TD style={{ fontSize: 11 }}>{new Date(l.created_at).toLocaleString()}</TD>
                <TD><Badge>{l.action}</Badge></TD>
                <TD>{l.details}</TD>
              </>
            )} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, val, sub, color }) {
  return (
    <Card style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}20`, color: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon width={24} height={24} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: "var(--text3)", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{val}</div>
        <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 2 }}>{sub}</div>
      </div>
    </Card>
  );
}

function StatusItem({ label, status, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <span style={{ fontWeight: 600, color }}>{status}</span>
    </div>
  );
}
