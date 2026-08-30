"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabaseClient";
import AuthShell from "../../components/auth/AuthShell";

type Mode = "login" | "signup";

export default function LoginClient() {
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [researchConfirmed, setResearchConfirmed] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("mode");

      if (requestedMode === "signup") {
        setMode("signup");
      }

      const savedRememberMe = localStorage.getItem("pugpep_remember_me");
      if (savedRememberMe === "false") {
        setRememberMe(false);
      } else if (savedRememberMe === "true") {
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function resetMessage() {
    setMessage("");
    setIsError(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    resetMessage();

    try {
      localStorage.setItem(
        "pugpep_remember_me",
        rememberMe ? "true" : "false"
      );

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw error;
      }

      const params = new URLSearchParams(window.location.search);
      const queryRedirect = params.get("redirect");
      const savedRedirect = localStorage.getItem("pugpep_redirect_after_login");

      const redirect =
        queryRedirect && queryRedirect.startsWith("/")
          ? queryRedirect
          : savedRedirect && savedRedirect.startsWith("/")
          ? savedRedirect
          : "/account";

      localStorage.removeItem("pugpep_redirect_after_login");

      setMessage("Logged in successfully.");
      window.location.href = redirect;
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not log you in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    resetMessage();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanOrganization = organization.trim();
    const cleanDisplayName =
      displayName.trim() || cleanFirstName || cleanEmail.split("@")[0];

    if (!cleanFirstName || !cleanLastName) {
      setIsError(true);
      setMessage("Please enter your first and last name.");
      return;
    }

    if (!cleanOrganization) {
      setIsError(true);
      setMessage("Please enter your organization or lab name.");
      return;
    }

    if (!ageConfirmed || !researchConfirmed) {
      setIsError(true);
      setMessage(
        "Please confirm age and independent research/laboratory eligibility."
      );
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
      localStorage.setItem(
        "pugpep_remember_me",
        rememberMe ? "true" : "false"
      );

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            display_name: cleanDisplayName,
            phone: cleanPhone || null,
            organization: cleanOrganization,
            age_confirmed: true,
            research_confirmed: true,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        throw error;
      }

      setIsError(false);
      setMessage(
        "Your account was created. Check your email and click the confirmation link before logging in."
      );

      setFirstName("");
      setLastName("");
      setDisplayName("");
      setPhone("");
      setOrganization("");
      setEmail("");
      setPassword("");
      setAgeConfirmed(false);
      setResearchConfirmed(false);
      setMode("login");
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

  const footer = (
    <div style={footerRow}>
      <Link href="/" style={footerLink}>
        Return Home
      </Link>

      <Link href="/forgot-password" style={footerLinkSecondary}>
        Forgot Password?
      </Link>
    </div>
  );

  return (
    <AuthShell
      eyebrow="PUGPEP ACCOUNT ACCESS"
      title={mode === "login" ? "Login or Register" : "Create Your Account"}
      subtitle="Vibrant neon styling, faster access, and a shared glass-card layout to match the PUGPEP brand."
      footer={footer}
    >
      <div style={toggleWrap}>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            resetMessage();
          }}
          style={{
            ...toggleButton,
            ...(mode === "login" ? toggleButtonActiveBlue : {}),
          }}
        >
          Login
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("signup");
            resetMessage();
          }}
          style={{
            ...toggleButton,
            ...(mode === "signup" ? toggleButtonActivePink : {}),
          }}
        >
          Register
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} style={form}>
          <label style={label}>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={input}
              required
            />
          </label>

          <label style={label}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={input}
              required
            />
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              style={checkbox}
            />
            <span>Remember Me</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...primaryButton,
              opacity: loading ? 0.72 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup} style={form}>
          <div style={twoCol}>
            <label style={label}>
              First Name
              <input
                type="text"
                autoComplete="given-name"
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                style={input}
                required
              />
            </label>

            <label style={label}>
              Last Name
              <input
                type="text"
                autoComplete="family-name"
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                style={input}
                required
              />
            </label>
          </div>

          <label style={label}>
            Display Name
            <input
              type="text"
              autoComplete="nickname"
              placeholder="Optional display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              style={input}
            />
          </label>

          <label style={label}>
            Organization / Lab Name
            <input
              type="text"
              autoComplete="organization"
              placeholder="Organization or laboratory name"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              style={input}
              required
            />
          </label>

          <label style={label}>
            Phone Number
            <input
              type="tel"
              autoComplete="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              style={input}
            />
          </label>

          <label style={label}>
            Email
            <input
              type="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={input}
              required
            />
          </label>

          <label style={label}>
            Password
            <input
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={input}
              minLength={8}
              required
            />
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
              style={checkbox}
            />
            <span>I confirm I am 21 years of age or older.</span>
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={researchConfirmed}
              onChange={(event) => setResearchConfirmed(event.target.checked)}
              style={checkbox}
            />
            <span>
              I confirm I represent an independent research laboratory,
              organization, or qualified research entity, and I understand the
              products are for research use only.
            </span>
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              style={checkbox}
            />
            <span>Remember Me</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...primaryButtonPink,
              opacity: loading ? 0.72 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>
      )}

      {message ? (
        <div
          style={{
            ...messageBox,
            ...(isError ? messageError : messageSuccess),
          }}
        >
          {message}
        </div>
      ) : null}
    </AuthShell>
  );
}

