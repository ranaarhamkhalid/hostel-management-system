import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { Card, CardHead } from '../components/ui/Card';
import { Btn } from '../components/ui/Btn';
import { Badge } from '../components/ui/Badge';
import { Table, TD } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Forms';
import { PAYMENT_METHODS } from '../lib/constants';
import { monthStr, uid, todayStr, fmtDate, formatMoney } from '../lib/utils';
import { printReceipt } from '../lib/receiptHelper';

export default function BillingModule() {
  const { db, refresh, audit, supabase } = useData();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [tab, setTab] = useState("invoices"); // invoices | payments
  const [month, setMonth] = useState(monthStr(new Date().getFullYear(), new Date().getMonth() + 1));
  const [viewType, setViewType] = useState("monthly"); // monthly | deposit
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({});

  const openPayment = (inv) => {
    const due = (Number(inv.total_due) || 0) - (Number(inv.amount_paid) || 0);
    setPayForm({
      invoice_id: inv.id,
      resident_id: inv.resident_id,
      amount: due,
      date: todayStr(),
      method: "Cash",
      max: due
    });
    setPayModal(true);
  };

  const savePayment = async () => {
    if (!payForm.amount || !payForm.date) return showToast("Amount and Date required", "warn");
    
    try {
      const amount = Number(payForm.amount);
      // Insert Payment
      const { error: pErr } = await supabase.from('payments').insert({
        id: uid(),
        resident_id: payForm.resident_id,
        invoice_id: payForm.invoice_id,
        amount: amount,
        date: payForm.date,
        method: payForm.method,
        notes: "Paid via Billing Module"
      });
      if (pErr) throw pErr;

      // Update Invoice
      const inv = db.invoices.find(i => i.id === payForm.invoice_id);
      const newPaid = Number(inv.amount_paid) + amount;
      const newStatus = newPaid >= inv.total_due ? "Paid" : "Partially Paid";

      const { error: iErr } = await supabase.from('invoices').update({
        amount_paid: newPaid,
        status: newStatus
      }).eq('id', payForm.invoice_id);
      if (iErr) throw iErr;

      await audit("PAY_ADD", `Received ${amount} for Invoice #${inv.month}`);
      showToast("Payment recorded");
      setPayModal(false);
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const generate = async () => {
    if (!await confirm(`Generate invoices for ${month}?`, "Confirm Generation")) return;
    setLoading(true);
    let count = 0;
    
    try {
      const active = db.residents.filter(r => r.status === "Active");
      
      for (const r of active) {
        if (db.invoices.some(i => i.resident_id === r.id && i.month === month)) continue;

        // Rent
        const seat = db.seats.find(s => s.resident_id === r.id);
        const rent = seat ? Number(seat.rent || 0) : 0;

        // Mess
        const atts = db.messAttendance.filter(a => a.resident_id === r.id && a.date.startsWith(month));
        const mess = atts.reduce((sum, a) => sum + (Number(a.breakfast_cost) || 0) + (Number(a.lunch_cost) || 0) + (Number(a.dinner_cost) || 0), 0);

        // Custom
        const charges = db.customCharges.filter(c => c.resident_id === r.id && c.date.startsWith(month));
        const custom = charges.reduce((s, c) => s + Number(c.amount), 0);

        // Prev Dues (Sum of unpaid balance from ALL previous months)
        const prevInvs = db.invoices.filter(i => i.resident_id === r.id && i.month < month);
        const prev = prevInvs.reduce((s, i) => s + ((Number(i.total_due) || 0) - (Number(i.amount_paid) || 0)), 0);

        const total = rent + mess + custom + prev;

        const { error } = await supabase.from('invoices').insert({
          id: uid(),
          resident_id: r.id,
          month,
          room_rent: rent,
          mess_total: mess,
          custom_total: custom,
          prev_dues: prev,
          total_due: total,
          status: total > 0 ? "Unpaid" : "Paid"
        });

        if (error) throw error;
        count++;
      }
      
      await audit("BILL_GEN", `Generated ${count} invoices for ${month}`);
      showToast(`Generated ${count} invoices`);
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const invoices = useMemo(() => {
    let res = [];
    if (viewType === "deposit") {
      res = db.invoices.filter(i => i.month === "Security Deposit");
    } else {
      res = db.invoices.filter(i => i.month === month);
    }

    if (search) {
      const q = search.toLowerCase();
      res = res.filter(i => {
        const r = db.residents.find(res => res.id === i.resident_id);
        return r && r.name.toLowerCase().includes(q);
      });
    }
    return res;
  }, [db.invoices, month, viewType, db.residents, search]);

  const recentPayments = useMemo(() => {
    let res = db.payments;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(p => {
        const r = db.residents.find(res => res.id === p.resident_id);
        return (
          (r && r.name.toLowerCase().includes(q)) ||
          p.amount.toString().includes(q) ||
          p.method.toLowerCase().includes(q)
        );
      });
    }
    return res.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  }, [db.payments, db.residents, search]);

  return (
    <Card>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div className="flex-responsive" style={{ gap: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Billing & Payments</h3>
          <div style={{display: "flex", background: "var(--surface2)", padding: 4, borderRadius: 8}}>
            <button 
              onClick={() => setTab("invoices")}
              style={{
                border: "none", background: tab === "invoices" ? "var(--surface)" : "transparent",
                color: tab === "invoices" ? "var(--text)" : "var(--text3)",
                padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: tab === "invoices" ? "0 2px 5px rgba(0,0,0,0.05)" : "none"
              }}
            >Invoices</button>
            <button 
              onClick={() => setTab("payments")}
              style={{
                border: "none", background: tab === "payments" ? "var(--surface)" : "transparent",
                color: tab === "payments" ? "var(--text)" : "var(--text3)",
                padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: tab === "payments" ? "0 2px 5px rgba(0,0,0,0.05)" : "none"
              }}
            >Payment History</button>
          </div>
        </div>

        <div className="flex-responsive" style={{ gap: 10 }}>
          <Input placeholder="Search..." value={search} onChange={setSearch} style={{ width: 200 }} className="w-full-mobile" />
          
          {tab === "invoices" && (
            <>
              <Select 
                value={viewType} 
                onChange={setViewType} 
                options={[{value: "monthly", label: "Monthly Rent"}, {value: "deposit", label: "Security Deposits"}]} 
                style={{width: 140}}
                className="w-full-mobile"
              />
              
              {viewType === "monthly" && (
                <>
                  <input 
                    type="month" 
                    value={month} 
                    onChange={e => setMonth(e.target.value)}
                    className="w-full-mobile"
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
                  />
                  <Btn onClick={generate} disabled={loading} className="w-full-mobile">{loading ? "..." : "Generate"}</Btn>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {tab === "invoices" ? (
        <Table headers={["Inv #", "Resident", "Rent", "Mess", "Other", "Prev", "Total", "Status", "Action"]} rows={invoices} renderRow={i => {
          const res = db.residents.find(r => r.id === i.resident_id);
          
          let roomNum = "?";
          let isOut = false;
          const seat = db.seats.find(s => s.resident_id === res?.id);
          if (seat) {
             const room = db.rooms.find(rm => rm.id === seat.room_id);
             roomNum = room ? room.number : "?";
          } else {
             isOut = true;
             const lastHist = db.residentHistory.filter(h => h.resident_id === res?.id).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
             if (lastHist) roomNum = lastHist.room_number;
          }

          const paid = i.amount_paid >= i.total_due;
          
          return (
            <>
              <TD><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text3)" }}>{i.id.slice(0, 8).toUpperCase()}</span></TD>
              <TD>
                <div style={{ fontWeight: 600 }}>{res?.name}</div>
                <div style={{ fontSize: 11, color: isOut ? "var(--red)" : "var(--text3)" }}>Room {roomNum}</div>
              </TD>
              <TD>{i.room_rent}</TD>
              <TD>{i.mess_total}</TD>
              <TD>{i.custom_total}</TD>
              <TD style={{ color: "var(--red)" }}>{i.prev_dues}</TD>
              <TD style={{ fontWeight: 700 }}>{(Number(i.total_due) || 0).toLocaleString()}</TD>
              <TD><Badge color={paid ? "accent" : i.amount_paid > 0 ? "amber" : "red"}>{i.status}</Badge></TD>
              <TD>
                {!paid && (
                  <Btn variant="subtle" onClick={() => openPayment(i)} style={{ padding: "4px 8px", fontSize: 12, marginRight: 5 }}>Pay</Btn>
                )}
                <Btn variant="ghost" onClick={() => printReceipt(db, i, 'invoice')} style={{ padding: "4px 8px", fontSize: 12 }}>Print</Btn>
              </TD>
            </>
          );
        }} />
      ) : (
        <Table headers={["Ref #", "Date", "Resident", "Invoice", "Amount", "Method", "Action"]} rows={recentPayments} renderRow={p => {
          const res = db.residents.find(r => r.id === p.resident_id);
          const inv = db.invoices.find(i => i.id === p.invoice_id);

          let roomNum = "?";
          let isOut = false;
          const seat = db.seats.find(s => s.resident_id === res?.id);
          if (seat) {
             const room = db.rooms.find(rm => rm.id === seat.room_id);
             roomNum = room ? room.number : "?";
          } else {
             isOut = true;
             const lastHist = db.residentHistory.filter(h => h.resident_id === res?.id).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
             if (lastHist) roomNum = lastHist.room_number;
          }

          return (
            <>
              <TD><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text3)" }}>{p.id.slice(0, 8).toUpperCase()}</span></TD>
              <TD>{fmtDate(p.date)}</TD>
              <TD>
                <div style={{ fontWeight: 600 }}>{res?.name}</div>
                <div style={{ fontSize: 11, color: isOut ? "var(--red)" : "var(--text3)" }}>Room {roomNum}</div>
              </TD>
              <TD>
                 {inv ? (
                    <div>
                      {inv.month}
                      <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text3)" }}>#{inv.id.slice(0, 6)}</div>
                    </div>
                 ) : "N/A"}
              </TD>
              <TD style={{ fontWeight: 700, color: "var(--accent)" }}>{p.amount.toLocaleString()}</TD>
              <TD><Badge color="blue">{p.method}</Badge></TD>
              <TD>
                <Btn variant="ghost" onClick={() => printReceipt(db, p, 'payment')} style={{ padding: "4px 8px", fontSize: 11 }}>Print</Btn>
              </TD>
            </>
          );
        }} />
      )}

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{fontSize: 14, color: "var(--text3)", background: "var(--surface2)", padding: 10, borderRadius: 6}}>
            Recording payment for <strong style={{color: "var(--text)"}}>{db.residents.find(r => r.id === payForm.resident_id)?.name}</strong>
            <div style={{marginTop: 4}}>Balance Due: <span style={{fontWeight: 700, color: "var(--red)"}}>{payForm.max?.toLocaleString()}</span></div>
          </div>
          
          <Input 
            label="Payment Amount (Partial allowed)" 
            type="number" 
            value={payForm.amount} 
            onChange={v => setPayForm({ ...payForm, amount: v })} 
          />
          
          <div className="grid-2">
            <Input label="Date" type="date" value={payForm.date} onChange={v => setPayForm({ ...payForm, date: v })} />
            <Select label="Method" value={payForm.method} onChange={v => setPayForm({ ...payForm, method: v })} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
          </div>
          
          <Btn onClick={savePayment} style={{justifyContent: "center"}} className="col-span-full">Confirm Payment</Btn>
        </div>
      </Modal>
    </Card>
  );
}
