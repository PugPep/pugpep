"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

type CoaFile = {
  name: string;
  url: string;
};

type CoaFolder = {
  name: string;
  displayName: string;
  count: number;
  files: CoaFile[];
};

export default function QualityPage() {
  const supabase = createClient();
  const [folders, setFolders] = useState<CoaFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CoaFolder | null>(null);

  useEffect(() => {
    loadCoaFolders();
  }, []);

  function formatName(name: string) {
    return name
      .replaceAll("-", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .replace("Nad Plus", "NAD+")
      .replace("GhK Cu", "GHK-Cu")
      .replace("Igf Lr3", "IGF-LR3")
      .replace("Ss 31", "SS-31")
      .replace("Mt2", "MT2")
      .replace("Mots C", "MOTS-C")
      .replace("Bpc 157", "BPC-157");
  }

  async function loadCoaFolders() {
    const { data: folderData, error } = await supabase.storage
      .from("coas")
      .list("", { limit: 100 });

    if (error) {
      console.error(error);
      return;
    }

    const folderResults = await Promise.all(
      (folderData || []).map(async (folder) => {
        const { data: files } = await supabase.storage
          .from("coas")
          .list(folder.name, { limit: 100 });

        const coaFiles =
          files
            ?.filter((file) =>
              file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)
            )
            .map((file) => {
              const path = `${folder.name}/${file.name}`;

              const { data } = supabase.storage
                .from("coas")
                .getPublicUrl(path);

              return {
                name: file.name.replace(/\.[^/.]+$/, "").replaceAll("-", " "),
                url: data.publicUrl,
              };
            }) || [];

        return {
          name: folder.name,
          displayName: formatName(folder.name),
          count: coaFiles.length,
          files: coaFiles,
        };
      })
    );

    setFolders(folderResults);
  }

  return (
    <main style={page}>
      <section style={hero}>
        <h1 style={title}>QUALITY & TESTING</h1>
        <p style={subtitle}>
          PUGPEP is committed to transparency, consistency, and research-grade
          quality standards.
        </p>
      </section>

      <section style={box}>
        <h2 style={heading}>
          Each Product is Thoroughly Tested by our Trusted 3rd Party Independent
          Laboratories
        </h2>

        <p style={text}>
          Certificates of Analysis (COAs) for applicable research materials and
          batch verification are organized by product below.
        </p>
      </section>

      <section style={gallery}>
        <h2 style={heading}>Certificates of Analysis</h2>

        {!selectedFolder ? (
          <div style={grid}>
            {folders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => setSelectedFolder(folder)}
                style={card}
              >
                <h3 style={cardTitle}>{folder.displayName}</h3>
                <p style={text}>
                  {folder.count > 0
                    ? `${folder.count} COA${folder.count === 1 ? "" : "s"} Available`
                    : "No COAs Available Yet"}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button onClick={() => setSelectedFolder(null)} style={backButton}>
              ← Back to Products
            </button>

            <h2 style={heading}>{selectedFolder.displayName} COAs</h2>

            {selectedFolder.files.length === 0 ? (
              <p style={text}>No COAs have been uploaded for this product yet.</p>
            ) : (
              <div style={grid}>
                {selectedFolder.files.map((coa) => (
                  <a
                    key={coa.url}
                    href={coa.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={card}
                  >
                    <img src={coa.url} alt={coa.name} style={coaImage} />
                    <div style={cardTitle}>{coa.name}</div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.16), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.18), transparent 35%), #000",
  color: "#fff",
  padding: "60px 20px",
};

const hero = {
  maxWidth: 1100,
  margin: "0 auto 40px",
  textAlign: "center" as const,
};

const title = {
  fontSize: 58,
  color: "#ff45d8",
  textShadow: "0 0 25px rgba(255,45,210,.45)",
  marginBottom: 12,
};

const subtitle = {
  color: "#ccc",
  fontSize: 20,
  lineHeight: 1.7,
};

const box = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 30,
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 18,
  background: "rgba(0,0,0,.55)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 0 25px rgba(0,217,255,.10)",
};

const heading = {
  color: "#00d9ff",
  marginTop: 0,
};

const text = {
  color: "#ccc",
  lineHeight: 1.8,
  fontSize: 16,
};

const gallery = {
  maxWidth: 1200,
  margin: "40px auto 0",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 20,
};

const card = {
  display: "block",
  background: "#111",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 16,
  overflow: "hidden",
  textDecoration: "none",
  padding: 20,
  cursor: "pointer",
  color: "#fff",
  textAlign: "center" as const,
};

const coaImage = {
  width: "100%",
  height: 380,
  objectFit: "cover" as const,
};

const cardTitle = {
  color: "#00d9ff",
  fontWeight: "bold",
  textAlign: "center" as const,
};

const backButton = {
  marginBottom: 20,
  padding: "10px 14px",
  background: "#001b22",
  color: "#00d9ff",
  border: "1px solid #00d9ff",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};