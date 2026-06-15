"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Promo = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
};

export default function PromoManagerPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [promos, setPromos] = useState<Promo[]>([]);

  const [newPromo, setNewPromo] = useState({
    code: "",
    discount_type: "percent",
    discount_value: "",
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
      await loadPromos();
      setLoading(false);
    }

    init();
  }, []);

  async function loadPromos() {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setPromos(data || []);
  }

  async function createPromo() {
    if (!newPromo.code || !newPromo.discount_value) {
      alert("Promo code and discount are required.");
      return;
    }

    const { error } = await supabase.from("promo_codes").insert({
      code: newPromo.code.toUpperCase(),
      discount_type: newPromo.discount_type,
      discount_value: Number(newPromo.discount_value),
      is_active: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Promo code created.");

    setNewPromo({
      code: "",
      discount_type: "percent",
      discount_value: "",
    });

    await loadPromos();
  }

  async function togglePromo(id: string, active: boolean) {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !active })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPromos();
  }
async function deletePromo(id: string, code: string) {
  const confirmed = confirm(`Delete promo code ${code}?`);
  if (!confirmed) return;

  const { error } = await supabase
    .from("promo_codes")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Promo code deleted.");
  await loadPromos();
}
  if (loading) {
    return (
      <main style={page}>
        Loading promos...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Promo Codes</h1>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Create Promo Code</h2>

        <div style={formGrid}>
          <input
            placeholder="Promo Code"
            value={newPromo.code}
            onChange={(e) =>
              setNewPromo({
                ...newPromo,
                code: e.target.value.toUpperCase(),
              })
            }
            style={input}
          />

          <select
            value={newPromo.discount_type}
            onChange={(e) =>
              setNewPromo({
                ...newPromo,
                discount_type: e.target.value,
              })
            }
            style={input}
          >
            <option value="percent">Percent Off</option>
            <option value="fixed">Fixed Dollar Amount</option>
          </select>

          <input
            type="number"
            placeholder="Discount"
            value={newPromo.discount_value}
            onChange={(e) =>
              setNewPromo({
                ...newPromo,
                discount_value: e.target.value,
              })
            }
            style={input}
          />

          <button onClick={createPromo} style={button}>
            Create
          </button>
        </div>
      </section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Current / Past Promo Codes</h2>

        {promos.length === 0 ? (
          <p>No promo codes found.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Code</th>
                <th style={th}>Type</th>
                <th style={th}>Discount</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {promos.map((promo) => (
                <tr key={promo.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={td}>{promo.code}</td>

                  <td style={td}>
                    {promo.discount_type === "percent"
                      ? "Percent"
                      : "Fixed"}
                  </td>

                  <td style={td}>
                    {promo.discount_type === "percent"
                      ? `${promo.discount_value}%`
                      : `$${promo.discount_value}`}
                  </td>

                  <td style={td}>
                    <span
                      style={{
                        color: promo.is_active
                          ? "#00ff99"
                          : "#ff4d4d",
                        fontWeight: "bold",
                      }}
                    >
                      {promo.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td style={td}>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <button
      onClick={() => togglePromo(promo.id, promo.is_active)}
      style={promo.is_active ? deactivateButton : activateButton}
    >
      {promo.is_active ? "Deactivate" : "Activate"}
    </button>

    <button
      onClick={() => deletePromo(promo.id, promo.code)}
      style={deleteButton}
    >
      Delete
    </button>
  </div>
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
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 16,
  background: "rgba(0,0,0,.58)",
  backdropFilter: "blur(8px)",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  alignItems: "start",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const button = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #00d9ff",
  background: "#001b22",
  color: "#00d9ff",
  fontWeight: "bold",
  cursor: "pointer",
};

const activateButton = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #00ff99",
  background: "#002200",
  color: "#00ff99",
  cursor: "pointer",
};

const deactivateButton = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ff4d4d",
  background: "#220000",
  color: "#ff4d4d",
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
const deleteButton = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ff4d4d",
  background: "#330000",
  color: "#ff4d4d",
  cursor: "pointer",
  fontWeight: "bold",
};