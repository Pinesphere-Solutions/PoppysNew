import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import machineIcon from "../../assets/images/1.png";
import bgImage from "../../assets/images/2.jpg";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add authentication logic here if needed
    navigate("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: `url(${bgImage}) center center/cover no-repeat fixed`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.97)",
          borderRadius: 18,
          boxShadow: "0 8px 32px rgba(49,130,206,0.13)",
          padding: "40px 36px 32px 36px",
          width: 350,
          maxWidth: "90vw",
          position: "relative",
          backdropFilter: "blur(2px)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            flexDirection: "column",
          }}
        >
          <img
            src={machineIcon}
            alt="Sewing Machine Icon"
            style={{
              width: 60,
              height: 60,
              objectFit: "contain",
              marginBottom: 10,
              
            }}
          />
          <h2
            style={{
              fontWeight: 700,
              fontSize: 24,
              color: "#3182ce",
              margin: "18px 0 0 0",
              letterSpacing: 1,
            }}
          >
            Sewing Machine Login
          </h2>
          <span
            style={{
              fontSize: 15,
              color: "#64748b",
              marginTop: 6,
              letterSpacing: 0.2,
            }}
          >
            Welcome! Please sign in to continue.
          </span>
        </div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="username"
              style={{
                fontWeight: 500,
                color: "#374151",
                marginBottom: 6,
                display: "block",
                fontSize: 15,
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{
                width: "90%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 16,
                background: "#f8fafc",
                outline: "none",
                transition: "border 0.2s",
                marginBottom: 2,
              }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 18, position: "relative" }}>
            <label
              htmlFor="password"
              style={{
                fontWeight: 500,
                color: "#374151",
                marginBottom: 6,
                display: "block",
                fontSize: 15,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "83%",
                padding: "12px 44px 12px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 16,
                background: "#f8fafc",
                outline: "none",
                transition: "border 0.2s",
                marginBottom: 2,
              }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPass((v) => !v)}
              style={{
                position: "absolute",
                right: 10,
                top: 36,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#3182ce",
                fontSize: 18,
                padding: 0,
              }}
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#3182ce" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="#3182ce" strokeWidth="2" />
                  <line x1="4" y1="4" x2="20" y2="20" stroke="#3182ce" strokeWidth="2" />
                </svg>
              ) : (
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#3182ce" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="#3182ce" strokeWidth="2" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              background: "linear-gradient(90deg, #3182ce 60%, #63b3ed 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 17,
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              marginTop: 8,
              boxShadow: "0 2px 8px rgba(49,130,206,0.08)",
              cursor: "pointer",
              transition: "background 0.2s",
              letterSpacing: 1,
            }}
          >
            Login
          </button>
        </form>
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            color: "#64748b",
            fontSize: 14,
            letterSpacing: 0.2,
          }}
        >
          <span>
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              style={{ verticalAlign: "middle", marginRight: 4 }}
            >
              <rect x="2" y="7" width="20" height="10" rx="5" fill="#cbd5e1" />
              <rect x="7" y="10" width="10" height="4" rx="2" fill="#3182ce" />
            </svg>
            Secure access for authorized personnel only.
          </span>
        </div>
      </div>
    </div>
  );
}
export default Login;