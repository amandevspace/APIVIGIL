// Login.jsx — LAMP UI Theme

import { useState } from "react";
import api from "../api";
import { Shield, Mail, Lock, Eye, EyeOff, Activity } from "lucide-react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lamp-root {
    min-height: 100vh;
    background: #0f0e0c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* ── Lamp cone ── */
  .lamp-cone {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 220px solid transparent;
    border-right: 220px solid transparent;
    border-top: 420px solid rgba(234, 179, 8, 0.07);
    filter: blur(2px);
    pointer-events: none;
    z-index: 0;
  }

  .lamp-cone-bright {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 110px solid transparent;
    border-right: 110px solid transparent;
    border-top: 280px solid rgba(234, 179, 8, 0.12);
    pointer-events: none;
    z-index: 0;
  }

  .lamp-bulb {
    position: absolute;
    top: -28px;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #fef9c3, #eab308 55%, #a16207);
    box-shadow:
      0 0 0 6px rgba(234,179,8,0.15),
      0 0 40px 20px rgba(234,179,8,0.35),
      0 0 100px 60px rgba(234,179,8,0.1);
    z-index: 1;
  }

  .lamp-wire {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 28px;
    background: linear-gradient(to bottom, #6b7280, #4b5563);
    z-index: 1;
  }

  /* ── Card ── */
  .lamp-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 920px;
    margin: 80px 16px 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: 24px;
    overflow: hidden;
    background: #18170f;
    border: 1px solid rgba(234,179,8,0.12);
    box-shadow:
      0 0 0 1px rgba(234,179,8,0.05),
      0 40px 80px rgba(0,0,0,0.6),
      0 0 60px rgba(234,179,8,0.06) inset;
  }

  @media (max-width: 640px) {
    .lamp-card { grid-template-columns: 1fr; margin-top: 60px; }
    .lamp-left  { display: none; }
  }

  /* ── Left panel ── */
  .lamp-left {
    padding: 52px 40px;
    background: linear-gradient(160deg, rgba(234,179,8,0.08) 0%, transparent 70%);
    border-right: 1px solid rgba(234,179,8,0.1);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .lamp-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
  }

  .lamp-brand-icon {
    background: linear-gradient(135deg, #eab308, #a16207);
    padding: 12px;
    border-radius: 16px;
    box-shadow: 0 0 24px rgba(234,179,8,0.4);
    display: flex;
  }

  .lamp-brand-name {
    font-family: 'DM Serif Display', serif;
    font-size: 32px;
    color: #fef9c3;
    letter-spacing: 0.05em;
  }

  .lamp-tagline {
    color: #a8a088;
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 36px;
    font-weight: 300;
  }

  .lamp-feature {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
  }

  .lamp-feature-icon {
    border-radius: 12px;
    padding: 10px;
    display: flex;
    flex-shrink: 0;
  }

  .lamp-feature-icon.amber  { background: rgba(234,179,8,0.12); }
  .lamp-feature-icon.orange { background: rgba(249,115,22,0.12); }

  .lamp-feature-title {
    font-size: 14px;
    font-weight: 600;
    color: #f5f0dc;
    margin-bottom: 2px;
  }

  .lamp-feature-desc {
    font-size: 12px;
    color: #78715c;
    line-height: 1.5;
  }

  .lamp-divider {
    width: 48px;
    height: 2px;
    background: linear-gradient(to right, #eab308, transparent);
    border-radius: 2px;
    margin-bottom: 28px;
  }

  /* ── Right panel ── */
  .lamp-right {
    padding: 52px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .lamp-mobile-icon {
    display: none;
    margin-bottom: 24px;
  }

  @media (max-width: 640px) {
    .lamp-mobile-icon { display: flex; justify-content: center; }
  }

  .lamp-heading {
    font-family: 'DM Serif Display', serif;
    font-size: 36px;
    color: #fef9c3;
    margin-bottom: 6px;
    line-height: 1.1;
  }

  .lamp-subheading {
    color: #6b6450;
    font-size: 13.5px;
    margin-bottom: 36px;
    font-weight: 300;
  }

  /* ── Field ── */
  .lamp-field {
    position: relative;
    margin-bottom: 16px;
  }

  .lamp-field-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7a7060;
    margin-bottom: 8px;
    display: block;
  }

  .lamp-field-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .lamp-field-icon {
    position: absolute;
    left: 14px;
    color: #6b6450;
    pointer-events: none;
  }

  .lamp-input {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(234,179,8,0.14);
    border-radius: 12px;
    color: #f5f0dc;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    padding: 13px 14px 13px 42px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }

  .lamp-input::placeholder { color: #4a4535; }

  .lamp-input:focus {
    border-color: rgba(234,179,8,0.5);
    background: rgba(234,179,8,0.04);
    box-shadow: 0 0 0 3px rgba(234,179,8,0.08), 0 0 12px rgba(234,179,8,0.06) inset;
  }

  .lamp-eye-btn {
    position: absolute;
    right: 14px;
    background: none;
    border: none;
    cursor: pointer;
    color: #4a4535;
    display: flex;
    padding: 0;
    transition: color 0.2s;
  }

  .lamp-eye-btn:hover { color: #eab308; }

  /* ── Button ── */
  .lamp-btn {
    margin-top: 8px;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #eab308 0%, #d97706 100%);
    color: #0f0e0c;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 0 24px rgba(234,179,8,0.3), 0 4px 16px rgba(0,0,0,0.4);
  }

  .lamp-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%);
    pointer-events: none;
  }

  .lamp-btn:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 0 36px rgba(234,179,8,0.45), 0 6px 20px rgba(0,0,0,0.4);
  }

  .lamp-btn:not(:disabled):active { transform: translateY(0); }

  .lamp-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* spinner */
  .lamp-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0,0,0,0.3);
    border-top-color: #0f0e0c;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer ── */
  .lamp-footer {
    margin-top: 28px;
    text-align: center;
    font-size: 13px;
    color: #4a4535;
  }

  .lamp-footer-link {
    color: #eab308;
    cursor: pointer;
    font-weight: 600;
    transition: color 0.2s;
  }

  .lamp-footer-link:hover { color: #fef9c3; }

  /* ── Ambient glow strip at top of card ── */
  .lamp-glow-strip {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(234,179,8,0.5), transparent);
  }
`;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      alert("Login Successful 🚀");
      window.location.href = "/";
    } catch (error) {
      alert("Login Failed ❌");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      <div className="lamp-root">
        {/* Lamp fixture */}
        <div className="lamp-wire" />
        <div className="lamp-bulb" />
        <div className="lamp-cone" />
        <div className="lamp-cone-bright" />

        {/* Card */}
        <div className="lamp-card">
          <div className="lamp-glow-strip" />

          {/* ── Left Panel ── */}
          <div className="lamp-left">
            <div className="lamp-brand">
              <div className="lamp-brand-icon">
                <Shield color="#0f0e0c" size={28} />
              </div>
              <span className="lamp-brand-name">APIVIGIL</span>
            </div>

            <div className="lamp-divider" />

            <p className="lamp-tagline">
              Intelligent API monitoring with real-time anomaly detection,
              predictive failure analysis, live alerts, and AI-powered insights.
            </p>

            <div className="lamp-feature">
              <div className="lamp-feature-icon amber">
                <Activity color="#eab308" size={18} />
              </div>
              <div>
                <div className="lamp-feature-title">Real-Time Monitoring</div>
                <div className="lamp-feature-desc">
                  Track APIs, logs, health, CPU &amp; memory instantly.
                </div>
              </div>
            </div>

            <div className="lamp-feature">
              <div className="lamp-feature-icon orange">
                <Shield color="#f97316" size={18} />
              </div>
              <div>
                <div className="lamp-feature-title">AI Failure Prediction</div>
                <div className="lamp-feature-desc">
                  Predict outages before systems fail.
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lamp-right">
            <div className="lamp-mobile-icon">
              <div className="lamp-brand-icon">
                <Shield color="#0f0e0c" size={28} />
              </div>
            </div>

            <h2 className="lamp-heading">Welcome Back</h2>
            <p className="lamp-subheading">
              Login to continue monitoring your infrastructure.
            </p>

            {/* Email */}
            <div className="lamp-field">
              <label className="lamp-field-label">Email Address</label>
              <div className="lamp-field-wrap">
                <Mail className="lamp-field-icon" size={16} />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="lamp-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="lamp-field" style={{ marginBottom: 24 }}>
              <label className="lamp-field-label">Password</label>
              <div className="lamp-field-wrap">
                <Lock className="lamp-field-icon" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="lamp-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="lamp-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* CTA */}
            <button
              className="lamp-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading && <span className="lamp-spinner" />}
              {loading ? "Authenticating…" : "Login Securely"}
            </button>

            <p className="lamp-footer">
              Don&apos;t have an account?{" "}
              <span
                className="lamp-footer-link"
                onClick={() => (window.location.href = "/register")}
              >
                Create Account
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
