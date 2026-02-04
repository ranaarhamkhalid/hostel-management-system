import React from 'react';

export function Table({ headers, rows, renderRow }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No data found</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text2)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} style={{ borderBottom: "1px solid var(--border)" }}>
              {renderRow(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TD({ children, style }) {
  return <td style={{ padding: "12px 16px", color: "var(--text2)", ...style }}>{children}</td>;
}
