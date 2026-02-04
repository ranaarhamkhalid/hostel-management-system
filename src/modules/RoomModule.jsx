import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { Card, CardHead } from '../components/ui/Card';
import { Btn } from '../components/ui/Btn';
import { Badge } from '../components/ui/Badge';
import { Table, TD } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Forms';
import { ROOM_TYPES } from '../lib/constants';
import { uid } from '../lib/utils';

export default function RoomModule() {
  const { db, refresh, audit, supabase } = useData();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [seatEdits, setSeatEdits] = useState([]);

  const filteredRooms = useMemo(() => {
    if (!search) return db.rooms;
    const q = search.toLowerCase();
    return db.rooms.filter(r => 
      r.number.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
    );
  }, [db.rooms, search]);

  useEffect(() => {
    if (editId) {
      const seats = db.seats.filter(s => s.room_id === editId).sort((a, b) => a.seat_number - b.seat_number);
      setSeatEdits(seats);
    } else {
      setSeatEdits([]);
    }
  }, [editId, db.seats]);

  const save = async () => {
    const finalType = form.type || "2-seat"; // Ensure type defaults to 2-seat if missing
    if (!form.number) return showToast("Please enter room number", "warn");
    if (db.rooms.some(r => r.number === form.number && r.id !== editId)) return showToast("Room number exists", "error");

    try {
      if (editId) {
        // Update Room
        const { error } = await supabase.from('rooms').update({
          number: form.number,
          type: finalType,
          // rent is deprecated
        }).eq('id', editId);
        
        if (error) throw error;

        // Handle Capacity Change (Add/Remove Seats)
        const newCap = ROOM_TYPES.find(t => t.value === finalType)?.cap || 0;
        const currentSeats = db.seats.filter(s => s.room_id === editId);
        const currentCap = currentSeats.length;

        if (newCap > currentCap) {
          // Add extra seats
          const newSeats = [];
          for (let i = currentCap + 1; i <= newCap; i++) {
            newSeats.push({
              room_id: editId,
              seat_number: i,
              rent: Number(form.defaultSeatRent || 0) // Try to use form default if available, else 0
            });
          }
          const { error: addErr } = await supabase.from('seats').insert(newSeats);
          if (addErr) throw addErr;
        } else if (newCap < currentCap) {
          // Remove extra seats
          const seatsToRemove = currentSeats.filter(s => s.seat_number > newCap);
          const occupied = seatsToRemove.some(s => s.resident_id);
          
          if (occupied) {
            throw new Error(`Cannot change to ${ROOM_TYPES.find(t => t.value === finalType)?.label}: Seat(s) ${seatsToRemove.filter(s => s.resident_id).map(s => s.seat_number).join(', ')} are occupied.`);
          }

          const idsToRemove = seatsToRemove.map(s => s.id);
          if (idsToRemove.length > 0) {
            const { error: delErr } = await supabase.from('seats').delete().in('id', idsToRemove);
            if (delErr) throw delErr;
          }
        }

        // Update Seats (Rent)
        if (seatEdits.length > 0) {
           const { error: sErr } = await supabase.from('seats').upsert(
             seatEdits.map(s => ({
               id: s.id,
               room_id: editId,
               seat_number: s.seat_number,
               rent: Number(s.rent || 0),
               resident_id: s.resident_id // Keep resident
             }))
           );
           if (sErr) throw sErr;
        }

        await audit("ROOM_EDIT", `Room ${form.number} updated`);
        showToast("Room updated");
      } else {
        const id = uid();
        const cap = ROOM_TYPES.find(t => t.value === finalType)?.cap || 0;
        
        const { error: rErr } = await supabase.from('rooms').insert({
          id,
          number: form.number,
          type: finalType,
          // rent: 0
        });
        if (rErr) throw rErr;

        if (cap > 0) {
          const seats = Array.from({ length: cap }, (_, i) => ({
            room_id: id,
            seat_number: i + 1,
            rent: Number(form.defaultSeatRent || 0)
          }));
          const { error: sErr } = await supabase.from('seats').insert(seats);
          if (sErr) throw sErr;
        }

        await audit("ROOM_ADD", `Room ${form.number} added`);
        showToast("Room added");
      }
      setModal(false);
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const del = async (id) => {
    if (!await confirm("Delete room?", "Delete Room", "Delete", "Cancel", "subtle")) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      await audit("ROOM_DEL", "Room deleted");
      showToast("Room deleted");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <Card>
      <CardHead title="Rooms Management" action={
        <div className="flex-responsive card-header-actions">
          <Input placeholder="Search..." value={search} onChange={setSearch} style={{ width: 200 }} className="w-full-mobile" />
          <Btn onClick={() => { setForm({ number: "", defaultSeatRent: 0, type: "2-seat" }); setEditId(null); setModal(true); }}>+ Add Room</Btn>
        </div>
      } />
      
      <Table headers={["Number", "Type", "Rent Range", "Occupancy", "Action"]} rows={filteredRooms} renderRow={r => {
        const seats = db.seats.filter(s => s.room_id === r.id);
        const occ = seats.filter(s => s.resident_id).length;
        const cap = seats.length;
        const rents = seats.map(s => Number(s.rent || 0));
        const minRent = Math.min(...rents, 0);
        const maxRent = Math.max(...rents, 0);
        const rentDisplay = rents.length ? (minRent === maxRent ? minRent.toLocaleString() : `${minRent.toLocaleString()} - ${maxRent.toLocaleString()}`) : "-";

        return (
          <>
            <TD style={{ fontWeight: 700, color: "var(--text)" }}>{r.number}</TD>
            <TD><Badge color="gray">{ROOM_TYPES.find(t => t.value === r.type)?.label || r.type}</Badge></TD>
            <TD>{rentDisplay}</TD>
            <TD>
              <div style={{ display: "flex", gap: 3 }}>
                {seats.map((s, i) => (
                  <div key={i} title={`Seat ${s.seat_number}: ${s.resident_id ? 'Occupied' : 'Vacant'}`} style={{ width: 8, height: 8, borderRadius: "50%", background: s.resident_id ? "var(--accent)" : "var(--border2)" }} />
                ))}
                {cap === 0 && <span style={{ fontSize: 11, color: "var(--text4)" }}>N/A</span>}
              </div>
            </TD>
            <TD>
              <Btn variant="ghost" onClick={() => { setForm(r); setEditId(r.id); setModal(true); }} style={{ padding: "4px 8px", fontSize: 11 }}>Edit</Btn>
              <Btn variant="ghost" onClick={() => del(r.id)} style={{ padding: "4px 8px", fontSize: 11, color: "var(--red)", marginLeft: 6 }}>Del</Btn>
            </TD>
          </>
        );
      }} />

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Edit Room" : "New Room"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Room Number" value={form.number} onChange={v => setForm({ ...form, number: v })} />
          <Select label="Type" value={form.type || "2-seat"} onChange={v => setForm({ ...form, type: v })} options={ROOM_TYPES} />
          
          {!editId && (
            <Input label="Default Seat Rent (PKR)" type="number" value={form.defaultSeatRent} onChange={v => setForm({ ...form, defaultSeatRent: v })} />
          )}

          {editId && seatEdits.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", marginBottom: 8 }}>Seat Rents</div>
              <div className="grid-2">
                {seatEdits.map((s, i) => (
                  <Input 
                    key={s.id} 
                    label={`Seat ${s.seat_number}`} 
                    type="number" 
                    value={s.rent} 
                    onChange={v => {
                      const newSeats = [...seatEdits];
                      newSeats[i] = { ...newSeats[i], rent: v };
                      setSeatEdits(newSeats);
                    }} 
                  />
                ))}
              </div>
            </div>
          )}

          <Btn onClick={save} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Save Room</Btn>
        </div>
      </Modal>
    </Card>
  );
}
