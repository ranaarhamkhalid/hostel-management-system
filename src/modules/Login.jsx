import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Forms';
import { Btn } from '../components/ui/Btn';

export default function Login() {
  const { login, session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return showToast("Please fill all fields", "warn");
    
    setLoading(true);
    try {
      await login(email, password);
      showToast("Welcome back!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
      <Card style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-.5px", marginBottom: 8 }}>
            HostelPro
          </div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>Professional Hostel Management System</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Input label="Email Address" type="email" value={email} onChange={setEmail} />
          <Input label="Password" type="password" value={password} onChange={setPassword} />
          
          <Btn disabled={loading} style={{ justifyContent: "center", padding: 12, marginTop: 10 }}>
            {loading ? "Signing in..." : "Sign In"}
          </Btn>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--text4)" }}>
          &copy; {new Date().getFullYear()} HostelPro. All rights reserved.
        </div>
      </Card>
    </div>
  );
}
