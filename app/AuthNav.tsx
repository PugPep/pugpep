"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  clearAuthPersistenceMode,
  createClient,
  enforceAuthPersistencePolicy,
} from "../lib/supabaseClient";

export default function AuthNav() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      await enforceAuthPersistencePolicy(
        supabase
      );

      const { data } =
        await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      setEmail(
        data.user?.email || null
      );
    }

    void loadUser();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        setEmail(
          session?.user?.email || null
        );
      }
    );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const emailElement =
      document.getElementById(
        "nav-user-email"
      );

    if (emailElement) {
      emailElement.textContent =
        email || "";
    }

    return () => {
      if (emailElement) {
        emailElement.textContent =
          "";
      }
    };
  }, [email]);

  async function handleLogout() {
    await supabase.auth.signOut();

    clearAuthPersistenceMode();

    setEmail(null);

    window.location.href = "/";
  }

  if (!email) {
    return (
      <Link
        href="/login"
        style={accountAccessButton}
      >
        ACCOUNT ACCESS
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={logoutButton}
    >
      LOGOUT
    </button>
  );
}

const accountAccessButton = {
  minHeight: 38,
  padding: "8px 13px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,255,153,.72)",
  borderRadius: 9,
  background:
    "linear-gradient(90deg, rgba(0,255,153,.10), rgba(0,217,255,.10))",
  color: "#00ff99",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: ".07em",
  boxShadow:
    "0 0 16px rgba(0,255,153,.15)",
  whiteSpace: "nowrap" as const,
};

const logoutButton = {
  minHeight: 38,
  padding: "8px 13px",
  border:
    "1px solid rgba(255,85,85,.70)",
  borderRadius: 9,
  background:
    "rgba(90,0,0,.32)",
  color: "#ff8c8c",
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: ".06em",
  cursor: "pointer",
  boxShadow:
    "0 0 14px rgba(255,85,85,.10)",
};
