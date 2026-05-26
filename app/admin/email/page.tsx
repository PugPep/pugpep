"use client";

import { useEffect, useState } from "react";
import emailjs from "emailjs-com";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

const EMAILJS_SERVICE_ID = "service_quxnkin";
const EMAILJS_PUBLIC_KEY = "yc_0cE0Mcl3tfzc11";

// Replace this later after you create the EmailJS promo template
const PROMO_TEMPLATE_ID = "YOUR_PROMO_TEMPLATE_ID";

export default function AdminEmailPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [subject, setSubject] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
      }

      setLoading(false);
    }

    checkAdmin();
  }, []);

  async function sendPromoEmails() {
    if (!subject || !message) {
      alert("Please enter a subject and message.");
      return;
    }

    const confirmSend = window.confirm(
      "Are you sure you want to send this promo email to all customers?"
    );

    if (!confirmSend) return;

    setSending(true);

    const { data: customers, error } = await supabase
      .from("customer_profiles")
      .select("email")
      .not("email", "is", null);

    if (error) {
      setSending(false);
      alert(error.message);
      return;
    }

    try {
      for (const customer of customers || []) {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          PROMO_TEMPLATE_ID,
          {
            to_email: customer.email,
            subject,
            message,
            promo_code: promoCode,
            site_url: "https://pugpep.com",
          },
          EMAILJS_PUBLIC_KEY
        );
      }

      alert("Promo emails sent.");
    } catch (err) {
      console.error(err);
      alert("Some emails may have failed.");
    }

    setSending(false);
  }

  if (loading) return <main style={page}>Loading...</main>;

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Email Campaigns</h1>

      <section style={box}>
        <input
          placeholder="Email Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={input}
        />

        <input
          placeholder="Promo Code optional"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          style={input}
        />

        <textarea
          placeholder="Promo message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={textarea}
        />

        <button onClick={sendPromoEmails} style={button}>
          {sending ? "Sending..." : "Send to All Customers"}
        </button>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid #333",
  borderRadius: 14,
  background: "#080808",
};

const input = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const textarea = {
  width: "100%",
  minHeight: 180,
  padding: 12,
  marginBottom: 12,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const button = {
  width: "100%",
  padding: "14px 22px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};