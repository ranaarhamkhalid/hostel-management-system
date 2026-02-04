import React from 'react';

export function Badge({ children, color = "gray" }) {
  const colors = {
    gray: { bg: "#f3f4f6", c: "#374151" },
    accent: { bg: "#ecfdf5", c: "#059669" },
    red: { bg: "#fef2f2", c: "#dc2626" },
    blue: { bg: "#eff6ff", c: "#2563eb" },
    amber: { bg: "#fffbeb", c: "#d97706" },
    purple: { bg: "#f3e8ff", c: "#9333ea" },
  };
  const theme = colors[color] || colors.gray;

  return (
    <span style={{ 
      display: "inline-block", padding: "2px 8px", borderRadius: 12, 
      fontSize: 11, fontWeight: 700, background: theme.bg, color: theme.c 
    }}>
      {children}
    </span>
  );
}
