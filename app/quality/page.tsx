"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

type CoaFile = {
  name: string;
  rawName: string;
  url: string;
  updatedAt: string | null;
};

type CoaFolder = {
  name: string;
  displayName: string;
  count: number;
  files: CoaFile[];
  image: string;
};

type SortMode = "az" | "most" | "recent";

function normalizeKey(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9+-]/g, "");

  const aliases: Record<string, string> = {
    reta: "retatrutide",
    tirz: "tirzepatide",
    tesa: "tesamorelin",
    ipa: "ipamorelin",
    motsc: "mots-c",
    "nad+": "nad-plus",
    nadplus: "nad-plus",
    mt2: "mt2",
    "cjc&ipa": "cjc-ipa",
    cjcipa: "cjc-ipa",
    "cjc--ipa": "cjc-ipa",
    "igf-lr3": "igf1lr3",
    "igf-1-lr3": "igf1lr3",
    igflr3: "igf1lr3",
    ghkcu: "ghk-cu",
    "5-amino-1mq": "5-amino-1mq",
    aod9604: "aod9604",
    bpc157: "bpc-157",
    ss31: "ss-31",
    lipoc: "lipo-c",
  };

  return aliases[normalized] || normalized;
}

function formatName(name: string) {
  return name
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("Nad Plus", "NAD+")
    .replace("Ghk Cu", "GHK-Cu")
    .replace("Igf Lr3", "IGF-LR3")
    .replace("Ss 31", "SS-31")
    .replace("Mt2", "MT-2")
    .replace("Mots C", "MOTS-C")
    .replace("Bpc 157", "BPC-157")
    .replace("Tb 500", "TB-500")
    .replace("Cjc Ipa", "CJC/IPA");
}

