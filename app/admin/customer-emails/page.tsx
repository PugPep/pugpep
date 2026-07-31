"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

type CustomerAccount = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export default function CustomerEmailsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);

      const { data, error } = await supabase.rpc(
        "admin_get_customer_account_options"
      );

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setCustomers(
        Array.isArray(data) ? (data as CustomerAccount[]) : []
      );

      setLoading(false);
    }

    void loadCustomers();
  }, [supabase]);

  const filteredCustomers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return [...customers]
      .filter((customer) => {
        const email = (customer.email || "").trim();

        if (!email) return false;

        const name = (customer.full_name || "").toLowerCase();
        const normalizedEmail = email.toLowerCase();

        return (
          !searchText ||
          name.includes(searchText) ||
          normalizedEmail.includes(searchText)
        );
      })
      .sort((a, b) =>
        (a.email || "").localeCompare(b.email || "", undefined, {
          sensitivity: "base",
        })
      );
  }, [customers, search]);

  const uniqueCustomers = useMemo(() => {
    const seenEmails = new Set<string>();

    return filteredCustomers.filter((customer) => {
      const email = (customer.email || "").trim().toLowerCase();

      if (!email || seenEmails.has(email)) {
        return false;
      }

      seenEmails.add(email);
      return true;
    });
  }, [filteredCustomers]);

  const commaSeparatedEmails = useMemo(() => {
    return uniqueCustomers
      .map((customer) => customer.email?.trim())
      .filter((email): email is string => Boolean(email))
      .join(", ");
  }, [uniqueCustomers]);

  const bccSeparatedEmails = useMemo(() => {
    return uniqueCustomers
      .map((customer) => customer.email?.trim())
      .filter((email): email is string => Boolean(email))
      .join("; ");
  }, [uniqueCustomers]);

  async function copyCommaSeparatedEmails() {
    if (!commaSeparatedEmails) {
      alert("There are no customer emails to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(commaSeparatedEmails);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      alert("Unable to copy the email list.");
    }
  }

  async function copyBccEmails() {
    if (!bccSeparatedEmails) {
      alert("There are no customer emails to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(bccSeparatedEmails);
      alert("BCC email list copied.");
    } catch {
      alert("Unable to copy the BCC email list.");
    }
  }

  function downloadCsv() {
    if (uniqueCustomers.length === 0) {
      alert("There are no customer emails to download.");
      return;
    }

    const rows = [
      ["Customer Name", "Email"],
      ...uniqueCustomers.map((customer) => [
        customer.full_name || "",
        customer.email || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const escapedValue = String(value).replace(/"/g, '""');
            return `"${escapedValue}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "customer-email-list.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading customer emails...
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <Link href="/admin" style={styles.link}>
        ← Back to Admin
      </Link>

      <h1 style={styles.title}>Customer Email List</h1>

      <p style={styles.helpText}>
        Search, copy, or download customer email addresses. Duplicate email
        addresses are removed automatically.
      </p>

      <div style={styles.summary}>
        <strong>{uniqueCustomers.length}</strong>{" "}
        unique customer email
        {uniqueCustomers.length === 1 ? "" : "s"}
      </div>

      <label style={styles.label}>
        Search customers
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by customer name or email"
          style={styles.input}
        />
      </label>

      <div style={styles.buttonRow}>
        <button
          type="button"
          onClick={copyCommaSeparatedEmails}
          style={styles.button}
        >
          {copied ? "Emails Copied!" : "Copy All Emails"}
        </button>

        <button
          type="button"
          onClick={copyBccEmails}
          style={styles.secondaryButton}
        >
          Copy for BCC
        </button>

        <button
          type="button"
          onClick={downloadCsv}
          style={styles.downloadButton}
        >
          Download CSV
        </button>
      </div>

      <label style={styles.label}>
        Comma-separated email list
        <textarea
          readOnly
          value={commaSeparatedEmails}
          style={styles.textarea}
        />
      </label>

      <section style={styles.section}>
        <h2 style={styles.heading}>Customer Accounts</h2>

        {uniqueCustomers.length === 0 ? (
          <p>No matching customer email addresses found.</p>
        ) : (
          <div style={styles.customerList}>
            {uniqueCustomers.map((customer, index) => (
              <div key={customer.id} style={styles.customerRow}>
                <span style={styles.number}>{index + 1}</span>

                <span>
                  {customer.full_name || "No customer name"}
                </span>

                <a
                  href={`mailto:${customer.email}`}
                  style={styles.link}
                >
                  {customer.email}
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={styles.warning}>
        Put customer addresses in the BCC field, not To or CC, so recipients
        cannot see one another&apos;s email addresses. Only send marketing
        messages to customers who are eligible to receive them, and include a
        clear way to unsubscribe.
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#000000",
    color: "#ffffff",
  },

  title: {
    color: "#ff45d8",
    marginTop: "20px",
  },

  heading: {
    color: "#00d9ff",
    marginTop: 0,
  },

  helpText: {
    color: "#aaaaaa",
    lineHeight: 1.5,
    maxWidth: "900px",
  },

  summary: {
    margin: "18px 0",
    padding: "14px",
    border: "1px solid #333333",
    borderRadius: "10px",
    background: "#111111",
    maxWidth: "900px",
  },

  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    maxWidth: "900px",
  },

  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px",
    background: "#080808",
    color: "#ffffff",
    border: "1px solid #444444",
    borderRadius: "8px",
  },

  buttonRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "10px",
    margin: "15px 0",
  },

  button: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #00d9ff",
    background: "#001b22",
    color: "#00d9ff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #ff45d8",
    background: "#22001c",
    color: "#ff45d8",
    fontWeight: "bold",
    cursor: "pointer",
  },

  downloadButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #65ff8a",
    background: "#07170c",
    color: "#65ff8a",
    fontWeight: "bold",
    cursor: "pointer",
  },

  textarea: {
    minHeight: "180px",
    padding: "12px",
    resize: "vertical" as const,
    background: "#080808",
    color: "#ffffff",
    border: "1px solid #444444",
    borderRadius: "8px",
    lineHeight: 1.6,
  },

  section: {
    marginTop: "25px",
    padding: "20px",
    border: "1px solid #333333",
    borderRadius: "12px",
    background: "#111111",
    maxWidth: "1100px",
  },

  customerList: {
    overflowX: "auto" as const,
  },

  customerRow: {
    display: "grid",
    gridTemplateColumns:
      "50px minmax(180px, 1fr) minmax(240px, 1fr)",
    gap: "12px",
    padding: "11px",
    borderBottom: "1px solid #333333",
    alignItems: "center",
    minWidth: "650px",
  },

  number: {
    color: "#888888",
  },

  link: {
    color: "#00d9ff",
    textDecoration: "none",
  },

  warning: {
    marginTop: "25px",
    maxWidth: "1000px",
    padding: "14px",
    border: "1px solid #ffcc00",
    borderRadius: "10px",
    background: "#221d00",
    color: "#ffdd66",
    lineHeight: 1.5,
  },
};