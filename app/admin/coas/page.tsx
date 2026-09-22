"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

type CoaDocument = {
  id: string;
  product_slug: string;
  product_name: string;
  dosage: string | null;
  lot_number: string | null;
  report_id: string | null;
  lab_name: string | null;
  test_date: string | null;
  purity_percent: number | null;
  identity_result: string | null;
  net_content: string | null;
  test_method: string | null;
  storage_bucket: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_type: string | null;
  status: "active" | "archived";
  is_current: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Draft = {
  product_name: string;
  dosage: string;
  lot_number: string;
  report_id: string;
  lab_name: string;
  test_date: string;
  purity_percent: string;
  identity_result: string;
  net_content: string;
  test_method: string;
  notes: string;
};

function makeDraft(row: CoaDocument): Draft {
  return {
    product_name: row.product_name || "",
    dosage: row.dosage || "",
    lot_number: row.lot_number || "",
    report_id: row.report_id || "",
    lab_name: row.lab_name || "",
    test_date: row.test_date || "",
    purity_percent: row.purity_percent == null ? "" : String(row.purity_percent),
    identity_result: row.identity_result || "",
    net_content: row.net_content || "",
    test_method: row.test_method || "",
    notes: row.notes || "",
  };
}

export default function AdminCoasPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CoaDocument[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [scopedProduct, setScopedProduct] = useState("");
  const [scopedDosage, setScopedDosage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function loadCoas() {
    const { data, error } = await supabase
      .from("coa_documents")
      .select("*")
      .order("product_name", { ascending: true })
      .order("dosage", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setNotice(`Unable to load COAs: ${error.message}`);
      return;
    }

    const documents = (data || []) as CoaDocument[];
    const nextDrafts: Record<string, Draft> = {};
    documents.forEach((row) => {
      nextDrafts[row.id] = makeDraft(row);
    });

    setRows(documents);
    setDrafts(nextDrafts);
  }

  useEffect(() => {
    async function boot() {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        setScopedProduct(params.get("product") || "");
        setScopedDosage(params.get("dosage") || "");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setNotice(userError?.message || "You must be logged in.");
        setLoading(false);
        return;
      }

      const { data: adminAccess, error: adminError } =
        await supabase.rpc("is_pugpep_admin");

      if (adminError || !adminAccess) {
        setNotice(adminError?.message || "Admin access required.");
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadCoas();
      setLoading(false);
    }

    void boot();
  }, [supabase]);

  function updateDraft(id: string, key: keyof Draft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  }

  function getPublicUrl(row: CoaDocument) {
    return supabase.storage
      .from(row.storage_bucket || "coas")
      .getPublicUrl(row.file_path).data.publicUrl;
  }

  async function saveMetadata(row: CoaDocument) {
    const draft = drafts[row.id];
    if (!draft || savingId) return;

    const purity =
      draft.purity_percent.trim() === ""
        ? null
        : Number(draft.purity_percent.trim());

    if (purity != null && (!Number.isFinite(purity) || purity < 0 || purity > 100)) {
      setNotice("Purity must be between 0 and 100.");
      return;
    }

    setSavingId(row.id);
    setNotice("");

    try {
      const { error } = await supabase
        .from("coa_documents")
        .update({
          product_name: draft.product_name.trim() || row.product_name,
          dosage: draft.dosage.trim() || null,
          lot_number: draft.lot_number.trim() || null,
          report_id: draft.report_id.trim() || null,
          lab_name: draft.lab_name.trim() || null,
          test_date: draft.test_date || null,
          purity_percent: purity,
          identity_result: draft.identity_result.trim() || null,
          net_content: draft.net_content.trim() || null,
          test_method: draft.test_method.trim() || null,
          notes: draft.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        setNotice(`Save failed: ${error.message}`);
        return;
      }

      setNotice(`${row.product_name} ${row.dosage || ""} saved.`);
      await loadCoas();
    } finally {
      setSavingId(null);
    }
  }

  async function makeCurrent(row: CoaDocument) {
    const draft = drafts[row.id];
    if (!draft?.lot_number.trim()) {
      setNotice("Enter and save the verified lot number before marking a COA current.");
      return;
    }

    if (
      !window.confirm(
        `Make this the current COA for ${row.product_name} ${row.dosage || ""}?`
      )
    ) {
      return;
    }

    setCurrentId(row.id);
    setNotice("");

    try {
      const { error } = await supabase.rpc("admin_set_current_coa", {
        target_coa_id: row.id,
      });

      if (error) {
        setNotice(`Unable to set current COA: ${error.message}`);
        return;
      }

      setNotice(`${row.product_name} ${row.dosage || ""} is now current.`);
      await loadCoas();
    } finally {
      setCurrentId(null);
    }
  }

  async function toggleArchive(row: CoaDocument) {
    const nextStatus = row.status === "archived" ? "active" : "archived";

    if (
      !window.confirm(
        nextStatus === "archived"
          ? `Archive ${row.file_name}? The Storage file will not be deleted.`
          : `Restore ${row.file_name}?`
      )
    ) {
      return;
    }

    setArchivingId(row.id);
    setNotice("");

    try {
      const { error } = await supabase
        .from("coa_documents")
        .update({
          status: nextStatus,
          is_current: nextStatus === "archived" ? false : row.is_current,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        setNotice(`Status update failed: ${error.message}`);
        return;
      }

      await loadCoas();
      setNotice(nextStatus === "archived" ? "COA archived." : "COA restored.");
    } finally {
      setArchivingId(null);
    }
  }

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();

    const matchesSearch =
      !q ||
      row.product_name.toLowerCase().includes(q) ||
      row.product_slug.toLowerCase().includes(q) ||
      (row.dosage || "").toLowerCase().includes(q) ||
      (row.lot_number || "").toLowerCase().includes(q) ||
      (row.lab_name || "").toLowerCase().includes(q) ||
      (row.report_id || "").toLowerCase().includes(q) ||
      row.file_name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (
      scopedProduct &&
      row.product_slug !== scopedProduct
    ) {
      return false;
    }

    if (
      scopedDosage &&
      String(row.dosage || "").trim().toLowerCase() !==
        scopedDosage.trim().toLowerCase()
    ) {
      return false;
    }

    if (filter === "active") return row.status === "active";
    if (filter === "archived") return row.status === "archived";
    if (filter === "current") return row.is_current;
    if (filter === "missing-lot") return !row.lot_number;
    return true;
  });

  if (loading) {
    return <main style={page}><div style={shell}><h1>Loading COA Engine...</h1></div></main>;
  }

  if (!authorized) {
    return (
      <main style={page}>
        <div style={shell}>
          <section style={panel}>
            <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
            <p style={muted}>{notice || "Admin access required."}</p>
            <Link href="/login" style={primaryLink}>Go to Login</Link>
          </section>
        </div>
      </main>
    );
  }

  const activeCount = rows.filter((row) => row.status === "active").length;
  const currentCount = rows.filter((row) => row.is_current).length;
  const missingLot = rows.filter((row) => !row.lot_number).length;

  return (
    <main style={page}>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #050507; }
        input, select, textarea, button { font: inherit; }
        @media (max-width: 900px) {
          .coa-toolbar, .coa-grid, .edit-grid { grid-template-columns: 1fr !important; }
          .coa-head { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>

      <div style={shell}>
        <header style={hero}>
          <div>
            <div style={heroBadges}>
              <span style={pinkPill}>PUGPEP ADMIN</span>
              <span style={greenText}>● COA ENGINE ONLINE</span>
            </div>
            <p style={eyebrow}>QUALITY CONTROL & LOT VERIFICATION</p>
            <h1 style={title}>COA Engine</h1>
            <p style={subtitle}>
              Manage certificate metadata, verified lot numbers, historical reports,
              and the current COA for each product strength.
            </p>
          </div>

          <div style={actions}>
            <Link href="/admin" style={secondaryLink}>Operations</Link>
            <Link href="/admin/product-images" style={primaryLink}>Product Images</Link>
          </div>
        </header>

        {notice && (
          <div style={noticeBox}>
            <span>{notice}</span>
            <button onClick={() => setNotice("")} style={closeButton}>×</button>
          </div>
        )}

        <section style={panel}>
          <div style={sectionHead}>
            <div>
              <p style={sectionEyebrow}>COA LIBRARY</p>
              <h2 style={sectionTitle}>Certificate Status</h2>
            </div>
            <span style={greenBadge}>{rows.length} INDEXED CERTIFICATES</span>
          </div>

          <div style={stats}>
            <Stat label="Active" value={activeCount} accent="#00ff99" />
            <Stat label="Current" value={currentCount} accent="#00d9ff" />
            <Stat label="Missing Lot" value={missingLot} accent="#ffcc00" />
          </div>
        </section>

        <section style={panel}>
          <div style={sectionHead}>
            <div>
              <p style={sectionEyebrow}>LIBRARY CONTROLS</p>
              <h2 style={sectionTitle}>Find and Manage COAs</h2>
            </div>
            <span style={cyanBadge}>{filtered.length} VISIBLE</span>
          </div>

          <div className="coa-toolbar" style={toolbar}>
            <label style={field}>
              <span style={label}>SEARCH</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Product, strength, lot, lab, report, filename..."
                style={input}
              />
            </label>

            <label style={field}>
              <span style={label}>STATUS</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={input}>
                <option value="all">All COAs</option>
                <option value="active">Active</option>
                <option value="current">Current Only</option>
                <option value="missing-lot">Missing Lot</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
        </section>

        {(scopedProduct || scopedDosage) && (
          <section style={infoBox}>
            <strong style={{ color: "#00ff99" }}>
              Product Manager selection applied
            </strong>
            <span style={muted}>
              Showing {scopedProduct || "selected product"}
              {scopedDosage ? ` • ${scopedDosage}` : ""}.
            </span>
            <button
              type="button"
              onClick={() => {
                setScopedProduct("");
                setScopedDosage("");

                if (typeof window !== "undefined") {
                  window.history.replaceState(
                    null,
                    "",
                    window.location.pathname
                  );
                }
              }}
              style={smallPrimary}
            >
              Show All COAs
            </button>
          </section>
        )}

        <section style={infoBox}>
          <strong style={{ color: "#7df9ff" }}>Current COA → Product Image</strong>
          <span style={muted}>
            Once a verified certificate is marked Current, the Product Image Engine
            can read its lot number from <code style={{ color: "#ff75df" }}>current_product_coas</code>.
          </span>
        </section>

        <section className="coa-grid" style={grid}>
          {filtered.map((row) => {
            const draft = drafts[row.id] || makeDraft(row);
            const expanded = expandedId === row.id;
            const url = getPublicUrl(row);
            const ext = (row.file_type || row.file_name.split(".").pop() || "").toLowerCase();
            const isPdf = ext.includes("pdf");

            return (
              <article
                key={row.id}
                style={{
                  ...card,
                  borderColor: row.is_current
                    ? "rgba(0,217,255,.65)"
                    : row.status === "archived"
                    ? "rgba(160,160,170,.28)"
                    : "rgba(255,255,255,.12)",
                }}
              >
                <div className="coa-head" style={cardHead}>
                  <div>
                    <div style={tagRow}>
                      {row.is_current && <span style={currentTag}>CURRENT COA</span>}
                      <span style={row.status === "archived" ? archivedTag : activeTag}>
                        {row.status.toUpperCase()}
                      </span>
                    </div>
                    <h2 style={productTitle}>{row.product_name}</h2>
                    <p style={fileMeta}>{row.dosage || "No strength"} • {row.file_name}</p>
                  </div>

                  <div style={actions}>
                    <a href={url} target="_blank" rel="noreferrer" style={secondaryLink}>Open COA</a>
                    <button
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                      style={smallPrimary}
                    >
                      {expanded ? "Hide Details" : "Edit COA"}
                    </button>
                  </div>
                </div>

                <div style={summaryGrid}>
                  <Summary label="Lot" value={row.lot_number || "NOT ENTERED"} accent={row.lot_number ? "#00ff99" : "#ffcc00"} />
                  <Summary label="Lab" value={row.lab_name || "Not entered"} />
                  <Summary label="Test Date" value={row.test_date || "Not entered"} />
                  <Summary
                    label="Purity"
                    value={row.purity_percent == null ? "Not entered" : `${Number(row.purity_percent).toFixed(3)}%`}
                  />
                </div>

                <div style={preview}>
                  {isPdf ? (
                    <iframe src={url} title={`${row.product_name} COA`} style={pdfPreview} />
                  ) : (
                    <img src={url} alt={`${row.product_name} COA`} style={imagePreview} />
                  )}
                </div>

                {expanded && (
                  <div style={editor}>
                    <div className="edit-grid" style={editGrid}>
                      <Field label="Product Name" value={draft.product_name} onChange={(v) => updateDraft(row.id, "product_name", v)} />
                      <Field label="Strength" value={draft.dosage} onChange={(v) => updateDraft(row.id, "dosage", v)} />
                      <Field label="Lot Number" value={draft.lot_number} onChange={(v) => updateDraft(row.id, "lot_number", v)} placeholder="Verified lot number" />
                      <Field label="Report ID" value={draft.report_id} onChange={(v) => updateDraft(row.id, "report_id", v)} />
                      <Field label="Lab Name" value={draft.lab_name} onChange={(v) => updateDraft(row.id, "lab_name", v)} />
                      <Field label="Test Date" type="date" value={draft.test_date} onChange={(v) => updateDraft(row.id, "test_date", v)} />
                      <Field label="Purity %" type="number" value={draft.purity_percent} onChange={(v) => updateDraft(row.id, "purity_percent", v)} />
                      <Field label="Identity Result" value={draft.identity_result} onChange={(v) => updateDraft(row.id, "identity_result", v)} />
                      <Field label="Net Content" value={draft.net_content} onChange={(v) => updateDraft(row.id, "net_content", v)} />
                      <Field label="Test Method" value={draft.test_method} onChange={(v) => updateDraft(row.id, "test_method", v)} />
                    </div>

                    <label style={field}>
                      <span style={label}>NOTES</span>
                      <textarea
                        rows={3}
                        value={draft.notes}
                        onChange={(e) => updateDraft(row.id, "notes", e.target.value)}
                        style={{ ...input, resize: "vertical" }}
                      />
                    </label>

                    <p style={storageText}>
                      Storage: {row.storage_bucket}/{row.file_path}
                    </p>

                    <div style={actions}>
                      <button
                        onClick={() => void saveMetadata(row)}
                        disabled={savingId === row.id}
                        style={saveButton}
                      >
                        {savingId === row.id ? "Saving..." : "Save Metadata"}
                      </button>

                      <button
                        onClick={() => void makeCurrent(row)}
                        disabled={row.is_current || row.status === "archived" || currentId === row.id}
                        style={{ ...currentButton, opacity: row.is_current || row.status === "archived" ? .45 : 1 }}
                      >
                        {currentId === row.id ? "Updating..." : row.is_current ? "Current ✓" : "Make Current"}
                      </button>

                      <button
                        onClick={() => void toggleArchive(row)}
                        disabled={archivingId === row.id}
                        style={archiveButton}
                      >
                        {archivingId === row.id ? "Saving..." : row.status === "archived" ? "Restore" : "Archive"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Field({
  label: text,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={field}>
      <span style={label}>{text.toUpperCase()}</span>
      <input
        type={type}
        step={type === "number" ? "0.001" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={input}
      />
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={stat}>
      <span style={statLabel}>{label}</span>
      <strong style={{ ...statValue, color: accent }}>{value}</strong>
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={summary}>
      <span style={summaryLabel}>{label}</span>
      <strong style={{ color: accent || "#fff", overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

const page = { minHeight: "100vh", background: "#050507", color: "#fff", padding: "32px 18px 72px" };
const shell = { width: "min(1500px, 100%)", margin: "0 auto" };
const hero = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: "24px", flexWrap: "wrap" as const, padding: "30px", borderRadius: "24px",
  border: "1px solid rgba(255,255,255,.12)",
  background: "radial-gradient(circle at 10% 10%, rgba(255,69,216,.12), transparent 30%), radial-gradient(circle at 90% 10%, rgba(0,217,255,.11), transparent 30%), #0b0b0f"
};
const heroBadges = { display: "flex", gap: "10px", flexWrap: "wrap" as const, marginBottom: "16px" };
const pinkPill = { padding: "7px 10px", borderRadius: "999px", border: "1px solid rgba(255,69,216,.45)", color: "#ff75df", background: "rgba(255,69,216,.08)", fontSize: "11px", fontWeight: 900 };
const greenText = { color: "#00ff99", fontSize: "11px", fontWeight: 900 };
const eyebrow = { margin: "0 0 8px", color: "#7df9ff", fontSize: "11px", fontWeight: 900, letterSpacing: ".15em" };
const title = { margin: 0, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1, fontWeight: 950 };
const subtitle = { maxWidth: "760px", color: "#a9abb3", lineHeight: 1.7 };
const actions = { display: "flex", gap: "9px", flexWrap: "wrap" as const };
const primaryLink = { textDecoration: "none", padding: "10px 13px", borderRadius: "11px", fontWeight: 900, color: "#050507", background: "#00ff99", border: "1px solid #00ff99" };
const secondaryLink = { textDecoration: "none", padding: "10px 13px", borderRadius: "11px", fontWeight: 850, color: "#fff", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.15)" };
const panel = { marginTop: "18px", padding: "22px", borderRadius: "20px", border: "1px solid rgba(255,255,255,.10)", background: "#0b0b0f" };
const sectionHead = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px", flexWrap: "wrap" as const, marginBottom: "18px" };
const sectionEyebrow = { margin: "0 0 5px", color: "#ff75df", fontSize: "10px", fontWeight: 900, letterSpacing: ".13em" };
const sectionTitle = { margin: 0, fontSize: "24px", fontWeight: 900 };
const greenBadge = { color: "#00ff99", border: "1px solid rgba(0,255,153,.34)", borderRadius: "999px", padding: "7px 10px", fontSize: "10px", fontWeight: 900 };
const cyanBadge = { ...greenBadge, color: "#7df9ff", border: "1px solid rgba(0,217,255,.34)" };
const stats = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "12px" };
const stat = { padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" };
const statLabel = { display: "block", color: "#8e9099", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" as const };
const statValue = { display: "block", marginTop: "7px", fontSize: "28px" };
const toolbar = { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" };
const field = { display: "flex", flexDirection: "column" as const, gap: "7px" };
const label = { color: "#92949d", fontSize: "10px", fontWeight: 900, letterSpacing: ".09em" };
const input = { width: "100%", padding: "11px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,.12)", background: "#08080b", color: "#fff", outline: "none" };
const infoBox = { ...panel, display: "flex", flexDirection: "column" as const, gap: "7px", border: "1px solid rgba(0,217,255,.18)", background: "rgba(0,217,255,.04)" };
const grid = { marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,560px),1fr))", gap: "16px" };
const card = { overflow: "hidden", borderRadius: "20px", border: "1px solid rgba(255,255,255,.12)", background: "#0b0b0f" };
const cardHead = { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", padding: "18px" };
const tagRow = { display: "flex", gap: "7px", flexWrap: "wrap" as const, marginBottom: "8px" };
const currentTag = { color: "#7df9ff", border: "1px solid rgba(0,217,255,.48)", background: "rgba(0,217,255,.09)", borderRadius: "999px", padding: "5px 8px", fontSize: "9px", fontWeight: 950 };
const activeTag = { ...currentTag, color: "#00ff99", border: "1px solid rgba(0,255,153,.34)", background: "rgba(0,255,153,.07)" };
const archivedTag = { ...currentTag, color: "#a9abb3", border: "1px solid rgba(169,171,179,.30)", background: "rgba(169,171,179,.06)" };
const productTitle = { margin: 0, fontSize: "24px", fontWeight: 950 };
const fileMeta = { margin: "6px 0 0", color: "#94969f", fontSize: "12px" };
const smallPrimary = { padding: "9px 11px", borderRadius: "10px", border: "1px solid #00ff99", background: "#00ff99", color: "#050507", fontWeight: 900, cursor: "pointer" };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "1px", background: "rgba(255,255,255,.07)" };
const summary = { padding: "12px 16px", background: "#09090c" };
const summaryLabel = { display: "block", marginBottom: "5px", color: "#777a84", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" as const };
const preview = { height: "360px", background: "#07070a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
const imagePreview = { width: "100%", height: "100%", objectFit: "contain" as const, display: "block" };
const pdfPreview = { width: "100%", height: "100%", border: 0, background: "#fff" };
const editor = { padding: "18px", borderTop: "1px solid rgba(255,255,255,.08)" };
const editGrid = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "12px", marginBottom: "12px" };
const storageText = { color: "#7f828c", fontSize: "11px", overflowWrap: "anywhere" as const };
const saveButton = { padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(0,255,153,.5)", background: "rgba(0,255,153,.10)", color: "#00ff99", fontWeight: 900, cursor: "pointer" };
const currentButton = { ...saveButton, border: "1px solid rgba(0,217,255,.5)", background: "rgba(0,217,255,.10)", color: "#7df9ff" };
const archiveButton = { ...saveButton, border: "1px solid rgba(255,204,0,.45)", background: "rgba(255,204,0,.08)", color: "#ffcc00" };
const noticeBox = { marginTop: "16px", padding: "14px 16px", borderRadius: "13px", display: "flex", justifyContent: "space-between", gap: "12px", border: "1px solid rgba(0,217,255,.28)", background: "rgba(0,217,255,.07)" };
const closeButton = { border: 0, background: "transparent", color: "#fff", fontSize: "21px", cursor: "pointer" };
const muted = { color: "#8e9099" };
