import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginTeacher } from "../../firebase/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  setError("");

  if (!email.trim() || !password) {
    setError("Please enter email and password.");
    return;
  }

  try {
    setLoading(true);

    await loginTeacher(email.trim(), password);

    // Login successful → Home Page
    navigate("/home", { replace: true });

  } catch (err: any) {
    console.error("Login error:", err);

    if (err?.code === "auth/invalid-credential") {
      setError("Invalid email or password.");
    } else if (err?.code === "auth/user-not-found") {
      setError("Teacher account not found.");
    } else if (err?.code === "auth/wrong-password") {
      setError("Incorrect password.");
    } else if (err?.code === "auth/invalid-email") {
      setError("Please enter a valid email.");
    } else {
      setError(err?.message || "Login failed. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020814",
        padding: "20px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#071321",
          border: "1px solid #1d3045",
          borderRadius: "18px",
          padding: "35px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "3px",
              color: "#f5c400",
              marginBottom: "8px",
            }}
          >
            CRICKET
          </div>

          <h1
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "30px",
            }}
          >
            Quiz Arena
          </h1>

          <p
            style={{
              color: "#8290a3",
              marginTop: "10px",
            }}
          >
            Teacher Login
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                color: "#cbd5e1",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              autoComplete="email"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "10px",
                border: "1px solid #294057",
                background: "#020b16",
                color: "#ffffff",
                outline: "none",
                fontSize: "15px",
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                color: "#cbd5e1",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                borderRadius: "10px",
                border: "1px solid #294057",
                background: "#020b16",
                color: "#ffffff",
                outline: "none",
                fontSize: "15px",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "18px",
                padding: "11px 13px",
                borderRadius: "9px",
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.35)",
                color: "#ff7b7b",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: loading ? "#806900" : "#f5c400",
              color: "#071321",
              fontWeight: 800,
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
            color: "#8290a3",
            fontSize: "14px",
          }}
        >
          Don't have a teacher account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{
              border: "none",
              background: "transparent",
              color: "#f5c400",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Register
          </button>
        </div>
      </section>
    </main>
  );
}