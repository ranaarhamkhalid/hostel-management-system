import React, { createContext, useContext, useState, useEffect } from 'react';
import { IconCheck, IconX } from '../components/Icons';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (msg, type = "success") => {
    const id = Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "var(--surface)", padding: "12px 16px", borderRadius: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 10,
            borderLeft: `4px solid ${t.type === "error" ? "var(--red)" : t.type === "warn" ? "var(--amber)" : "var(--accent)"}`,
            animation: "slideIn .2s ease-out"
          }}>
            <div style={{ 
              width: 20, height: 20, borderRadius: "50%", 
              background: t.type === "error" ? "var(--red-light)" : "var(--accent-light)",
              color: t.type === "error" ? "var(--red)" : "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {t.type === "error" ? <IconX width={14} /> : <IconCheck width={14} />}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
