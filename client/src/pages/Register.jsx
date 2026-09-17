// Register.jsx — LAMP UI Theme

import { useState } from "react";
import api from "../api";
import { Shield, Mail, Lock, Eye, EyeOff, User, Zap } from "lucide-react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

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

  .lamp-glow-strip {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(234,179,8,0.5), transparent);
  }

  /* ── Left Panel ── */
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

  .lamp-divider {
    width: 48px;
    height: 2px;
    background: linear-gradient(to right, #eab308, transparent);
    border-radius: 2px;
    margin-bottom: 28px;
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

  /* ── Right Panel ── */
  .lamp-right {
    padding: 48px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .lamp-mobile-icon {
    display: none;
    margin-bottom: 24px;
    justify-content: center;
  }

  @media (max-width: 640px) {
    .lamp-mobile-icon { display: flex; }
  }

  .lamp-heading {
    font-family: 'DM Serif Display', serif;
    font-size: 34px;
    color: #fef9c3;
    margin-bottom: 6px;
    line-height: 1.1;
  }

  .lamp-subheading {
    color: #6b6450;
    font-size: 13.5px;
    margin-bottom: 28px;
    font-weight: 300;
  }

  /* ── Field ── */
  .lamp-field {
    position: relative;
    margin-bottom: 14px;
  }

  .lamp-field-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7a7060;
    margin-bottom: 7px;
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
    display: flex;
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
    -webkit-appearance: none;
    appearance: none;
  }

  .lamp-input::placeholder { color: #4a4535; }

  .lamp-input:focus {
    border-color: rgba(234,179,8,0.5);
    background: rgba(234,179,8,0.04);
    box-shadow: 0 0 0 3px rgba(234,179,8,0.08), 0 0 12px rgba(234,179,8,0.06) inset;
  }

  /* password toggle */
  .lamp-eye-btn {
    position: absolute;
    right: 14px;
    background: none;
    border: none;
    cursor: pointer;
    color: #4a4535;
    display: flex;
    align-items: center;
    padding: 0;
    transition: color 0.2s;
    z-index: 2;
  }

  .lamp-eye-btn:hover { color: #eab308; }

  /* ── Strength bar ── */
  .lamp-strength {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .lamp-strength-seg {
    height: 3px;
    flex: 1;
    border-radius: 2px;
    background: rgba(255,255,255,0.07);
    transition: background 0.3s;
  }

  .lamp-strength-seg.weak   { background: #dc2626; }
  .lamp-strength-seg.fair   { background: #f97316; }
  .lamp-strength-seg.good   { background: #eab308; }
  .lamp-strength-seg.strong { background: #22c55e; }

  .lamp-strength-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 4px;
    color: #6b6450;
    height: 14px;
  }

  /* ── Button ── */
  .lamp-btn {
    margin-top: 6px;
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

  .lamp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

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

  .lamp-footer {
    margin-top: 24px;
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
`;

function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_META = [
  { label: "", cls: "" },
  { label: "Weak", cls: "weak" },
  { label: "Fair", cls: "fair" },
  { label: "Good", cls: "good" },
  { label: "Strong", cls: "strong" },
];

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const { label: strengthLabel, cls: strengthCls } = STRENGTH_META[strength];

  const handleRegister = async () => {
    try {
      setLoading(true);
      await api.post("/auth/register", {
          name,
          email,
          password,
        });
      alert("Registration Successful 🚀");
      window.location.href = "/login";
    } catch (error) {
      alert("Registration Failed");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>

      <div className="lamp-root">
        {/* Lamp */}
        <div className="lamp-wire" />
        <div className="lamp-bulb" />
        <div className="lamp-cone" />
        <div className="lamp-cone-bright" />

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
              Join thousands of engineers who trust APIVIGIL to monitor,
              protect, and predict the health of their API infrastructure
              around the clock.
            </p>

            <div className="lamp-feature">
              <div className="lamp-feature-icon amber">
                <Zap color="#eab308" size={18} />
              </div>
              <div>
                <div className="lamp-feature-title">Instant Setup</div>
                <div className="lamp-feature-desc">
                  Connect your APIs in minutes. No agents required.
                </div>
              </div>
            </div>

            <div className="lamp-feature">
              <div className="lamp-feature-icon orange">
                <Shield color="#f97316" size={18} />
              </div>
              <div>
                <div className="lamp-feature-title">Enterprise Security</div>
                <div className="lamp-feature-desc">
                  SOC 2 compliant. Your data stays yours.
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

            <h2 className="lamp-heading">Create Account</h2>
            <p className="lamp-subheading">
              Start monitoring your infrastructure today.
            </p>

            {/* Name */}
            <div className="lamp-field">
              <label className="lamp-field-label">Full Name</label>
              <div className="lamp-field-wrap">
                <span className="lamp-field-icon">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="lamp-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="lamp-field">
              <label className="lamp-field-label">Email Address</label>
              <div className="lamp-field-wrap">
                <span className="lamp-field-icon">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="lamp-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lamp-field" style={{ marginBottom: 20 }}>
              <label className="lamp-field-label">Password</label>
              <div className="lamp-field-wrap">
                <span className="lamp-field-icon">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="lamp-input"
                  style={{ paddingRight: "42px" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  className="lamp-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <>
                  <div className="lamp-strength">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`lamp-strength-seg ${i <= strength ? strengthCls : ""}`}
                      />
                    ))}
                  </div>
                  <div className="lamp-strength-label">{strengthLabel}</div>
                </>
              )}
            </div>

            {/* CTA */}
            <button
              className="lamp-btn"
              onClick={handleRegister}
              disabled={loading}
              type="button"
            >
              {loading && <span className="lamp-spinner" />}
              {loading ? "Creating Account…" : "Create Account"}
            </button>

            <p className="lamp-footer">
              Already have an account?{" "}
              <span
                className="lamp-footer-link"
                onClick={() => (window.location.href = "/login")}
              >
                Login
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;
