import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import { registerTeacher } from "../../firebase/auth";
import { createTeacherProfile } from "../../firebase/firestore";

import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  // =========================================
  // FORM STATE
  // =========================================
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // REGISTER TEACHER
  // =========================================
  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const teacherName = name.trim();
    const teacherEmail = email.trim();

    // -----------------------------
    // VALIDATION
    // -----------------------------
    if (!teacherName) {
      setError("Please enter your name.");
      return;
    }

    if (teacherName.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (!teacherEmail) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // =========================================
      // CREATE FIREBASE AUTH ACCOUNT
      // Name + Email + Password
      // =========================================
      const user = await registerTeacher(
        teacherName,
        teacherEmail,
        password
      );

      // =========================================
      // SAVE TEACHER PROFILE IN FIRESTORE
      // =========================================
      await createTeacherProfile(
        user.uid,
        user.email || teacherEmail,
        teacherName
      );

      // =========================================
      // SAVE NAME TEMPORARILY
      // Home page can use it immediately
      // =========================================
      sessionStorage.setItem(
        "teacherName",
        teacherName
      );

      // =========================================
      // REGISTRATION SUCCESS
      // GO DIRECTLY TO HOME
      // =========================================
      navigate("/home", {
        replace: true,
      });

    } catch (err: any) {
      console.error("Registration error:", err);

      if (err?.code === "auth/email-already-in-use") {
        setError(
          "This email is already registered. Please login."
        );
      } else if (err?.code === "auth/invalid-email") {
        setError(
          "Please enter a valid email address."
        );
      } else if (err?.code === "auth/weak-password") {
        setError(
          "Password is too weak. Use at least 6 characters."
        );
      } else if (err?.code === "auth/network-request-failed") {
        setError(
          "Network error. Please check your internet connection."
        );
      } else {
        setError(
          err?.message || "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">

      {/* =========================================
          BACKGROUND
      ========================================= */}
      <div className="register-background">

        <div className="register-circle circle-one" />

        <div className="register-circle circle-two" />

      </div>

      {/* =========================================
          REGISTER CARD
      ========================================= */}
      <section className="register-card">

        {/* =========================================
            BRAND
        ========================================= */}
        <div className="register-brand">

          <div className="register-brand-icon">
            🏏
          </div>

          <div>
            <h1>
              CRICKET
            </h1>

            <span>
              QUIZ ARENA
            </span>
          </div>

        </div>

        {/* =========================================
            HEADING
        ========================================= */}
        <div className="register-heading">

          <p>
            TEACHER ACCOUNT
          </p>

          <h2>
            Create Account
          </h2>

          <span>
            Create your account to manage quizzes and matches.
          </span>

        </div>

        {/* =========================================
            REGISTER FORM
        ========================================= */}
        <form onSubmit={handleRegister}>

          {/* =======================================
              TEACHER NAME
          ======================================= */}
          <div className="register-field">

            <label htmlFor="teacher-name">
              TEACHER NAME
            </label>

            <div className="register-input">

              <FaUser />

              <input
                id="teacher-name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                disabled={loading}
                autoComplete="name"
                maxLength={50}
              />

            </div>

          </div>

          {/* =======================================
              EMAIL
          ======================================= */}
          <div className="register-field">

            <label htmlFor="teacher-email">
              EMAIL ADDRESS
            </label>

            <div className="register-input">

              <FaEnvelope />

              <input
                id="teacher-email"
                type="email"
                placeholder="teacher@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                disabled={loading}
                autoComplete="email"
              />

            </div>

          </div>

          {/* =======================================
              PASSWORD
          ======================================= */}
          <div className="register-field">

            <label htmlFor="teacher-password">
              PASSWORD
            </label>

            <div className="register-input">

              <FaLock />

              <input
                id="teacher-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                disabled={loading}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

          </div>

          {/* =======================================
              CONFIRM PASSWORD
          ======================================= */}
          <div className="register-field">

            <label htmlFor="confirm-password">
              CONFIRM PASSWORD
            </label>

            <div className="register-input">

              <FaLock />

              <input
                id="confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                disabled={loading}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (previous) => !previous
                  )
                }
                disabled={loading}
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

          </div>

          {/* =======================================
              ERROR
          ======================================= */}
          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          {/* =======================================
              CREATE ACCOUNT BUTTON
          ======================================= */}
          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading
              ? "CREATING ACCOUNT..."
              : "CREATE ACCOUNT"}
          </button>

        </form>

        {/* =========================================
            LOGIN LINK
        ========================================= */}
        <div className="register-login">

          <span>
            Already have an account?
          </span>

          <Link to="/login">
            LOGIN
          </Link>

        </div>

      </section>

    </main>
  );
}