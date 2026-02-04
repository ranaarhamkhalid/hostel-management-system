import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { Card, CardHead } from '../components/ui/Card';
import { Btn } from '../components/ui/Btn';
import { Table, TD } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Forms';
import { CHARGE_TYPES } from '../lib/constants';
import { uid, todayStr, fmtDate } from '../lib/utils';

export default function ChargesModule() {
  const { db, refresh, audit, supabase } = useData();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ date: todayStr(), type: "Electricity" });
  const [search, setSearch] = useState("");

  const residents = db.residents.filter(r => r.status === "Active");

  const save = async () => {
    if (!form.resident_id || !form.amount) return showToast("Resident and Amount required", "warn");
    try {
      const { error } = await supabase.from('custom_charges').insert({
        id: uid(),
        resident_id: form.resident_id,
        date: form.date,
        type: form.type,
        amount: Number(form.amount),
        notes: form.notes
      });
      if (error) throw error;
      await audit("CHARGE_ADD", `Added ${form.amount} to ${residents.find(r => r.id === form.resident_id)?.name}`);
      showToast("Charge added");
      setModal(false);
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const del = async (id) => {
    if (!await confirm("Delete charge?", "Delete Charge", "Delete", "Cancel", "subtle")) return;
    try {
      const { error } = await supabase.from('custom_charges').delete().eq('id', id);
      if (error) throw error;
      showToast("Charge deleted");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Show recent 50 charges
  const recent = useMemo(() => {
    let res = db.customCharges;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(c => {
        const r = db.residents.find(res => res.id === c.resident_id);
        return (
          (r && r.name.toLowerCase().includes(q)) ||
          c.type.toLowerCase().includes(q) ||
          c.amount.toString().includes(q)
        );
      });
    }
    return res.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  }, [db.customCharges, db.residents, search]);

  return (
    <Card>
      <CardHead title="Custom Charges" action={
        <div className="flex-responsive" style={{ gap: 10 }}>
          <Input placeholder="Search..." value={search} onChange={setSearch} style={{ width: 200 }} className="w-full-mobile" />
          <Btn onClick={() => setModal(true)} className="w-full-mobile">+ Add Charge</Btn>
        </div>
      } />
      
      <Table headers={["Date", "Resident", "Type", "Amount", "Action"]} rows={recent} renderRow={c => {
        const res = db.residents.find(r => r.id === c.resident_id);
        return (
          <>
            <TD>{fmtDate(c.date)}</TD>
            <TD style={{ fontWeight: 600 }}>{res?.name || "Unknown"}</TD>
            <TD>{c.type}</TD>
            <TD>{Number(c.amount).toLocaleString()}</TD>
            <TD><Btn variant="ghost" onClick={() => del(c.id)} style={{ padding: "2px 6px", color: "var(--red)" }}>✕</Btn></TD>
          </>
        );
      }} />

      <Modal open={modal} onClose={() => setModal(false)} title="Add Charge">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select label="Resident" value={form.resident_id} onChange={v => setForm({ ...form, resident_id: v })} 
            options={[{ value: "", label: "Select..." }, ...residents.map(r => ({ value: r.id, label: r.name }))]} />
          
          <Input label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
          
          <Select label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })} 
            options={CHARGE_TYPES.map(t => ({ value: t, label: t }))} />
            
          <Input label="Amount" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
          <Input label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
          
          <Btn onClick={save} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Save Charge</Btn>
        </div>
      </Modal>
    </Card>
  );
}
