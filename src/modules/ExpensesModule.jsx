import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { Card, CardHead } from '../components/ui/Card';
import { Btn } from '../components/ui/Btn';
import { Table, TD } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Forms';
import { uid, formatMoney } from '../lib/utils';

export default function ExpensesModule() {
  const { db, refresh, audit, supabase } = useData();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: "", category: "Maintenance", amount: "", date: new Date().toISOString().split('T')[0], notes: ""
  });
  const [search, setSearch] = useState("");

  const categories = [
    { label: "Electricity", value: "Electricity" },
    { label: "Maintenance", value: "Maintenance" },
    { label: "Salary", value: "Salary" },
    { label: "Groceries", value: "Groceries" },
    { label: "Internet", value: "Internet" },
    { label: "Rent", value: "Rent" },
    { label: "Other", value: "Other" }
  ];

  const save = async () => {
    if (!form.title || !form.amount || !form.date) return showToast("Required fields missing", "warn");
    
    try {
      const { error } = await supabase.from('expenses').insert({
        id: uid(),
        ...form,
        amount: Number(form.amount)
      });
      if (error) throw error;
      
      await audit("EXPENSE_ADD", `Added expense: ${form.title} (${formatMoney(form.amount)})`);
      showToast("Expense recorded");
      setModal(false);
      setForm({ title: "", category: "Maintenance", amount: "", date: new Date().toISOString().split('T')[0], notes: "" });
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteExpense = async (id) => {
    if (!await confirm("Are you sure you want to delete this expense?", "Delete Expense", "Delete", "Cancel", "subtle")) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      await audit("EXPENSE_DEL", "Deleted an expense record");
      showToast("Expense deleted");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const total = db.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const thisMonth = db.expenses
    .filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = useMemo(() => {
    let res = db.expenses;
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(e => 
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.amount.toString().includes(q)
      );
    }
    return res.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [db.expenses, search]);

  return (
    <div style={{ padding: 32 }}>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Expense Management</h1>
        <div className="flex-responsive" style={{ gap: 10 }}>
          <Input placeholder="Search..." value={search} onChange={setSearch} style={{ width: 200 }} className="w-full-mobile" />
          <Btn onClick={() => setModal(true)} className="w-full-mobile">+ Add Expense</Btn>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Total Expenses (All Time)</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{formatMoney(total)}</div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Expenses (This Month)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--red)" }}>{formatMoney(thisMonth)}</div>
        </Card>
      </div>

      <Card>
        <Table 
          headers={["Date", "Title", "Category", "Amount", "Notes", "Action"]}
          rows={filteredExpenses}
          renderRow={e => (
            <>
              <TD>{e.date}</TD>
              <TD>{e.title}</TD>
              <TD><span style={{ fontSize: 11, background: "var(--surface2)", padding: "2px 8px", borderRadius: 12 }}>{e.category}</span></TD>
              <TD style={{ fontWeight: 600 }}>{formatMoney(e.amount)}</TD>
              <TD>
                <div style={{ fontSize: 12, maxWidth: 300, lineHeight: 1.4 }}>
                   {e.notes ? e.notes.split('|').map((part, i) => (
                      <div key={i}>{part.trim()}</div>
                   )) : '-'}
                </div>
              </TD>
              <TD>
                <Btn variant="ghost" onClick={() => deleteExpense(e.id)} style={{ color: "var(--red)", padding: "4px 8px" }}>Delete</Btn>
              </TD>
            </>
          )}
        />
      </Card>

      <Modal open={modal} title="Add Expense" onClose={() => setModal(false)}>
        <Input label="Expense Title" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="e.g. Utility Bill" />
        <Select label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={categories} />
        <Input label="Amount" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
        <Input label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
        <Textarea label="Notes (Optional)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
        <div className="flex-responsive" style={{ justifyContent: "flex-end", marginTop: 24 }}>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save}>Save Expense</Btn>
        </div>
      </Modal>
    </div>
  );
}
