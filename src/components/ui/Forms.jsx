import React from 'react';

export function Input({ label, type = "text", value, onChange, style, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>{label}</label>}
      <input 
        type={type} 
        value={value || ""} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, background: "var(--surface2)", color: "var(--text)", outline: "none", transition: "var(--transition)" }}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border2)"}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>{label}</label>}
      <select 
        value={value || ""} 
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, background: "var(--surface2)", color: "var(--text)", outline: "none" }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Textarea({ label, value, onChange, style, placeholder, rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>{label}</label>}
      <textarea 
        value={value || ""} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border2)", fontSize: 13, background: "var(--surface2)", color: "var(--text)", outline: "none", transition: "var(--transition)", resize: "vertical", fontFamily: "inherit" }}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border2)"}
      />
    </div>
  );
}
