"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabaseClient";

export default function AuthNav() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email || null);
    }

    loadUser();
  }, []);

  useEffect(() => {
    const emailElement = document.getElementById("nav-user-email");

    if (emailElement) {
      emailElement.textContent = email || "";
    }

    return () => {
      if (emailElement) {
        emailElement.textContent = "";
      }
    };
  }, [email]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setEmail(null);
    window.location.href = "/";
  }

  if (!email) {
    return (
      <>
        <Link style={{ color: "#fff" }} href="/login">
          Login
        </Link>
        <Link style={{ color: "#fff" }} href="/signup">
          Sign Up
        </Link>
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleLogout}
        style={{
          background: "#300",
          color: "#ff8080",
          border: "1px solid #ff5555",
          borderRadius: 6,
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </>
  );
}