function formatFileName(name: string) {
  return formatName(
    name
      .replace(/\.[^/.]+$/, "")
      .replaceAll("_", "-")
  );
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function QualityPage() {
  const supabase = useMemo(() => createClient(), []);

  const [folders, setFolders] = useState<CoaFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CoaFolder | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void loadCoaFolders();
  }, []);

  async function loadCoaFolders() {
    setLoading(true);
    setLoadError("");

    try {
      const [folderResult, productResult] = await Promise.all([
        supabase.storage.from("coas").list("", {
          limit: 200,
          sortBy: {
            column: "name",
            order: "asc",
          },
        }),

        supabase
          .from("products")
          .select("slug,image,name")
          .order("name", {
            ascending: true,
          }),
      ]);

      const { data: folderData, error: folderError } = folderResult;

      if (folderError) {
        throw folderError;
      }

      if (productResult.error) {
        console.error(
          "Product image loading error:",
          productResult.error
        );
      }

      const productImages = new Map<string, string>();

      for (const product of productResult.data || []) {
        const image = String(product.image || "").trim();

        if (!image) continue;

        const slugKey = normalizeKey(String(product.slug || ""));
        const nameKey = normalizeKey(String(product.name || ""));

        if (slugKey) {
          productImages.set(slugKey, image);
        }

        if (nameKey) {
          productImages.set(nameKey, image);
        }
      }

      const validFolders = (folderData || []).filter(
        (folder) =>
          folder.name &&
          folder.name !== ".emptyFolderPlaceholder"
      );

      const folderResults = await Promise.all(
        validFolders.map(async (folder) => {
          const { data: fileData, error: fileError } =
            await supabase.storage.from("coas").list(folder.name, {
              limit: 200,
              sortBy: {
                column: "updated_at",
                order: "desc",
              },
            });

          if (fileError) {
            console.error(
              `Unable to load COAs for ${folder.name}:`,
              fileError
            );
          }

          const coaFiles: CoaFile[] = (fileData || [])
            .filter((file) =>
              /\.(png|jpg|jpeg|webp|pdf)$/i.test(file.name)
            )
            .map((file) => {
              const path = `${folder.name}/${file.name}`;

              const { data: publicUrlData } = supabase.storage
                .from("coas")
                .getPublicUrl(path);

              return {
                name: formatFileName(file.name),
                rawName: file.name,
                url: publicUrlData.publicUrl,
                updatedAt:
                  file.updated_at ||
                  file.created_at ||
                  null,
              };
            });

          return {
            name: folder.name,
            displayName: formatName(folder.name),
            count: coaFiles.length,
            files: coaFiles,
            image:
              productImages.get(normalizeKey(folder.name)) ||
              productImages.get(
                normalizeKey(formatName(folder.name))
              ) ||
              "",
          };
        })
      );

      folderResults.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );

      setFolders(folderResults);
    } catch (error) {
      console.error("COA loading error:", error);

      setLoadError(
        "Certificates of Analysis could not be loaded right now."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalCoas = useMemo(
    () =>
      folders.reduce(
        (sum, folder) => sum + folder.count,
        0
      ),
    [folders]
  );

  const foldersWithCoas = useMemo(
    () => folders.filter((folder) => folder.count > 0).length,
    [folders]
  );

  const latestDocuments = useMemo(() => {
    return folders
      .flatMap((folder) =>
        folder.files.map((file) => ({
          folderName: folder.displayName,
          folderSlug: folder.name,
          image: folder.image,
          file,
        }))
      )
      .sort((a, b) => {
        const aTime = a.file.updatedAt
          ? new Date(a.file.updatedAt).getTime()
          : 0;
        const bTime = b.file.updatedAt
          ? new Date(b.file.updatedAt).getTime()
          : 0;

        return bTime - aTime;
      })
      .slice(0, 6);
  }, [folders]);

  const latestTestDate = useMemo(() => {
    const newest = latestDocuments[0]?.file.updatedAt || null;
    return newest ? formatDate(newest) : "Unavailable";
  }, [latestDocuments]);

  const filteredFolders = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = folders.filter((folder) => {
      if (availableOnly && folder.count === 0) {
        return false;
      }

      const folderMatch =
        !query ||
        folder.displayName.toLowerCase().includes(query) ||
        folder.name.toLowerCase().includes(query);

      const fileMatch =
        !query ||
        folder.files.some((file) =>
          file.name.toLowerCase().includes(query)
        );

      return folderMatch || fileMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "most") {
        return b.count - a.count;
      }

      if (sortMode === "recent") {
        const newest = (folder: CoaFolder) =>
          Math.max(
            0,
            ...folder.files.map((file) =>
              file.updatedAt
                ? new Date(file.updatedAt).getTime()
                : 0
            )
          );

        return newest(b) - newest(a);
      }

      return a.displayName.localeCompare(b.displayName);
    });
  }, [folders, search, availableOnly, sortMode]);

  function openFolderBySlug(folderSlug: string) {
    const match = folders.find(
      (folder) => folder.name === folderSlug
    );

    if (match) {
      setSelectedFolder(match);

      requestAnimationFrame(() => {
        document
          .getElementById("certificate-library")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      });
    }
  }

  return (
    <main style={page}>
      <style>{responsiveStyle}</style>

      <div style={container}>
        <section style={hero}>
          <div style={heroGlowOne} />
          <div style={heroGlowTwo} />

          <div style={heroInner}>
            <p style={eyebrow}>QUALITY &amp; TESTING</p>

            <h1 style={title}>
              Verified. Documented.
              <span style={titleAccent}> Transparent.</span>
            </h1>

            <p style={subtitle}>
              Access available third-party analytical documentation
              for PugPep research products in one organized quality
              library.
            </p>

            <div style={heroStats}>
              <StatCard
                label="Research Listings"
                value={String(folders.length)}
                accent="#00d9ff"
              />

              <StatCard
                label="Listings With COAs"
                value={String(foldersWithCoas)}
                accent="#00ff99"
              />

              <StatCard
                label="Available COAs"
                value={String(totalCoas)}
                accent="#ff75df"
              />

              <StatCard
                label="Latest Documentation"
                value={latestTestDate}
                accent="#ffcc00"
                compact
              />
            </div>
          </div>
        </section>

        <section style={standardsPanel}>
          <div style={sectionTopline}>
            <div>
              <p style={sectionEyebrow}>OUR QUALITY STANDARD</p>

              <h2 style={sectionTitle}>
                Independent Laboratory Documentation
              </h2>
            </div>

            <Link href="/about" style={quietLink}>
              ABOUT PUGPEP →
            </Link>
          </div>

          <p style={bodyText}>
            PugPep organizes available Certificates of Analysis by
            research product so researchers can review applicable
            analytical documentation before making procurement
            decisions.
          </p>

          <div style={standardsGrid}>
            <StandardCard
              title="Independent Testing"
              text="Available documentation is provided from third-party analytical laboratories."
            />

            <StandardCard
              title="Batch Documentation"
              text="Certificates are organized by product to make supporting analytical records easier to locate."
            />

            <StandardCard
              title="Open Access"
              text="Available certificates can be opened directly for closer review and independent inspection."
            />

            <StandardCard
              title="Research Transparency"
              text="Clear documentation supports informed laboratory purchasing and responsible research workflows."
            />
          </div>
        </section>

        {!loading && latestDocuments.length > 0 && (
          <section style={latestPanel}>
            <div style={sectionTopline}>
              <div>
                <p style={sectionEyebrow}>LATEST TESTING</p>

                <h2 style={sectionTitle}>
                  Recently Added Documentation
                </h2>
              </div>

              <span style={latestBadge}>
                {latestDocuments.length} RECENT DOCUMENTS
              </span>
            </div>

            <div style={latestGrid}>
              {latestDocuments.map((document) => (
                <button
                  key={`${document.folderSlug}-${document.file.url}`}
                  type="button"
                  onClick={() =>
                    openFolderBySlug(document.folderSlug)
                  }
                  style={latestCard}
                >
                  <div style={latestImageWrap}>
                    {document.image ? (
                      <img
                        src={document.image}
                        alt={document.folderName}
                        style={latestImage}
                      />
                    ) : (
                      <div style={latestFallback}>
                        {document.folderName}
                      </div>
                    )}
                  </div>

                  <div style={latestCardBody}>
                    <span style={latestMeta}>
                      {formatDate(document.file.updatedAt)}
                    </span>

                    <strong style={latestTitle}>
                      {document.folderName}
                    </strong>

                    <span style={latestFile}>
                      {document.file.name}
                    </span>

                    <span style={latestCta}>
                      VIEW CERTIFICATES →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section
          id="certificate-library"
          style={galleryPanel}
        >
          <div style={galleryHeader}>
            <div>
              <p style={sectionEyebrow}>CERTIFICATE LIBRARY</p>

              <h2 style={sectionTitle}>
                {selectedFolder
                  ? `${selectedFolder.displayName} Documentation`
                  : "Browse by Research Product"}
              </h2>
            </div>

            {selectedFolder && (
              <button
                type="button"
                onClick={() => setSelectedFolder(null)}
                style={backButton}
              >
                ← Back to Products
              </button>
            )}
          </div>

          {!selectedFolder && (
            <div style={filterPanel}>
              <div style={searchWrap}>
                <label
                  htmlFor="coa-search"
                  style={searchLabel}
                >
                  Search Products or Documents
                </label>

                <input
                  id="coa-search"
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search compounds, filenames, or documentation..."
                  style={searchInput}
                />
              </div>

              <div style={filterControls}>
                <label style={toggleLabel}>
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) =>
                      setAvailableOnly(event.target.checked)
                    }
                    style={checkbox}
                  />
                  <span>
                    Available COAs only
                  </span>
                </label>

                <select
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(
                      event.target.value as SortMode
                    )
                  }
                  style={sortSelect}
                  aria-label="Sort certificate products"
                >
                  <option value="az">Sort: A–Z</option>
                  <option value="most">
                    Sort: Most COAs
                  </option>
                  <option value="recent">
                    Sort: Recently Updated
                  </option>
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <div style={loadingGrid}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  style={skeletonCard}
                />
              ))}
            </div>
          ) : loadError ? (
            <div style={messageCard}>
              <p style={errorText}>{loadError}</p>

              <button
                type="button"
                onClick={() => {
                  void loadCoaFolders();
                }}
                style={retryButton}
              >
                Try Again
              </button>
            </div>
          ) : selectedFolder ? (
            selectedFolder.files.length === 0 ? (
              <div style={messageCard}>
                <p style={bodyText}>
                  No Certificates of Analysis have been uploaded
                  for this research product yet.
                </p>
              </div>
            ) : (
              <>
                <div style={selectedSummary}>
                  <div>
                    <span style={selectedEyebrow}>
                      DOCUMENT SET
                    </span>

                    <strong style={selectedCount}>
                      {selectedFolder.count} certificate
                      {selectedFolder.count === 1 ? "" : "s"} available
                    </strong>
                  </div>

                  <p style={selectedNote}>
                    Open any certificate below to inspect the
                    available analytical documentation in full.
                  </p>
                </div>

                <div style={coaGrid}>
                  {selectedFolder.files.map((coa, index) => {
                    const isPdf = /\.pdf$/i.test(coa.rawName);

                    return (
                      <a
                        key={coa.url}
                        href={coa.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={coaCard}
                      >
                        <div style={imageWrap}>
                          {isPdf ? (
                            <div style={pdfPreview}>
                              <span style={pdfBadge}>PDF</span>
                              <strong style={pdfTitle}>
                                Certificate Document
                              </strong>
                              <span style={pdfText}>
                                Open the full document to review
                                this certificate.
                              </span>
                            </div>
                          ) : (
                            <img
                              src={coa.url}
                              alt={coa.name}
                              style={coaImage}
                            />
                          )}

                          <div style={imageOverlay}>
                            OPEN FULL CERTIFICATE
                          </div>
                        </div>

                        <div style={coaCardBody}>
                          <div style={coaTopline}>
                            <span style={documentNumber}>
                              DOCUMENT{" "}
                              {String(index + 1).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            {index === 0 && (
                              <span style={newestBadge}>
                                LATEST
                              </span>
                            )}
                          </div>

                          <strong style={coaName}>
                            {coa.name}
                          </strong>

                          <div style={documentMetaGrid}>
                            <DocumentMeta
                              label="Product"
                              value={
                                selectedFolder.displayName
                              }
                            />

                            <DocumentMeta
                              label="Updated"
                              value={formatDate(
                                coa.updatedAt
                              )}
                            />

                            <DocumentMeta
                              label="Document"
                              value={
                                isPdf
                                  ? "PDF Certificate"
                                  : "Certificate Image"
                              }
                            />
                          </div>

                          <span style={openDocumentText}>
                            OPEN DOCUMENT →
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </>
            )
          ) : filteredFolders.length === 0 ? (
            <div style={messageCard}>
              <p style={bodyText}>
                No research products match your current filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setAvailableOnly(false);
                  setSortMode("az");
                }}
                style={secondaryActionButton}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={folderGrid}>
              {filteredFolders.map((folder) => {
                const newestDate = Math.max(
                  0,
                  ...folder.files.map((file) =>
                    file.updatedAt
                      ? new Date(
                          file.updatedAt
                        ).getTime()
                      : 0
                  )
                );

                return (
                  <button
                    key={folder.name}
                    type="button"
                    onClick={() =>
                      setSelectedFolder(folder)
                    }
                    style={{
                      ...folderCard,
                      borderColor:
                        folder.count > 0
                          ? "rgba(0,217,255,.34)"
                          : "rgba(255,255,255,.11)",
                    }}
                  >
                    <div style={folderImageWrap}>
                      {folder.image ? (
                        <img
                          src={folder.image}
                          alt={folder.displayName}
                          style={folderImage}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";

                            const fallback =
                              event.currentTarget
                                .nextElementSibling as
                                | HTMLElement
                                | null;

                            if (fallback) {
                              fallback.style.display =
                                "grid";
                            }
                          }}
                        />
                      ) : null}

                      <div
                        style={{
                          ...missingImage,
                          display: folder.image
                            ? "none"
                            : "grid",
                        }}
                      >
                        {folder.displayName}
                      </div>
                    </div>

                    <div style={folderContent}>
                      <span style={folderEyebrow}>
                        RESEARCH PRODUCT
                      </span>

                      <h3 style={folderTitle}>
                        {folder.displayName}
                      </h3>

                      <p style={folderText}>
                        {folder.count > 0
                          ? `${folder.count} certificate${
                              folder.count === 1
                                ? ""
                                : "s"
                            } available`
                          : "Documentation not currently available"}
                      </p>

                      {newestDate > 0 && (
                        <span style={folderUpdated}>
                          Latest:{" "}
                          {formatDate(
                            new Date(
                              newestDate
                            ).toISOString()
                          )}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        ...folderBadge,
                        color:
                          folder.count > 0
                            ? "#00ff99"
                            : "#9b9ba4",
                        borderColor:
                          folder.count > 0
                            ? "rgba(0,255,153,.42)"
                            : "rgba(255,255,255,.15)",
                        background:
                          folder.count > 0
                            ? "rgba(0,255,153,.07)"
                            : "rgba(255,255,255,.035)",
                      }}
                    >
                      {folder.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section style={educationPanel}>
          <div style={sectionTopline}>
            <div>
              <p style={sectionEyebrow}>UNDERSTANDING DOCUMENTATION</p>

              <h2 style={sectionTitle}>
                How to Read a Certificate of Analysis
              </h2>
            </div>
          </div>

          <p style={bodyText}>
            COA formats vary by analytical laboratory, but these
            are some of the most common elements researchers may
            encounter when reviewing available documentation.
          </p>

          <div style={educationGrid}>
            <EducationCard
              number="01"
              title="Sample Identity"
              text="The product or sample identifier connects the analytical report to the material submitted for testing."
              accent="#00d9ff"
            />

            <EducationCard
              number="02"
              title="Purity / Assay"
              text="Depending on the test method, a report may include purity, assay, concentration, or related analytical findings."
              accent="#00ff99"
            />

            <EducationCard
              number="03"
              title="Analytical Method"
              text="Laboratories may identify techniques such as HPLC, LC-MS, mass spectrometry, or other analytical methods."
              accent="#ff75df"
            />

            <EducationCard
              number="04"
              title="Laboratory Record"
              text="Review the testing laboratory, report identifiers, dates, and other traceability information shown on the certificate."
              accent="#ffcc00"
            />
          </div>
        </section>

        <section style={closingPanel}>
          <p style={closingEyebrow}>PUGPEP QUALITY</p>

          <h2 style={closingTitle}>
            Transparency Builds Better Research.
          </h2>

          <p style={closingText}>
            Our goal is to make available analytical
            documentation straightforward to find, review, and
            understand.
          </p>

          <div style={closingActions}>
            <Link href="/" style={primaryLink}>
              EXPLORE PRODUCTS
            </Link>

            <Link href="/about" style={secondaryLink}>
              ABOUT PUGPEP
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
  compact = false,
}: {
  label: string;
  value: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor: `${accent}55`,
        boxShadow: `0 0 18px ${accent}18`,
      }}
    >
      <span
        style={{
          ...statLabel,
          color: accent,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          ...statValue,
          fontSize: compact ? 20 : 34,
          lineHeight: compact ? 1.25 : 1.1,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StandardCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={standardCard}>
      <div style={standardIcon}>✓</div>

      <div>
        <strong style={standardTitle}>
          {title}
        </strong>

        <p style={standardText}>{text}</p>
      </div>
    </div>
  );
}

function DocumentMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={documentMeta}>
      <span style={documentMetaLabel}>
        {label}
      </span>

      <strong style={documentMetaValue}>
        {value}
      </strong>
    </div>
  );
}

function EducationCard({
  number,
  title,
  text,
  accent,
}: {
  number: string;
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <article
      style={{
        ...educationCard,
        borderColor: `${accent}35`,
      }}
    >
      <span
        style={{
          ...educationNumber,
          color: accent,
          borderColor: `${accent}55`,
        }}
      >
        {number}
      </span>

      <h3 style={educationTitle}>{title}</h3>
      <p style={educationText}>{text}</p>
    </article>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "clamp(28px, 6vw, 72px) clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 10% 0%, rgba(0,217,255,.14), transparent 30%), radial-gradient(circle at 90% 0%, rgba(255,45,210,.16), transparent 31%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
  fontSize: 16,
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const hero = {
  position: "relative" as const,
  overflow: "hidden",
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 28,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.97), rgba(4,4,7,.99))",
  boxShadow:
    "0 28px 80px rgba(0,0,0,.38)",
};

const heroGlowOne = {
  position: "absolute" as const,
  width: 380,
  height: 380,
  left: -120,
  top: -190,
  borderRadius: 999,
  background:
    "radial-gradient(circle, rgba(0,217,255,.20), transparent 68%)",
  pointerEvents: "none" as const,
};

const heroGlowTwo = {
  position: "absolute" as const,
  width: 420,
  height: 420,
  right: -130,
  top: -220,
  borderRadius: 999,
  background:
    "radial-gradient(circle, rgba(255,69,216,.20), transparent 68%)",
  pointerEvents: "none" as const,
};

const heroInner = {
  position: "relative" as const,
  zIndex: 2,
  maxWidth: 1080,
  margin: "0 auto",
  padding:
    "clamp(40px, 7vw, 72px) clamp(20px, 5vw, 54px)",
  textAlign: "center" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".16em",
};

const title = {
  margin: "12px 0 0",
  color: "#f7f7fa",
  fontSize:
    "clamp(46px, 8vw, 74px)",
  lineHeight: 1.03,
  letterSpacing: "-.045em",
};

const titleAccent = {
  color: "#ff45d8",
  textShadow:
    "0 0 26px rgba(255,45,210,.36)",
};

const subtitle = {
  maxWidth: 790,
  margin: "18px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const heroStats = {
  marginTop: 30,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const statCard = {
  minHeight: 122,
  padding: 20,
  display: "grid",
  alignContent: "space-between",
  gap: 8,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.94), rgba(6,6,9,.95))",
};

const statLabel = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform:
    "uppercase" as const,
};

const statValue = {
  color: "#fff",
};

const standardsPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
  boxShadow:
    "0 0 24px rgba(0,217,255,.07)",
};

const sectionTopline = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap" as const,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const sectionTitle = {
  margin: "7px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(30px, 5vw, 40px)",
};

const bodyText = {
  margin: "14px 0 0",
  color: "#c3c3ca",
  fontSize: 17,
  lineHeight: 1.75,
};

const quietLink = {
  color: "#00ff99",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".05em",
};

const standardsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const standardCard = {
  padding: 17,
  display: "grid",
  gridTemplateColumns:
    "38px minmax(0, 1fr)",
  gap: 12,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 13,
  background:
    "rgba(0,0,0,.25)",
};

const standardIcon = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,255,153,.42)",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 900,
};

