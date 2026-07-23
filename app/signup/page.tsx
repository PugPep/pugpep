"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function SignupPage() {
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanDisplayName =
      displayName.trim() || cleanFirstName || cleanEmail.split("@")[0];
    const cleanPhone = phone.trim();

    if (!cleanFirstName || !cleanLastName) {
      setIsError(true);
      setMessage("Please enter your first and last name.");
      return;
    }

    if (!cleanEmail) {
      setIsError(true);
      setMessage("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            display_name: cleanDisplayName,
            phone: cleanPhone || null,
          },

          // Change this to your actual website URL if needed.
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        throw error;
      }

      setMessage(
        "Your account was created. Check your email and click the confirmation link before logging in."
      );

      setFirstName("");
      setLastName("");
      setDisplayName("");
      setPhone("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "We could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#111",
    color: "#fff",
    fontSize: "16px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "16px",
    color: "#fff",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          margin: "0 auto",
          padding: "30px",
          border: "1px solid #222",
          borderRadius: "16px",
          background: "#080808",
        }}
      >
        <h1
          style={{
            color: "#ff45d8",
            marginBottom: "8px",
          }}
        >
          Create Your PugPep Account
        </h1>

        <p
          style={{
            color: "#aaa",
            marginBottom: "28px",
          }}
        >
          Create an account to manage your information and orders.
        </p>

        <form onSubmit={handleSignup}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <label style={labelStyle}>
              First Name
              <input
                type="text"
                autoComplete="given-name"
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                style={inputStyle}
                required
              />
            </label>

            <label style={labelStyle}>
              Last Name
              <input
                type="text"
                autoComplete="family-name"
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                style={inputStyle}
                required
              />
            </label>
          </div>

          <label style={labelStyle}>
            Display Name
            <input
              type="text"
              autoComplete="nickname"
              placeholder="Name shown on your account"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Phone Number
            <input
              type="tel"
              autoComplete="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={inputStyle}
              required
            />
          </label>

          <label style={labelStyle}>
            Password
            <input
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={inputStyle}
              minLength={8}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "8px",
              background: loading ? "#777" : "#ff45d8",
              color: "#000",
              fontWeight: 700,
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {message && (
          <p
            role={isError ? "alert" : "status"}
            style={{
              marginTop: "20px",
              color: isError ? "#ff6b6b" : "#50f7da",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        )}

        <p
          style={{
            marginTop: "24px",
            color: "#aaa",
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <a
            href="/login"
            style={{
              color: "#50f7da",
              fontWeight: 700,
            }}
          >
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}