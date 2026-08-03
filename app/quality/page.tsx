"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  image: string;
};

function normalizeKey(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9+-]/g, "");

  const aliases: Record<string, string> = {
    // Short COA folder names
    reta: "retatrutide",
    tirz: "tirzepatide",
    tesa: "tesamorelin",
    ipa: "ipamorelin",

    // Formatting differences
    motsc: "mots-c",
    "nad+": "nad-plus",
    nadplus: "nad-plus",
    mt2: "mt2",

    // CJC / Ipamorelin
    "cjc&ipa": "cjc-ipa",
    cjcipa: "cjc-ipa",
    "cjc--ipa": "cjc-ipa",

    // IGF
    "igf-lr3": "igf1lr3",
    "igf-1-lr3": "igf1lr3",
    igflr3: "igf1lr3",

    // Other possible folder differences
    ghkcu: "ghk-cu",
    "5-amino-1mq": "5-amino-1mq",
    aod9604: "aod9604",
    bpc157: "bpc-157",
    ss31: "ss-31",
    lipoc: "lipo-c",
  };

  return aliases[normalized] || normalized;
}

export default function QualityPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    folders,
    setFolders,
  ] =
    useState<
      CoaFolder[]
    >([]);

  const [
    selectedFolder,
    setSelectedFolder,
  ] =
    useState<
      CoaFolder | null
    >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  useEffect(() => {
    void loadCoaFolders();
  }, []);

  function formatName(
    name: string
  ) {
    return name
      .replaceAll("-", " ")
      .replace(
        /\b\w/g,
        (
          char
        ) =>
          char.toUpperCase()
      )
      .replace(
        "Nad Plus",
        "NAD+"
      )
      .replace(
        "Ghk Cu",
        "GHK-Cu"
      )
      .replace(
        "Igf Lr3",
        "IGF-LR3"
      )
      .replace(
        "Ss 31",
        "SS-31"
      )
      .replace(
        "Mt2",
        "MT-2"
      )
      .replace(
        "Mots C",
        "MOTS-C"
      )
      .replace(
        "Bpc 157",
        "BPC-157"
      )
      .replace(
        "Tb 500",
        "TB-500"
      )
      .replace(
        "Cjc Ipa",
        "CJC/IPA"
      );
  }

  function formatFileName(
    name: string
  ) {
    return formatName(
      name
        .replace(
          /\.[^/.]+$/,
          ""
        )
        .replaceAll(
          "_",
          "-"
        )
    );
  }

  async function loadCoaFolders() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        folderResult,
        productResult,
      ] = await Promise.all([
        supabase.storage
          .from("coas")
          .list("", {
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

      const {
        data: folderData,
        error: folderError,
      } = folderResult;

      if (folderError) {
        throw folderError;
      }

      if (productResult.error) {
        console.error(
          "Product image loading error:",
          productResult.error
        );
      }

      const productImages =
        new Map<
          string,
          string
        >();

      for (
        const product
        of productResult.data ||
          []
      ) {
        const image =
          String(
            product.image ||
              ""
          ).trim();

        if (!image) {
          continue;
        }

        const slugKey =
          normalizeKey(
            String(
              product.slug ||
                ""
            )
          );

        const nameKey =
          normalizeKey(
            String(
              product.name ||
                ""
            )
          );

        if (slugKey) {
          productImages.set(
            slugKey,
            image
          );
        }

        if (nameKey) {
          productImages.set(
            nameKey,
            image
          );
        }
      }

      const validFolders =
        (
          folderData ||
          []
        ).filter(
          (
            folder
          ) =>
            folder.name &&
            folder.name !==
              ".emptyFolderPlaceholder"
        );

      const folderResults =
        await Promise.all(
          validFolders.map(
            async (
              folder
            ) => {
              const {
                data:
                  fileData,
                error:
                  fileError,
              } =
                await supabase.storage
                  .from("coas")
                  .list(
                    folder.name,
                    {
                      limit: 200,
                      sortBy: {
                        column:
                          "name",
                        order:
                          "desc",
                      },
                    }
                  );

              if (fileError) {
                console.error(
                  `Unable to load COAs for ${folder.name}:`,
                  fileError
                );
              }

              const coaFiles =
                (
                  fileData ||
                  []
                )
                  .filter(
                    (
                      file
                    ) =>
                      /\.(png|jpg|jpeg|webp)$/i.test(
                        file.name
                      )
                  )
                  .map(
                    (
                      file
                    ) => {
                      const path =
                        `${folder.name}/${file.name}`;

                      const {
                        data:
                          publicUrlData,
                      } =
                        supabase.storage
                          .from(
                            "coas"
                          )
                          .getPublicUrl(
                            path
                          );

                      return {
                        name:
                          formatFileName(
                            file.name
                          ),
                        url:
                          publicUrlData.publicUrl,
                      };
                    }
                  );

              return {
                name:
                  folder.name,
                displayName:
                  formatName(
                    folder.name
                  ),
                count:
                  coaFiles.length,
                files:
                  coaFiles,
                image:
                  productImages.get(
                    normalizeKey(
                      folder.name
                    )
                  ) ||
                  productImages.get(
                    normalizeKey(
                      formatName(
                        folder.name
                      )
                    )
                  ) ||
                  "",
              };
            }
          )
        );

      folderResults.sort(
        (
          a,
          b
        ) =>
          a.displayName.localeCompare(
            b.displayName
          )
      );

      setFolders(
        folderResults
      );
    } catch (error) {
      console.error(
        "COA loading error:",
        error
      );

      setLoadError(
        "Certificates of Analysis could not be loaded right now."
      );
    } finally {
      setLoading(false);
    }
  }

  const totalCoas =
    folders.reduce(
      (
        sum,
        folder
      ) =>
        sum +
        folder.count,
      0
    );

  const foldersWithCoas =
    folders.filter(
      (
        folder
      ) =>
        folder.count >
        0
    ).length;

  const filteredFolders =
    folders.filter(
      (
        folder
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();

        return (
          !query ||
          folder.displayName
            .toLowerCase()
            .includes(
              query
            ) ||
          folder.name
            .toLowerCase()
            .includes(
              query
            )
        );
      }
    );

  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            QUALITY DOCUMENTATION
          </p>

          <h1 style={title}>
            Certificates of Analysis
          </h1>

          <p style={subtitle}>
            Explore available third-party testing documentation organized by research compound.
          </p>

          <div style={heroStats}>
            <StatCard
              label="Research Listings"
              value={String(
                folders.length
              )}
              accent="#00d9ff"
            />

            <StatCard
              label="Listings With COAs"
              value={String(
                foldersWithCoas
              )}
              accent="#00ff99"
            />

            <StatCard
              label="Available COAs"
              value={String(
                totalCoas
              )}
              accent="#ff75df"
            />
          </div>
        </section>

        <section style={standardsPanel}>
          <div>
            <p style={sectionEyebrow}>
              OUR STANDARD
            </p>

            <h2 style={sectionTitle}>
              Independent Laboratory Testing
            </h2>
          </div>

          <p style={bodyText}>
            PugPep organizes available Certificates of Analysis by product so researchers can review applicable batch documentation in one place.
          </p>

          <div style={standardsGrid}>
            <StandardCard
              title="Independent Testing"
              text="Available documentation is provided from third-party analytical laboratories."
            />

            <StandardCard
              title="Product Organization"
              text="COAs are grouped by research compound for easier review."
            />

            <StandardCard
              title="Open Access"
              text="Available certificates can be opened in a separate browser tab for closer inspection."
            />
          </div>
        </section>

        <section style={galleryPanel}>
          <div style={galleryHeader}>
            <div>
              <p style={sectionEyebrow}>
                DOCUMENT LIBRARY
              </p>

              <h2 style={sectionTitle}>
                {selectedFolder
                  ? `${selectedFolder.displayName} COAs`
                  : "Browse by Product"}
              </h2>
            </div>

            {selectedFolder && (
              <button
                type="button"
                onClick={() =>
                  setSelectedFolder(
                    null
                  )
                }
                style={backButton}
              >
                ← Back to Products
              </button>
            )}
          </div>

          {!selectedFolder && (
            <div style={searchWrap}>
              <label
                htmlFor="coa-search"
                style={searchLabel}
              >
                Search Products
              </label>

              <input
                id="coa-search"
                type="search"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search compounds..."
                style={searchInput}
              />
            </div>
          )}

          {loading ? (
            <div style={loadingGrid}>
              {Array.from({
                length: 8,
              }).map(
                (
                  _,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    style={skeletonCard}
                  />
                )
              )}
            </div>
          ) : loadError ? (
            <div style={messageCard}>
              <p style={errorText}>
                {loadError}
              </p>

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
            selectedFolder.files.length ===
            0 ? (
              <div style={messageCard}>
                <p style={bodyText}>
                  No COAs have been uploaded for this product yet.
                </p>
              </div>
            ) : (
              <div style={coaGrid}>
                {selectedFolder.files.map(
                  (
                    coa,
                    index
                  ) => (
                    <a
                      key={
                        coa.url
                      }
                      href={
                        coa.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={coaCard}
                    >
                      <div style={imageWrap}>
                        <img
                          src={
                            coa.url
                          }
                          alt={
                            coa.name
                          }
                          style={coaImage}
                        />

                        <div style={imageOverlay}>
                          Open Full Certificate
                        </div>
                      </div>

                      <div style={coaCardBody}>
                        <span style={documentNumber}>
                          DOCUMENT{" "}
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <strong style={coaName}>
                          {
                            coa.name
                          }
                        </strong>
                      </div>
                    </a>
                  )
                )}
              </div>
            )
          ) : filteredFolders.length ===
            0 ? (
            <div style={messageCard}>
              <p style={bodyText}>
                No products match your search.
              </p>
            </div>
          ) : (
            <div style={folderGrid}>
              {filteredFolders.map(
                (
                  folder
                ) => (
                  <button
                    key={
                      folder.name
                    }
                    type="button"
                    onClick={() =>
                      setSelectedFolder(
                        folder
                      )
                    }
                    style={{
                      ...folderCard,
                      borderColor:
                        folder.count >
                        0
                          ? "rgba(0,217,255,.34)"
                          : "rgba(255,255,255,.11)",
                    }}
                  >
                    <div style={folderImageWrap}>
                      {folder.image ? (
                        <img
                          src={folder.image}
                          alt={
                            folder.displayName
                          }
                          style={folderImage}
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              "none";

                            const fallback =
                              event.currentTarget
                                .nextElementSibling as
                                | HTMLElement
                                | null;

                            if (
                              fallback
                            ) {
                              fallback.style.display =
                                "grid";
                            }
                          }}
                        />
                      ) : null}

                      <div
                        style={{
                          ...missingImage,
                          display:
                            folder.image
                              ? "none"
                              : "grid",
                        }}
                      >
                        {
                          folder.displayName
                        }
                      </div>
                    </div>

                    <div style={folderContent}>
                      <h3 style={folderTitle}>
                        {
                          folder.displayName
                        }
                      </h3>

                      <p style={folderText}>
                        {folder.count >
                        0
                          ? `${folder.count} certificate${
                              folder.count ===
                              1
                                ? ""
                                : "s"
                            } available`
                          : "No certificates available yet"}
                      </p>
                    </div>

                    <span
                      style={{
                        ...folderBadge,
                        color:
                          folder.count >
                          0
                            ? "#00ff99"
                            : "#9b9ba4",
                        borderColor:
                          folder.count >
                          0
                            ? "rgba(0,255,153,.42)"
                            : "rgba(255,255,255,.15)",
                        background:
                          folder.count >
                          0
                            ? "rgba(0,255,153,.07)"
                            : "rgba(255,255,255,.035)",
                      }}
                    >
                      {
                        folder.count
                      }
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor:
          `${accent}55`,
        boxShadow:
          `0 0 18px ${accent}18`,
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

      <strong style={statValue}>
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
      <div style={standardIcon}>
        ✓
      </div>

      <div>
        <strong style={standardTitle}>
          {title}
        </strong>

        <p style={standardText}>
          {text}
        </p>
      </div>
    </div>
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
  maxWidth: 980,
  margin: "0 auto",
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
  margin: "10px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(46px, 8vw, 72px)",
  letterSpacing: "-.04em",
  textShadow:
    "0 0 26px rgba(255,45,210,.36)",
};

const subtitle = {
  maxWidth: 760,
  margin: "16px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const heroStats = {
  marginTop: 28,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const statCard = {
  padding: 20,
  display: "grid",
  gap: 8,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.94), rgba(6,6,9,.95))",
};

const statLabel = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform:
    "uppercase" as const,
};

const statValue = {
  fontSize: 34,
};

const standardsPanel = {
  marginTop: 34,
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

const galleryPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 30px)",
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

const searchWrap = {
  marginTop: 18,
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

const folderGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
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

const folderTitle = {
  margin: 0,
  color: "#ff75df",
  fontSize: 23,
  overflowWrap:
    "anywhere" as const,
};

const folderText = {
  margin: "8px 0 0",
  color: "#a8a8b0",
  fontSize: 15,
  lineHeight: 1.5,
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

const coaGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
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
  fontSize: 13,
  fontWeight: 900,
  backdropFilter:
    "blur(8px)",
};

const coaCardBody = {
  padding: 16,
  display: "grid",
  gap: 6,
};

const documentNumber = {
  color: "#00d9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const coaName = {
  color: "#ffffff",
  fontSize: 18,
  overflowWrap:
    "anywhere" as const,
};

const loadingGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: 16,
};

const skeletonCard = {
  minHeight: 170,
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