const standardTitle = {
  color: "#ffffff",
  fontSize: 17,
};

const standardText = {
  margin: "6px 0 0",
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const latestPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(0,255,153,.23)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(4,15,11,.94), rgba(7,8,12,.96))",
};

const latestBadge = {
  padding: "7px 10px",
  border:
    "1px solid rgba(0,255,153,.30)",
  borderRadius: 999,
  color: "#00ff99",
  background:
    "rgba(0,255,153,.05)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".06em",
};

const latestGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const latestCard = {
  overflow: "hidden",
  display: "grid",
  gridTemplateRows:
    "150px minmax(0, 1fr)",
  padding: 0,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 16,
  background:
    "rgba(0,0,0,.28)",
  color: "#fff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const latestImageWrap = {
  overflow: "hidden",
  background: "#050507",
};

const latestImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const latestFallback = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  padding: 16,
  boxSizing: "border-box" as const,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.08), rgba(255,69,216,.08))",
  color: "#7df9ff",
  textAlign: "center" as const,
  fontWeight: 900,
};

const latestCardBody = {
  padding: 15,
  display: "grid",
  gap: 5,
};

const latestMeta = {
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const latestTitle = {
  color: "#ff75df",
  fontSize: 19,
};

const latestFile = {
  color: "#a8abb1",
  fontSize: 12,
  lineHeight: 1.45,
};

const latestCta = {
  marginTop: 8,
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
};

const galleryPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 30px)",
  scrollMarginTop: 24,
  border:
    "1px solid rgba(255,69,216,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,7,13,.95), rgba(5,10,14,.94))",
  boxShadow:
    "0 0 24px rgba(255,69,216,.06)",
};

const galleryHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap" as const,
};

const backButton = {
  minHeight: 48,
  padding: "11px 15px",
  border:
    "1px solid rgba(0,217,255,.48)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const filterPanel = {
  marginTop: 20,
  padding: 16,
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "end",
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 14,
  background:
    "rgba(0,0,0,.22)",
};

const searchWrap = {
  display: "grid",
  gap: 7,
};

const searchLabel = {
  color: "#d0d0d7",
  fontSize: 14,
  fontWeight: 900,
};

const searchInput = {
  width: "100%",
  minHeight: 54,
  boxSizing:
    "border-box" as const,
  padding: "14px 16px",
  border:
    "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
  fontSize: 16,
};

const filterControls = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const toggleLabel = {
  minHeight: 48,
  padding: "0 13px",
  display: "flex",
  alignItems: "center",
  gap: 9,
  border:
    "1px solid rgba(0,255,153,.23)",
  borderRadius: 10,
  background:
    "rgba(0,255,153,.04)",
  color: "#d7dadf",
  fontSize: 13,
  fontWeight: 800,
};

const checkbox = {
  width: 17,
  height: 17,
  accentColor: "#00ff99",
};

const sortSelect = {
  minHeight: 48,
  padding: "0 13px",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 10,
  background: "#050507",
  color: "#fff",
  fontWeight: 800,
};

const folderGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
  gap: 16,
};

const folderCard = {
  width: "100%",
  minHeight: 210,
  padding: 16,
  display: "grid",
  gridTemplateColumns:
    "92px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 14,
  border: "1px solid",
  borderRadius: 16,
  background:
    "rgba(0,0,0,.26)",
  color: "#ffffff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const folderImageWrap = {
  width: 88,
  height: 118,
  overflow: "hidden",
  border:
    "1px solid rgba(255,69,216,.30)",
  borderRadius: 12,
  background: "#050507",
};

const folderImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const missingImage = {
  width: "100%",
  height: "100%",
  placeItems: "center",
  boxSizing:
    "border-box" as const,
  padding: 10,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.08), rgba(255,69,216,.08))",
  color: "#7df9ff",
  textAlign:
    "center" as const,
  fontSize: 13,
  fontWeight: 900,
  lineHeight: 1.4,
};

const folderContent = {
  minWidth: 0,
};

const folderEyebrow = {
  color: "#00d9ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".09em",
};

const folderTitle = {
  margin: "4px 0 0",
  color: "#ff75df",
  fontSize: 23,
  overflowWrap:
    "anywhere" as const,
};

const folderText = {
  margin: "7px 0 0",
  color: "#a8a8b0",
  fontSize: 14,
  lineHeight: 1.5,
};

