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
      subtitle="Access your PugPep research account and continue your work."
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

      {mode === "login" && (
        <div className="pp-login-signup-cta">
          <div className="pp-login-divider"><span>OR</span></div>
          <p>New to PugPep?</p>
          <button type="button" className="pp-login-create-button" onClick={() => { setMode("signup"); resetMessage(); }}>
            CREATE A NEW ACCOUNT <span aria-hidden="true">→</span>
          </button>
        </div>
      )}


      <style jsx global>{`
        .pp-login-signup-cta { margin-top: 24px; }
        .pp-login-divider { display: flex; align-items: center; gap: 16px; color: #a3b2c9; font-size: 12px; }
        .pp-login-divider::before, .pp-login-divider::after { content: ""; height: 1px; flex: 1; background: rgba(186,205,229,.23); }
        .pp-login-signup-cta p { color: #d0dcee; font-size: 14px; margin: 20px 0 12px; }
        .pp-login-create-button { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 15px 18px; border: 1px solid rgba(195,218,250,.7); border-radius: 14px; color: #f5faff; background: transparent; font-size: 14px; letter-spacing: .075em; font-weight: 850; cursor: pointer; }
        .pp-login-create-button:hover { border-color: #20d4f3; background: rgba(32,212,243,.08); }
        .pp-login-create-button:focus-visible { outline: 3px solid #18d5f9; outline-offset: 3px; }
      `}</style>

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
 * Standalone login layout matching the supplied visual concept.
 * Save pugpep-login-visual.png in the project's /public directory.
 * The photograph/branding is a single decorative image on the LEFT;
 * all text, inputs, and buttons on the RIGHT are real HTML controls.
 * No changes to AuthShell.tsx or your Supabase authentication are needed.
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
        <section className="pp-login-visual" aria-label="PugPep — Welcome to the Future of Biotech">
          <img
            className="pp-login-visual-image"
            src="/pugpep-login-visual.png"
            alt="PugPep's laboratory pug mascot and Welcome to the Future of Biotech branding"
          />
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
        .pp-login-page { min-height: 100vh; display: grid; place-items: center; padding: 90px 22px 40px; box-sizing: border-box; color: #f6faff; background: radial-gradient(ellipse at 0% 30%, rgba(0,132,255,.14), transparent 50%), radial-gradient(ellipse at 100% 60%, rgba(232,34,190,.14), transparent 48%), #080d1b; }
        .pp-login-layout { display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(0, 1fr); width: min(1280px,100%); min-height: 740px; background: #09162b; border: 1px solid rgba(0,204,255,.65); border-right-color: rgba(235,38,208,.55); border-radius: 26px; overflow: hidden; box-shadow: 0 28px 100px rgba(0,0,0,.62), 0 0 38px rgba(0,180,255,.13); }
        .pp-login-visual { position: relative; min-height: 740px; overflow: hidden; background: #09162b; }
        .pp-login-visual-image { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 740px; object-fit: cover; object-position: center center; }
        .pp-login-visual::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 88%, rgba(4,12,29,.17)); pointer-events: none; }
        .pp-login-form-panel { min-width: 0; display: flex; justify-content: center; align-items: center; padding: clamp(27px, 4vw, 64px); box-sizing: border-box; background: radial-gradient(ellipse at 100% 100%,rgba(195,31,176,.13),transparent 57%), linear-gradient(160deg,#0c2242 0%,#0a1a33 45%,#090d21 100%); }
        .pp-login-form-inner { width: 100%; max-width: 440px; }
        .pp-login-eyebrow { font-size: 11px; color: #20ddf6; font-weight: 900; letter-spacing: .24em; margin: 0 0 17px; }
        .pp-login-heading { font-size: clamp(30px, 3vw, 39px); line-height: 1.1; margin: 0 0 12px; letter-spacing: -.03em; color: white; }
        .pp-login-subtitle { font-size: 15px; line-height: 1.6; color: #c6d5e8; margin: 0 0 29px; }
        .pp-login-footer { margin-top: 28px; }
        @media (max-width: 820px) {
          .pp-login-page { padding: 77px 12px 25px; align-items: start; }
          .pp-login-layout { grid-template-columns: minmax(0,1fr); min-height: 0; border-radius: 18px; }
          .pp-login-visual { min-height: 0; height: clamp(260px, 55vw, 460px); }
          .pp-login-visual-image { height: 100%; object-position: center 15%; }
          .pp-login-form-panel { padding: 32px 22px 34px; }
        }
        @media (max-width: 480px) {
          .pp-login-visual { height: 280px; }
          .pp-login-visual-image { object-position: center top; }
          .pp-login-form-panel { padding: 26px 18px 30px; }
          .pp-login-heading { font-size: 30px; }
        }
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
  border: "1px solid rgba(187,214,244,.32)",
  background: "rgba(10, 27, 49, .82)",
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
    "linear-gradient(100deg, #09cbed, #078ce8 48%, #ec1ad2)",
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
    "linear-gradient(100deg, #09cbed, #078ce8 48%, #ec1ad2)",
  color: "#071322",
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