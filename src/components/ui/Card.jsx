import React from 'react';

export function Card({ children, style }) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid var(--border)", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

export function CardHead({ title, action }) {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</h3>
      {action}
    </div>
  );
}
