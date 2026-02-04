import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext'; // Use shared supabase client
import { EMPTY, uid } from '../lib/utils';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { supabase, session } = useAuth();
  const [db, setDb] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!supabase || !session) {
        setLoading(false);
        return;
    }
    
    setLoading(true);
    try {
      // Fetch all tables in parallel
      const [
        { data: rooms },
        { data: seats },
        { data: residents },
        { data: messAttendance },
        { data: customCharges },
        { data: invoices },
        { data: payments },
        { data: settings },
        { data: auditLog },
        { data: expenses },
        { data: residentHistory }
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('seats').select('*'),
        supabase.from('residents').select('*'),
        supabase.from('mess_attendance').select('*'),
        supabase.from('custom_charges').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('expenses').select('*'),
        supabase.from('resident_history').select('*')
      ]);

      const settingsMap = settings ? settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) : {};

      setDb({
        rooms: rooms || [],
        seats: seats || [],
        residents: residents || [],
        messAttendance: messAttendance || [],
        customCharges: customCharges || [],
        invoices: invoices || [],
        payments: payments || [],
        auditLog: auditLog || [],
        expenses: expenses || [],
        residentHistory: residentHistory || [],
        mealPrices: settingsMap.meal_prices || { breakfast: 0, lunch: 0, dinner: 0 },
        defaultDeposit: Number(settingsMap.default_deposit || 0)
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const refresh = () => fetchData();

  const audit = async (action, details) => {
    if (!supabase) return;
    try {
      await supabase.from('audit_log').insert({
        id: uid(),
        action,
        details,
        created_at: new Date().toISOString()
      });
      // Optimistic update
      setDb(prev => ({
        ...prev,
        auditLog: [{ id: uid(), action, details, created_at: new Date().toISOString() }, ...prev.auditLog].slice(0, 50)
      }));
    } catch (err) {
      console.error("Audit error:", err);
    }
  };

  return (
    <DataContext.Provider value={{ db, refresh, audit, supabase, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
