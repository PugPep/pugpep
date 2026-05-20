"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Option = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
};

export default function AdminOptionsPage() {
  const supabase = createClient();

  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [newOption, setNewOption] = useState({
    product_slug: "",
    dosage: "",
    purchase_type: "single",
    price: "",
    status: "in stock",
  });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadOptions();
      setLoading(false);
    }

    init();
  }, []);

  async function loadOptions() {
    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .order("product_slug", { ascending: true });

    if (error) alert(error.message);
    else setOptions(data || []);
  }

  async function updateOption(id: string, field: string, value: string | number) {
    const { error } = await supabase
      .from("product_options")
      .update({ [field]: value })
      .eq("id", id);

    if (error) alert(error.message);
    else await loadOptions();
  }

  async function addOption() {
    if (!newOption.product_slug || !newOption.dosage || !newOption.price) {
      alert("Please fill out product slug, dosage, and price.");
      return;
    }

    const { error } = await supabase.from("product_options").insert({
      product_slug: newOption.product_slug,
      dosage: newOption.dosage,
      purchase_type: newOption.purchase_type,
      price: Number(newOption.price),
      status: newOption.status,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewOption({
      product_slug: "",
      dosage: "",
      purchase_type: "single",
      price: "",
      status: "in stock",
    });

    await loadOptions();
  }

  if (loading) return <main style={page}>Loading options...</main>;

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
        <p>You must be logged in as admin.</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Product Options / Pricing</h1>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Add New Option</h2>

        <input
          placeholder="product slug, example: tirzepatide"
          value={newOption.product_slug}
          onChange={(e) =>
            setNewOption({ ...newOption, product_slug: e.target.value })
          }
          style={input}
        />

        <input
          placeholder="dosage, example: 30mg"
          value={newOption.dosage}
          onChange={(e) =>
            setNewOption({ ...newOption, dosage: e.target.value })
          }
          style={input}
        />

        <select
          value={newOption.purchase_type}
          onChange={(e) =>
            setNewOption({ ...newOption, purchase_type: e.target.value })
          }
          style={input}
        >
          <option value="single">single</option>
          <option value="kit">kit</option>
        </select>

        <input
          placeholder="price"
          type="number"
          value={newOption.price}
          onChange={(e) =>
            setNewOption({ ...newOption, price: e.target.value })
          }
          style={input}
        />

        <select
          value={newOption.status}
          onChange={(e) =>
            setNewOption({ ...newOption, status: e.target.value })
          }
          style={input}
        >
          <option value="in stock">in stock</option>
          <option value="pre-sale">pre-sale</option>
          <option value="out of stock">out of stock</option>
          
        </select>

        <button onClick={addOption} style={button}>
          Add Option
        </button>
      </section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Edit Existing Options</h2>

        {options.length === 0 ? (
          <p>No product options found yet.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Product</th>
                <th style={th}>Dosage</th>
                <th style={th}>Type</th>
                <th style={th}>Price</th>
                <th style={th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {options.map((option) => (
                <tr key={option.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={td}>{option.product_slug}</td>

                  <td style={td}>
                    <input
                      defaultValue={option.dosage}
                      onBlur={(e) =>
                        updateOption(option.id, "dosage", e.target.value)
                      }
                      style={smallInput}
                    />
                  </td>

                  <td style={td}>
                    <select
                      defaultValue={option.purchase_type}
                      onChange={(e) =>
                        updateOption(option.id, "purchase_type", e.target.value)
                      }
                      style={smallInput}
                    >
                      <option value="single">single</option>
                      <option value="kit">kit</option>
                    </select>
                  </td>

                  <td style={td}>
                    <input
                      type="number"
                      defaultValue={option.price}
                      onBlur={(e) =>
                        updateOption(option.id, "price", Number(e.target.value))
                      }
                      style={smallInput}
                    />
                  </td>

                  <td style={td}>
                    <select
                      defaultValue={option.status}
                      onChange={(e) =>
                        updateOption(option.id, "status", e.target.value)
                      }
                      style={smallInput}
                    >
                      <option value="in stock">in stock</option>
                      <option value="pre-sale">pre-sale</option>
                      <option value="out of stock">out of stock</option>
                      
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  display: "block",
  width: "100%",
  marginBottom: 12,
  padding: 12,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const smallInput = {
  padding: 8,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 6,
};

const button = {
  padding: "14px 20px",
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  color: "#00d9ff",
  padding: 10,
};

const td = {
  padding: 10,
};