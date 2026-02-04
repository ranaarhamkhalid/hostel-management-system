import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmationProvider } from './context/ConfirmationContext';
import Layout from './components/Layout';
import Login from './modules/Login';

// Modules
import Dashboard from './modules/Dashboard';
import RoomModule from './modules/RoomModule';
import ResidentModule from './modules/ResidentModule';
import AttendanceModule from './modules/AttendanceModule';
import ChargesModule from './modules/ChargesModule';
import BillingModule from './modules/BillingModule';
import ExpensesModule from './modules/ExpensesModule';
import ReportsModule from './modules/ReportsModule';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)" }}>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <ConfirmationProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="rooms" element={<RoomModule />} />
                  <Route path="residents" element={<ResidentModule />} />
                  <Route path="attendance" element={<AttendanceModule />} />
                  <Route path="charges" element={<ChargesModule />} />
                  <Route path="billing" element={<BillingModule />} />
                  <Route path="expenses" element={<ExpensesModule />} />
                  <Route path="reports" element={<ReportsModule />} />
        </Route>
              </Routes>
            </ConfirmationProvider>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