const folderUpdated = {
  display: "block",
  marginTop: 7,
  color: "#777c84",
  fontSize: 10,
};

const folderBadge = {
  minWidth: 38,
  minHeight: 38,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 999,
  fontWeight: 900,
};

const selectedSummary = {
  marginTop: 20,
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap" as const,
  border:
    "1px solid rgba(0,217,255,.18)",
  borderRadius: 14,
  background:
    "rgba(0,217,255,.035)",
};

const selectedEyebrow = {
  display: "block",
  color: "#00d9ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".10em",
};

const selectedCount = {
  display: "block",
  marginTop: 4,
  color: "#fff",
  fontSize: 19,
};

const selectedNote = {
  maxWidth: 520,
  margin: 0,
  color: "#9fa2a9",
  fontSize: 13,
  lineHeight: 1.6,
};

const coaGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
  gap: 18,
};

const coaCard = {
  overflow: "hidden",
  display: "grid",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 16,
  background:
    "rgba(0,0,0,.28)",
  color: "#ffffff",
  textDecoration: "none",
};

const imageWrap = {
  position: "relative" as const,
  aspectRatio: "4 / 5",
  overflow: "hidden",
  background: "#050507",
};

const coaImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const pdfPreview = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 10,
  padding: 24,
  boxSizing: "border-box" as const,
  textAlign: "center" as const,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.07), rgba(255,69,216,.06))",
};

