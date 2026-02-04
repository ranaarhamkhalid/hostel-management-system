import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStats } from '../hooks/useStats';
import { useAuth } from '../context/AuthContext';
import { IconDashboard, IconRoom, IconPerson, IconMess, IconCharge, IconInvoice, IconPayment, IconReport, IconExpense, IconMenu } from './Icons';
import { Btn } from './ui/Btn';

export default function Layout() {
  const stats = useStats();
  const location = useLocation();
  const { logout, session } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navs = [
    { to: "/", label: "Dashboard", icon: IconDashboard },
    { to: "/rooms", label: "Rooms", icon: IconRoom },
    { to: "/residents", label: "Residents", icon: IconPerson },
    { to: "/attendance", label: "Attendance", icon: IconMess },
    { to: "/charges", label: "Custom Charges", icon: IconCharge },
    { to: "/billing", label: "Billing", icon: IconInvoice },
    { to: "/expenses", label: "Expenses", icon: IconExpense },
    { to: "/reports", label: "Reports", icon: IconReport },
  ];

  const getTitle = () => {
    const n = navs.find(n => n.to === location.pathname);
    return n ? n.label : "HostelPro";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" }}>
      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-.5px" }}>HostelPro</div>
        </div>
        
        <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
          {navs.map(n => (
            <NavLink 
              key={n.to} 
              to={n.to} 
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} 
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                color: "var(--text2)", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "var(--transition)"
              }}
            >
              {({ isActive }) => (
                <>
                  <n.icon style={{ color: isActive ? "var(--accent)" : "currentColor", opacity: isActive ? 1 : 0.7 }} />
                  <span style={{ color: isActive ? "var(--text)" : "currentColor", fontWeight: isActive ? 600 : 500 }}>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div style={{ padding: 20, borderTop: "1px solid var(--border)" }}>
          <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 6 }}>OCCUPANCY</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{Math.round((stats.occSeats / (stats.totalSeats || 1)) * 100)}%</div>
              <div style={{ fontSize: 11, color: "var(--text4)" }}>{stats.occSeats}/{stats.totalSeats}</div>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${(stats.occSeats / (stats.totalSeats || 1)) * 100}%`, height: "100%", background: "var(--accent)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header-container">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Btn variant="ghost" className="mobile-header-btn" onClick={() => setSidebarOpen(true)} style={{ padding: 8 }}>
              <IconMenu />
            </Btn>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>{getTitle()}</h1>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", background: "var(--surface2)", padding: "6px 12px", borderRadius: 20 }} className="no-mobile">
              {new Date().toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="hide-mobile" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{session?.user?.email}</span>
                <Btn variant="ghost" onClick={logout} style={{ fontSize: 11, padding: "6px 10px", color: "var(--red)" }}>Log Out</Btn>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
