import React from 'react';

export function Btn({ children, onClick, variant = "primary", style, disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8,
    fontSize: 13, fontWeight: 600, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1, transition: "var(--transition)",
  };

  const variants = {
    primary: { background: "var(--accent)", color: "#fff" },
    secondary: { background: "var(--surface2)", color: "var(--text)" },
    ghost: { background: "transparent", color: "var(--text2)", padding: "6px 10px" },
    subtle: { background: "var(--red-light)", color: "var(--red)" }
  };

  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}