const pdfBadge = {
  padding: "6px 9px",
  border:
    "1px solid rgba(255,69,216,.40)",
  borderRadius: 999,
  color: "#ff75df",
  background:
    "rgba(255,69,216,.06)",
  fontSize: 10,
  fontWeight: 900,
};

const pdfTitle = {
  color: "#fff",
  fontSize: 22,
};

const pdfText = {
  maxWidth: 230,
  color: "#aeb1b7",
  lineHeight: 1.6,
};

const imageOverlay = {
  position: "absolute" as const,
  left: 12,
  right: 12,
  bottom: 12,
  padding: "9px 12px",
  border:
    "1px solid rgba(0,217,255,.44)",
  borderRadius: 9,
  background:
    "rgba(0,0,0,.78)",
  color: "#7df9ff",
  textAlign: "center" as const,
  fontSize: 12,
  fontWeight: 900,
  backdropFilter:
    "blur(8px)",
};

const coaCardBody = {
  padding: 16,
  display: "grid",
  gap: 9,
};

const coaTopline = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const documentNumber = {
  color: "#00d9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const newestBadge = {
  padding: "4px 7px",
  border:
    "1px solid rgba(0,255,153,.34)",
  borderRadius: 999,
  color: "#00ff99",
  background:
    "rgba(0,255,153,.05)",
  fontSize: 8,
  fontWeight: 900,
};