const form = {
  display: "grid",
  gap: 14,
};

const twoCol = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const label = {
  display: "grid",
  gap: 8,
  fontWeight: 700,
  color: "#f6f7fb",
  fontSize: 14,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(8, 14, 24, .54)",
  color: "#fff",
  padding: "14px 14px",
  outline: "none",
  fontSize: 15,
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,.03), 0 0 18px rgba(0,217,255,.06)",
};

const toggleWrap = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 18,
};

const toggleButton = {
  borderRadius: 14,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.05)",
  color: "#fff",
  fontWeight: 900,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const toggleButtonActiveBlue = {
  border: "1px solid #00d9ff",
  background: "rgba(0,217,255,.16)",
  boxShadow: "0 0 20px rgba(0,217,255,.24)",
  color: "#86f6ff",
};

const toggleButtonActivePink = {
  border: "1px solid #ff2fd0",
  background: "rgba(255,47,208,.16)",
  boxShadow: "0 0 20px rgba(255,47,208,.24)",
  color: "#ff87e9",
};

const checkRow = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  lineHeight: 1.45,
  color: "rgba(255,255,255,.92)",
  fontSize: 14,
};

const checkbox = {
  marginTop: 3,
  width: 16,
  height: 16,
  accentColor: "#00d9ff",
};

const primaryButton = {
  border: "1px solid #00d9ff",
  borderRadius: 16,
  padding: "14px 16px",
  background:
    "linear-gradient(135deg, rgba(0,217,255,.94), rgba(0,132,255,.88))",
  color: "#04111b",
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  boxShadow: "0 0 24px rgba(0,217,255,.35)",
};

const primaryButtonPink = {
  border: "1px solid #ff2fd0",
  borderRadius: 16,
  padding: "14px 16px",
  background:
    "linear-gradient(135deg, rgba(255,47,208,.96), rgba(160,70,255,.90))",
  color: "#130717",
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  boxShadow: "0 0 24px rgba(255,47,208,.35)",
};

const messageBox = {
  marginTop: 16,
  padding: "14px 16px",
  borderRadius: 14,
  fontSize: 14,
  lineHeight: 1.55,
  fontWeight: 700,
};

const messageSuccess = {
  border: "1px solid rgba(0,255,153,.45)",
  background: "rgba(0,255,153,.10)",
  color: "#92ffd0",
  boxShadow: "0 0 18px rgba(0,255,153,.14)",
};

const messageError = {
  border: "1px solid rgba(255,88,130,.42)",
  background: "rgba(255,88,130,.10)",
  color: "#ffb0c1",
  boxShadow: "0 0 18px rgba(255,88,130,.12)",
};

const footerRow = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap" as const,
  justifyContent: "space-between",
  alignItems: "center",
};

const footerLink = {
  color: "#86f6ff",
  textDecoration: "none",
  fontWeight: 800,
};

const footerLinkSecondary = {
  color: "#ff87e9",
  textDecoration: "none",
  fontWeight: 800,
};