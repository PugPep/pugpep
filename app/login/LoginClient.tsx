"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabaseClient";

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
    <SplitAuthShell
      eyebrow="PUGPEP ACCOUNT ACCESS"
      title={mode === "login" ? "Login or Register" : "Create Your Account"}
      subtitle="Welcome to PugPep. Access your laboratory research account or create a new one."
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
    </SplitAuthShell>
  );
}


/**
 * Split login layout is intentionally self-contained. The legacy AuthShell
 * is not modified, so password-reset and other auth pages remain unchanged.
 * Optional image: add /public/login-lab.jpg to show your chosen lab photo.
 * Without it, the layered gradient remains a complete, readable design.
 */
function SplitAuthShell({ eyebrow, title, subtitle, footer, children }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="pp-login-page">
      <div className="pp-login-layout">
        <section className="pp-login-visual" aria-label="Welcome to PugPep">
          <div className="pp-login-photo" aria-hidden="true" />
          <div className="pp-login-visual-content">
            <div className="pp-login-brand">PUG<span>PEP</span></div>
            <div className="pp-login-visual-bottom">
              <span className="pp-login-kicker">RESEARCH • QUALITY • DISCOVERY</span>
              <h2>Welcome to the future of biotech.</h2>
              <p>A dedicated space for independent laboratory research.</p>
              <div className="pp-login-rule" />
              <span className="pp-login-small">FOR RESEARCH USE ONLY</span>
            </div>
          </div>
        </section>
        <section className="pp-login-form-panel">
          <div className="pp-login-form-inner">
            <p className="pp-login-eyebrow">{eyebrow}</p>
            <h1 className="pp-login-heading">{title}</h1>
            <p className="pp-login-subtitle">{subtitle}</p>
            {children}
            <div className="pp-login-footer">{footer}</div>
          </div>
        </section>
      </div>
      <style jsx>{`
        .pp-login-page { min-height: 100vh; display: grid; place-items: center; padding: 90px 24px 42px; background: radial-gradient(ellipse at 5% 12%, #133347 0, transparent 40%), radial-gradient(ellipse at 90% 90%, #152b38 0, transparent 40%), #080e16; color: #f7fbff; box-sizing: border-box; }
        .pp-login-layout { display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(0, 1fr); width: min(1100px, 100%); min-height: 630px; border: 1px solid rgba(195,226,240,.18); border-radius: 24px; overflow: hidden; box-shadow: 0 30px 85px rgba(0,0,0,.48); background: #0e1722; }
        .pp-login-visual { position: relative; min-height: 630px; overflow: hidden; background: linear-gradient(145deg, #123b4f, #0c2736 55%, #133445); isolation: isolate; }
        .pp-login-photo { position: absolute; inset: 0; background-image: linear-gradient(180deg, rgba(2,13,22,.18) 0%, rgba(2,14,23,.2) 34%, rgba(2,14,23,.92) 100%), url('/login-lab.jpg'); background-position: center; background-size: cover; background-repeat: no-repeat; z-index: -1; }
        .pp-login-visual::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(130deg, rgba(19,179,209,.2), transparent 52%, rgba(191,64,140,.1)); z-index: -1; }
        .pp-login-visual-content { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: clamp(28px, 4vw, 52px); }
        .pp-login-brand { width: fit-content; font-size: clamp(28px, 3vw, 39px); font-weight: 950; letter-spacing: -.055em; color: #76e0f3; text-shadow: 0 2px 22px rgba(0,0,0,.3); }
        .pp-login-brand span { color: #f19ac7; }
        .pp-login-visual-bottom h2 { font-size: clamp(29px, 3vw, 42px); letter-spacing: -.035em; line-height: 1.14; margin: 14px 0; max-width: 420px; }
        .pp-login-visual-bottom p { font-size: 16px; line-height: 1.55; color: #e0edf3; max-width: 360px; }
        .pp-login-kicker, .pp-login-small { font-size: 11px; letter-spacing: .17em; font-weight: 800; color: #c1e8f0; }
        .pp-login-rule { height: 1px; background: rgba(255,255,255,.25); margin: 27px 0 16px; max-width: 240px; }
        .pp-login-form-panel { min-width: 0; background: linear-gradient(150deg, #111d2b, #0b111a 74%); display: flex; align-items: center; justify-content: center; padding: clamp(26px, 4vw, 52px); box-sizing: border-box; }
        .pp-login-form-inner { width: 100%; max-width: 450px; }
        .pp-login-eyebrow { color: #8bdce9; font-size: 11px; font-weight: 850; letter-spacing: .16em; margin: 0 0 12px; }
        .pp-login-heading { font-size: clamp(30px, 3vw, 41px); line-height: 1.12; letter-spacing: -.025em; margin: 0 0 13px; }
        .pp-login-subtitle { font-size: 14px; line-height: 1.65; margin: 0 0 26px; color: #b5c4d1; }
        .pp-login-footer { margin-top: 21px; }
        @media (max-width: 780px) {
          .pp-login-page { padding: 80px 14px 28px; align-items: start; }
          .pp-login-layout { grid-template-columns: minmax(0,1fr); min-height: auto; border-radius: 18px; }
          .pp-login-visual { min-height: 220px; }
          .pp-login-visual-content { padding: 24px; }
          .pp-login-visual-bottom h2 { font-size: 26px; margin: 8px 0 3px; }
          .pp-login-visual-bottom p { font-size: 13px; margin: 0; }
          .pp-login-rule, .pp-login-small { display: none; }
          .pp-login-brand { font-size: 27px; margin-bottom: 26px; }
          .pp-login-form-panel { padding: 28px 22px 32px; }
        }
        @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
      `}</style>
    </main>
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