const coaName = {
  color: "#ffffff",
  fontSize: 18,
  overflowWrap:
    "anywhere" as const,
};

const documentMetaGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(100px, 1fr))",
  gap: 8,
};

const documentMeta = {
  padding: 9,
  display: "grid",
  gap: 3,
  border:
    "1px solid rgba(255,255,255,.07)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,.018)",
};

const documentMetaLabel = {
  color: "#70757d",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
};

const documentMetaValue = {
  color: "#cfd1d6",
  fontSize: 10,
  overflowWrap: "anywhere" as const,
};

const openDocumentText = {
  marginTop: 3,
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
};

const loadingGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: 16,
};

const skeletonCard = {
  minHeight: 210,
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 16,
  background:
    "linear-gradient(110deg, #0b0b0f 8%, #121218 18%, #0b0b0f 33%)",
  backgroundSize:
    "200% 100%",
};

const messageCard = {
  marginTop: 20,
  padding: 28,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  border:
    "1px dashed rgba(0,217,255,.28)",
  borderRadius: 14,
  textAlign: "center" as const,
};

const errorText = {
  margin: 0,
  color: "#ff8a8a",
  fontSize: 16,
  lineHeight: 1.6,
};

const retryButton = {
  minHeight: 48,
  padding: "11px 15px",
  border:
    "1px solid #45d97a",
  borderRadius: 10,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryActionButton = {
  minHeight: 46,
  padding: "10px 14px",
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.05)",
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const educationPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,204,0,.23)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(13,11,5,.93), rgba(7,8,12,.96))",
};

const educationGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const educationCard = {
  padding: 18,
  display: "grid",
  gap: 10,
  border: "1px solid",
  borderRadius: 15,
  background:
    "rgba(0,0,0,.23)",
};

const educationNumber = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const educationTitle = {
  margin: 0,
  color: "#fff",
  fontSize: 19,
};

const educationText = {
  margin: 0,
  color: "#aeb0b7",
  lineHeight: 1.65,
};

const closingPanel = {
  maxWidth: 980,
  margin:
    "clamp(42px, 7vw, 74px) auto 0",
  padding:
    "clamp(26px, 5vw, 42px)",
  border:
    "1px solid rgba(0,217,255,.20)",
  borderRadius: 22,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.05), rgba(255,69,216,.05), rgba(0,255,153,.035))",
  textAlign: "center" as const,
};

const closingEyebrow = {
  margin: 0,
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const closingTitle = {
  margin: "9px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(34px, 6vw, 50px)",
};

const closingText = {
  maxWidth: 740,
  margin: "14px auto 0",
  color: "#c1c4ca",
  fontSize: 18,
  lineHeight: 1.7,
};

const closingActions = {
  marginTop: 22,
  display: "flex",
  justifyContent: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const primaryLink = {
  minHeight: 48,
  padding: "11px 16px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,255,153,.48)",
  borderRadius: 10,
  background:
    "rgba(0,255,153,.07)",
  color: "#00ff99",
  textDecoration: "none",
  fontWeight: 900,
};

const secondaryLink = {
  minHeight: 48,
  padding: "11px 16px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.42)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.05)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const responsiveStyle = `
  @media (max-width: 900px) {
    section > div[style*="grid-template-columns: minmax(0, 1fr) auto"] {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }

  @media (max-width: 760px) {
    #certificate-library > div[style*="grid-template-columns: minmax(0, 1fr) auto"] {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    select {
      width: 100%;
    }
  }
`;