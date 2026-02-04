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
import { uid, fmtDate, todayStr, formatMoney, monthStr } from '../lib/utils';
import { printReceipt } from '../lib/receiptHelper';

export default function ResidentModule() {
  const { db, refresh, audit, supabase } = useData();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [modal, setModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");

  const filteredResidents = useMemo(() => {
    return db.residents.filter(r => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.cnic && r.cnic.includes(q)) ||
        (r.phone && r.phone.includes(q))
      );
    });
  }, [db.residents, search, statusFilter]);

  // Filter out seats that are occupied by SOMEONE ELSE
  const availSeats = useMemo(() => db.seats.filter(s => !s.resident_id || s.resident_id === editId), [db.seats, editId]);

  const historyData = useMemo(() => {
    if (!viewId) return { history: [], invoices: [], payments: [], timeline: [] };
    
    const hist = db.residentHistory.filter(h => h.resident_id === viewId).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    const timeline = [];
    hist.forEach((h, i) => {
       // Move In / Rejoin
       timeline.push({
         date: h.start_date,
         title: i === hist.length - 1 ? "Joined Hostel" : "Rejoined / Shifted",
         details: `Room ${h.room_number} - Seat ${h.seat_number}`,
         type: "join"
       });
       
       // Left / Moved Out
       if (h.end_date) {
         timeline.push({
            date: h.end_date,
            title: "Left Hostel / Moved Out",
            details: `Left Room ${h.room_number}`,
            type: "left"
         });
       }
    });
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      history: hist,
      invoices: db.invoices.filter(i => i.resident_id === viewId).sort((a, b) => b.id.localeCompare(a.id)),
      payments: db.payments.filter(p => p.resident_id === viewId).sort((a, b) => b.date.localeCompare(a.date)),
      timeline
    };
  }, [db, viewId]);

  const save = async () => {
    if (!form.name || !form.cnic || !form.move_in) return showToast("Name, CNIC, Date required", "warn");
    
    try {
      const payload = {
        name: form.name,
        father_name: form.father_name,
        cnic: form.cnic,
        phone: form.phone,
        g_phone: form.g_phone,
        move_in: form.move_in,
        deposit: Number(form.deposit || 0),
        status: form.status || "Active"
      };

      if (editId) {
        // Check if seat changed
        const oldRes = db.residents.find(r => r.id === editId);
        const oldSeatId = db.seats.find(s => s.resident_id === editId)?.id;
        const newSeatId = form.seat_id;

        // Update resident
        const { error } = await supabase.from('residents').update(payload).eq('id', editId);
        if (error) throw error;

        // Update Seat Rent
        if (newSeatId) {
          await supabase.from('seats').update({ rent: Number(form.rent || 0) }).eq('id', newSeatId);
        }

        // Handle seat swap
        if (oldSeatId !== newSeatId) {
          // 1. Close old history
          if (oldSeatId) {
             await supabase.from('seats').update({ resident_id: null }).eq('id', oldSeatId);
             // Find active history and close it
             const lastHist = db.residentHistory.find(h => h.resident_id === editId && !h.end_date);
             if (lastHist) {
               await supabase.from('resident_history').update({ end_date: todayStr() }).eq('id', lastHist.id);
             }
          }

          // 2. Start new history
          if (newSeatId) {
             await supabase.from('seats').update({ resident_id: editId }).eq('id', newSeatId);
             
             const seat = db.seats.find(s => s.id === newSeatId);
             const room = db.rooms.find(r => r.id === seat.room_id);
             
             await supabase.from('resident_history').insert({
               id: uid(),
               resident_id: editId,
               room_number: room?.number,
               seat_number: seat?.seat_number,
               start_date: todayStr()
             });
          }
        }

        // Generate Invoices on Reallocation (Rejoin/New Seat)
        if (newSeatId && !oldSeatId) {
           const seat = db.seats.find(s => s.id === newSeatId);
           const moveInDate = form.move_in || todayStr();
           const month = monthStr(new Date().getFullYear(), new Date().getMonth() + 1);

           // 1. Security Deposit (if set in form)
           const depositAmount = Number(form.deposit || 0);
           if (depositAmount > 0) {
              const invId = uid();
              await supabase.from('invoices').insert({
                id: invId,
                resident_id: editId,
                month: "Security Deposit",
                room_rent: 0,
                mess_total: 0,
                custom_total: depositAmount,
                prev_dues: 0,
                total_due: depositAmount,
                amount_paid: 0,
                status: "Unpaid"
              });
           }

           // 2. Monthly Rent (if not exists)
           const hasInv = db.invoices.some(i => i.resident_id === editId && i.month === month);
           if (!hasInv && seat) {
             const rent = Number(seat.rent || 0);
             if (rent > 0) {
               await supabase.from('invoices').insert({
                 id: uid(),
                 resident_id: editId,
                 month,
                 room_rent: rent,
                 mess_total: 0,
                 custom_total: 0,
                 prev_dues: 0, 
                 total_due: rent,
                 status: "Unpaid"
               });
             }
           }
        }

        await audit("RES_EDIT", `Updated ${form.name}`);
        showToast("Resident updated");
      } else {
        const id = uid();
        const { error } = await supabase.from('residents').insert({ id, ...payload });
        if (error) throw error;

        if (form.seat_id) {
          await supabase.from('seats').update({ resident_id: id, rent: Number(form.rent || 0) }).eq('id', form.seat_id);
          
          const seat = db.seats.find(s => s.id === form.seat_id);
          const room = db.rooms.find(r => r.id === seat.room_id);

          await supabase.from('resident_history').insert({
             id: uid(),
             resident_id: id,
             room_number: room?.number,
             seat_number: seat?.seat_number,
             start_date: form.move_in || todayStr()
          });
        }

        // Handle Security Deposit
        const depositAmount = Number(form.deposit || 0);
        if (depositAmount > 0) {
          const invId = uid();
          // Create Invoice for Deposit
          await supabase.from('invoices').insert({
            id: invId,
            resident_id: id,
            month: "Security Deposit",
            room_rent: 0,
            mess_total: 0,
            custom_total: depositAmount,
            prev_dues: 0,
            total_due: depositAmount,
            amount_paid: 0,
            status: "Unpaid"
          });
        }

        await audit("RES_ADD", `Added ${form.name}`);
        showToast("Resident added");
      }
      setModal(false);
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const moveOut = async (r) => {
    // Calculate Settlement
    const unpaid = db.invoices.filter(i => i.resident_id === r.id && i.status !== "Paid");
    const dues = unpaid.reduce((sum, i) => sum + (Number(i.total_due || 0) - Number(i.amount_paid || 0)), 0);
    const deposit = Number(r.deposit || 0);
    const refund = deposit - dues;

    let msg = `Move out ${r.name}?\n\n`;
    msg += `Security Deposit: ${formatMoney(deposit)}\n`;
    msg += `Pending Dues: ${formatMoney(dues)}\n`;
    msg += `-----------------------------\n`;
    msg += refund >= 0 ? `Net Refund: ${formatMoney(refund)}` : `Student Pays: ${formatMoney(Math.abs(refund))}`;

    if (!await confirm(msg, "Settlement & Move Out")) return;

    try {
      // 1. Apply Deposit to Pending Dues
      let remainingDeposit = deposit;
      let settledInvoices = [];
      
      if (dues > 0 && remainingDeposit > 0) {
        for (const inv of unpaid) {
          if (remainingDeposit <= 0) break;
          
          const due = (Number(inv.total_due || 0) - Number(inv.amount_paid || 0));
          const pay = Math.min(due, remainingDeposit);
          
          if (pay > 0) {
            // Update Invoice
            const newPaid = Number(inv.amount_paid || 0) + pay;
            const newStatus = newPaid >= inv.total_due ? "Paid" : "Partially Paid";
            
            await supabase.from('invoices').update({
              amount_paid: newPaid,
              status: newStatus
            }).eq('id', inv.id);

            // Record Settlement Payment
            await supabase.from('payments').insert({
              id: uid(),
              resident_id: r.id,
              invoice_id: inv.id,
              amount: pay,
              date: todayStr(),
              method: "Deposit Settlement",
              notes: "Adjusted from Security Deposit on Move Out"
            });
            
            settledInvoices.push("#" + inv.id.slice(0, 6).toUpperCase());
            remainingDeposit -= pay;
          }
        }
      }

      // Free seat & Capture Room Info
      const seat = db.seats.find(s => s.resident_id === r.id);
      let roomInfo = "";
      if (seat) {
         const room = db.rooms.find(rm => rm.id === seat.room_id);
         if (room) roomInfo = `Room ${room.number}`;
         await supabase.from('seats').update({ resident_id: null }).eq('id', seat.id);
      }
      
      // Close history
      const lastHist = db.residentHistory.find(h => h.resident_id === r.id && !h.end_date);
      if (lastHist) {
         if (!roomInfo) roomInfo = `Room ${lastHist.room_number}`; // Fallback
         await supabase.from('resident_history').update({ end_date: todayStr() }).eq('id', lastHist.id);
      }

      // Update status
      await supabase.from('residents').update({ 
        status: "Left", 
        move_out: todayStr() 
      }).eq('id', r.id);

      // Record Security Refund Expense (Net)
      if (refund > 0) {
        const invRefStr = settledInvoices.length > 0 ? ` | Settled Invs: ${settledInvoices.join(', ')}` : "";
        await supabase.from('expenses').insert({
          id: uid(),
          title: `Security Refund - ${r.name} (${roomInfo})`,
          category: "Other",
          amount: refund,
          date: todayStr(),
          notes: `Deposit: ${formatMoney(deposit)} | Dues Deducted: ${formatMoney(dues)}${invRefStr}`
        });
      }

      await audit("RES_LEFT", `${r.name} moved out. Settled: ${refund}`);
      showToast("Resident moved out & settled");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <Card>
      <CardHead title="Residents" action={
        <div className="flex-responsive card-header-actions">
          <Select 
            value={statusFilter} 
            onChange={val => setStatusFilter(val)} 
            options={[{label: "Active Residents", value: "Active"}, {label: "Left Residents", value: "Left"}, {label: "All Residents", value: "All"}]}
            style={{ width: 160 }}
          />
          <Input placeholder="Search..." value={search} onChange={setSearch} style={{ width: 200 }} className="w-full-mobile" />
          <Btn onClick={() => { setForm({ move_in: todayStr(), status: "Active", deposit: db.defaultDeposit || 0 }); setEditId(null); setModal(true); }}>+ Add Resident</Btn>
        </div>
      } />
      
      <Table headers={["Name", "Room/Seat", "Rent", "Contact", "Move In", "Status", "Action"]} rows={filteredResidents} renderRow={r => {
        const seat = db.seats.find(s => s.resident_id === r.id);
        const room = seat ? db.rooms.find(rm => rm.id === seat.room_id) : null;
        return (
          <>
            <TD>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "var(--text4)" }}>{r.father_name}</div>
              <div style={{ fontSize: 11, color: "var(--text4)" }}>{r.cnic}</div>
            </TD>
            <TD>
              {room ? <Badge color="accent">{room.number}-{seat.seat_number}</Badge> : <span style={{ color: "var(--text4)" }}>Unassigned</span>}
            </TD>
            <TD>{seat?.rent}</TD>
            <TD style={{ fontSize: 12 }}>{r.phone}<br/><span style={{ color: "var(--text4)" }}>G: {r.g_phone}</span></TD>
            <TD>{fmtDate(r.move_in)}</TD>
            <TD><Badge color={r.status === "Active" ? "accent" : "red"}>{r.status}</Badge></TD>
            <TD>
              <Btn variant="ghost" onClick={() => { 
                setForm({ ...r, seat_id: seat?.id, rent: seat?.rent }); 
                setEditId(r.id); 
                setModal(true); 
              }} style={{ padding: "4px 8px", fontSize: 11 }}>Edit</Btn>
              
              <Btn variant="ghost" onClick={() => {
                setViewId(r.id);
                setHistoryModal(true);
              }} style={{ padding: "4px 8px", fontSize: 11, marginLeft: 6 }}>Hist</Btn>

              {r.status === "Active" && 
                <Btn variant="subtle" onClick={() => moveOut(r)} style={{ padding: "4px 8px", fontSize: 11, marginLeft: 6 }}>Out</Btn>
              }
            </TD>
          </>
        );
      }} />

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit Resident" : "New Resident"}>
        <div className="grid-2">
          <Input label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Input label="Father Name" value={form.father_name} onChange={v => setForm({ ...form, father_name: v })} />
          
          <div className="col-span-full">
             <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>Status</label>
             <Select value={form.status || "Active"} onChange={val => setForm({...form, status: val})} options={[{label: "Active", value: "Active"}, {label: "Left", value: "Left"}]} />
          </div>

          <Input label="CNIC" value={form.cnic} onChange={v => setForm({ ...form, cnic: v })} />
          <Input label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Input label="Guardian Phone" value={form.g_phone} onChange={v => setForm({ ...form, g_phone: v })} />
          <Input label="Move In Date" type="date" value={form.move_in} onChange={v => setForm({ ...form, move_in: v })} />
          
          <div className="col-span-full">
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>Assign Seat</label>
            <select 
              value={form.seat_id || ""} 
              onChange={e => {
                const sId = e.target.value;
                const seat = availSeats.find(s => s.id === sId);
                setForm({ ...form, seat_id: sId, rent: seat ? seat.rent : form.rent, status: sId ? "Active" : form.status });
              }}
              style={{ width: "100%", marginTop: 5, padding: 8, borderRadius: 6, border: "1px solid var(--border2)", background: "var(--surface2)" }}
            >
              <option value="">No Seat</option>
              {availSeats.map(s => {
                const r = db.rooms.find(rm => rm.id === s.room_id);
                return <option key={s.id} value={s.id}>{r ? `Room ${r.number}` : '??'} - Seat {s.seat_number} (Rent: {s.rent})</option>;
              })}
            </select>
          </div>

          {form.seat_id && (
             <Input label="Rent" type="number" value={form.rent} onChange={v => setForm({ ...form, rent: v })} />
          )}

          <Input label="Security Deposit" type="number" value={form.deposit} onChange={v => setForm({ ...form, deposit: v })} />
          
          <Btn onClick={save} style={{ justifyContent: "center", marginTop: 10 }} className="col-span-full">Save Resident</Btn>
        </div>
      </Modal>

      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title="Resident History">
         <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
           <h4 style={{ margin: "0 0 10px 0", borderBottom: "1px solid var(--border)" }}>Timeline</h4>
           <Table headers={["Date", "Event", "Details"]} rows={historyData.timeline} renderRow={t => (
             <>
               <TD>{fmtDate(t.date)}</TD>
               <TD><Badge color={t.type === "join" ? "accent" : "red"}>{t.title}</Badge></TD>
               <TD>{t.details}</TD>
             </>
           )} />

           <h4 style={{ margin: "20px 0 10px 0", borderBottom: "1px solid var(--border)" }}>Invoices</h4>
           <Table headers={["Inv #", "Month", "Total", "Paid", "Status", "Action"]} rows={historyData.invoices} renderRow={i => (
             <>
               <TD><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text3)" }}>{i.id.slice(0, 8).toUpperCase()}</span></TD>
               <TD>{i.month}</TD>
               <TD>{formatMoney(i.total_due)}</TD>
               <TD>{formatMoney(i.amount_paid)}</TD>
               <TD><Badge color={i.status === "Paid" ? "accent" : "red"}>{i.status}</Badge></TD>
               <TD>
                 <Btn variant="ghost" onClick={() => printReceipt(db, i, 'invoice')} style={{ padding: "2px 6px", fontSize: 10 }}>View</Btn>
               </TD>
             </>
           )} />

           <h4 style={{ margin: "20px 0 10px 0", borderBottom: "1px solid var(--border)" }}>Payments</h4>
           <Table headers={["Ref #", "Date", "Amount", "Method", "Notes", "Action"]} rows={historyData.payments} renderRow={p => (
             <>
               <TD><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text3)" }}>{p.id.slice(0, 8).toUpperCase()}</span></TD>
               <TD>{fmtDate(p.date)}</TD>
               <TD>{formatMoney(p.amount)}</TD>
               <TD>{p.method}</TD>
               <TD>{p.notes}</TD>
               <TD>
                 <Btn variant="ghost" onClick={() => printReceipt(db, p, 'payment')} style={{ padding: "2px 6px", fontSize: 10 }}>View</Btn>
               </TD>
             </>
           )} />
         </div>
      </Modal>
    </Card>
  );
}
