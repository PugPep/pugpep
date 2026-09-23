"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createClient,
} from "../../../lib/supabaseClient";

type Family =
  | "peptides"
  | "sprays"
  | "lab-materials";

type Product = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  category: string;
  color?: string | null;
};

type Template = {
  id: string;
  family: Family;
  name: string;
  version: number;
  is_active: boolean;

  template_url: string;
  mask_url: string | null;

  canvas_width: number;
  canvas_height: number;

  name_y: number;
  strength_y: number;
  research_text_y: number;

  name_font_size: number;
  strength_font_size: number;
  research_font_size: number;
};

type PaletteChoice =
  | "random"
  | "neon-pink"
  | "electric-cyan"
  | "acid-green"
  | "ultraviolet"
  | "plasma-orange"
  | "laser-blue"
  | "cyber-lime"
  | "hot-magenta"
  | "custom";

type ProductLayout = {
  labelText: string;
  nameY: number;
  strengthY: number;
  researchTextY: number;
  nameFontSize: number;
  strengthFontSize: number;
  researchFontSize: number;
};

type BulkPreviewItem = {
  productId: string;
  productName: string;
  previewUrl: string;
  fitStatus: "pass" | "review";
  reasons: string[];
  approved: boolean;
  layout: ProductLayout;
  letteringColor: string;
};

type SavedBulkState = {
  productId: string;
  approved: boolean;
  layout: ProductLayout;
  letteringColor?: string;
};

type SavedImageEngineSession = {
  version: 1;
  savedAt: string;
  family: Family;
  selectedProductId: string;
  selectedTemplateId: string;
  paletteChoice: PaletteChoice;
  customPickerColor: string;
  layout: {
    nameY: number;
    strengthY: number;
    researchY: number;
    nameFontSize: number;
    strengthFontSize: number;
    researchFontSize: number;
  };
  bulk: SavedBulkState[];
};

type SavedImageEngineSessionRecord = SavedImageEngineSession & {
  id: string;
  label: string;
};


const IMAGE_ENGINE_SESSION_KEY =
  "pugpep-product-image-engine-session-v1";

const IMAGE_ENGINE_SESSIONS_KEY =
  "pugpep-product-image-engine-sessions-v1";

const BULK_PREVIEW_CONCURRENCY = 4;

const PALETTE_OPTIONS: Array<{
  key: PaletteChoice;
  label: string;
  color: string;
}> = [
  {
    key: "random",
    label: "Random by Product",
    color: "#ffffff",
  },
  {
    key: "neon-pink",
    label: "Neon Pink",
    color: "#ff45d8",
  },
  {
    key: "electric-cyan",
    label: "Electric Cyan",
    color: "#00d9ff",
  },
  {
    key: "acid-green",
    label: "Acid Green",
    color: "#00ff99",
  },
  {
    key: "ultraviolet",
    label: "Ultraviolet",
    color: "#a855f7",
  },
  {
    key: "plasma-orange",
    label: "Plasma Orange",
    color: "#ff7a18",
  },
  {
    key: "laser-blue",
    label: "Laser Blue",
    color: "#3b82f6",
  },
  {
    key: "cyber-lime",
    label: "Cyber Lime",
    color: "#b7ff00",
  },
  {
    key: "hot-magenta",
    label: "Hot Magenta",
    color: "#ff1493",
  },
];

export default function ProductImagesAdminPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    family,
    setFamily,
  ] =
    useState<Family>(
      "peptides"
    );

  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      []
    );

  const [
    templates,
    setTemplates,
  ] =
    useState<Template[]>(
      []
    );

  const [
    selectedProductId,
    setSelectedProductId,
  ] =
    useState("");

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] =
    useState("");

  const [
    templateName,
    setTemplateName,
  ] =
    useState(
      "PugPep AI Master"
    );

  const [
    templateFile,
    setTemplateFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    maskFile,
    setMaskFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    bulkPreviews,
    setBulkPreviews,
  ] =
    useState<BulkPreviewItem[]>(
      []
    );

  const [
    bulkPreviewing,
    setBulkPreviewing,
  ] =
    useState(false);

  const [
    editingPreviewId,
    setEditingPreviewId,
  ] =
    useState("");

  const [
    nameY,
    setNameY,
  ] =
    useState(1105);

  const [
    strengthY,
    setStrengthY,
  ] =
    useState(1170);

  const [
    researchY,
    setResearchY,
  ] =
    useState(1205);

  const [
    nameFontSize,
    setNameFontSize,
  ] =
    useState(54);

  const [
    strengthFontSize,
    setStrengthFontSize,
  ] =
    useState(42);

  const [
    researchFontSize,
    setResearchFontSize,
  ] =
    useState(22);

  const [
    paletteChoice,
    setPaletteChoice,
  ] =
    useState<PaletteChoice>(
      "random"
    );

  const [
    customPickerColor,
    setCustomPickerColor,
  ] =
    useState("#ff45d8");

  const [
    restoreBulkRequested,
    setRestoreBulkRequested,
  ] = useState(false);

  const [
    savedSessions,
    setSavedSessions,
  ] = useState<SavedImageEngineSessionRecord[]>([]);

  const [
    selectedSavedSessionId,
    setSelectedSavedSessionId,
  ] = useState("");

  const [
    sessionTitle,
    setSessionTitle,
  ] = useState("");

  const [
    renamingSession,
    setRenamingSession,
  ] = useState(false);

  const livePreviewSequenceRef =
    useRef(0);

  const latestLivePreviewByProductRef =
    useRef<Record<string, number>>({});

  const pendingSessionRestoreRef =
    useRef<SavedImageEngineSession | null>(null);

  const restoredBulkStateRef =
    useRef<Map<string, SavedBulkState>>(new Map());

  const bulkPreviewsRef =
    useRef<BulkPreviewItem[]>([]);

  useEffect(() => {
    bulkPreviewsRef.current =
      bulkPreviews;
  }, [bulkPreviews]);

  useEffect(() => {
    return () => {
      bulkPreviewsRef.current.forEach(
        (item) => {
          if (item.previewUrl) {
            URL.revokeObjectURL(
              item.previewUrl
            );
          }
        }
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const requestedFamily =
      params.get("family");

    if (
      requestedFamily === "peptides" ||
      requestedFamily === "sprays" ||
      requestedFamily === "lab-materials"
    ) {
      setFamily(
        requestedFamily
      );
    }
  }, []);

  async function getAuthHeaders() {
    const maxAttempts = 20;
    const delayMs = 100;

    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt += 1
    ) {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (
        session?.access_token
      ) {
        return {
          Authorization:
            `Bearer ${session.access_token}`,
        };
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delayMs
          )
      );
    }

    throw new Error(
      "Your admin session could not be restored. Refresh the page or sign in again."
    );
  }

  function loadTemplateControls(
    template:
      Template | undefined
  ) {
    if (
      !template
    ) {
      return;
    }

    setNameY(
      template.name_y ??
        1105
    );

    setStrengthY(
      template.strength_y ??
        1170
    );

    setResearchY(
      template.research_text_y ??
        1205
    );

    setNameFontSize(
      template.name_font_size ??
        54
    );

    setStrengthFontSize(
      template.strength_font_size ??
        42
    );

    setResearchFontSize(
      template.research_font_size ??
        22
    );
  }

  function loadSavedSessionList() {
    if (typeof window === "undefined") {
      return [] as SavedImageEngineSessionRecord[];
    }

    try {
      const raw =
        window.localStorage.getItem(
          IMAGE_ENGINE_SESSIONS_KEY
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      const sessions =
        Array.isArray(parsed)
          ? (parsed as SavedImageEngineSessionRecord[])
              .filter(
                (session) =>
                  session &&
                  session.version === 1 &&
                  typeof session.id === "string"
              )
              .sort(
                (a, b) =>
                  new Date(b.savedAt).getTime() -
                  new Date(a.savedAt).getTime()
              )
          : [];

      setSavedSessions(sessions);

      if (
        sessions.length > 0 &&
        !selectedSavedSessionId
      ) {
        setSelectedSavedSessionId(
          sessions[0].id
        );
        setSessionTitle(
          sessions[0].label
        );
      }

      return sessions;
    } catch (error) {
      console.error(error);
      setSavedSessions([]);
      return [] as SavedImageEngineSessionRecord[];
    }
  }

  useEffect(() => {
    loadSavedSessionList();
  }, []);

  function saveSession() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const savedAt =
        new Date().toISOString();

      const baseSession: SavedImageEngineSession = {
        version: 1,
        savedAt,
        family,
        selectedProductId,
        selectedTemplateId,
        paletteChoice,
        customPickerColor,
        layout: {
          nameY,
          strengthY,
          researchY,
          nameFontSize,
          strengthFontSize,
          researchFontSize,
        },
        bulk: bulkPreviews.map((item) => ({
          productId: item.productId,
          approved: item.approved,
          layout: item.layout,
          letteringColor: item.letteringColor,
        })),
      };

      const sessionRecord:
        SavedImageEngineSessionRecord = {
          ...baseSession,
          id: `session-${Date.now()}`,
          label:
            sessionTitle.trim() ||
            (
              `${family.replace("-", " ").toUpperCase()} • ` +
              new Date(savedAt).toLocaleString()
            ),
        };

      window.localStorage.setItem(
        IMAGE_ENGINE_SESSION_KEY,
        JSON.stringify(baseSession)
      );

      const existingRaw =
        window.localStorage.getItem(
          IMAGE_ENGINE_SESSIONS_KEY
        );

      const existing =
        existingRaw
          ? JSON.parse(existingRaw)
          : [];

      const nextSessions:
        SavedImageEngineSessionRecord[] = [
          sessionRecord,
          ...(Array.isArray(existing)
            ? existing
            : []),
        ]
          .filter(
            (session, index, all) =>
              session &&
              typeof session.id === "string" &&
              all.findIndex(
                (candidate) =>
                  candidate.id === session.id
              ) === index
          )
          .slice(0, 20);

      window.localStorage.setItem(
        IMAGE_ENGINE_SESSIONS_KEY,
        JSON.stringify(nextSessions)
      );

      setSavedSessions(nextSessions);
      setSelectedSavedSessionId(
        sessionRecord.id
      );
      setSessionTitle(
        sessionRecord.label
      );

      setStatus(
        `Session saved • ${sessionRecord.label} • ${bulkPreviews.length} bulk preview${bulkPreviews.length === 1 ? "" : "s"} remembered`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        "Unable to save this session in the browser."
      );
    }
  }

  function renameSelectedSession() {
    if (typeof window === "undefined") {
      return;
    }

    const nextTitle =
      sessionTitle.trim();

    if (!selectedSavedSessionId) {
      setStatus(
        "Choose a saved session to rename."
      );
      return;
    }

    if (!nextTitle) {
      setStatus(
        "Enter a session title first."
      );
      return;
    }

    try {
      const nextSessions =
        savedSessions.map(
          (session) =>
            session.id ===
            selectedSavedSessionId
              ? {
                  ...session,
                  label:
                    nextTitle,
                }
              : session
        );

      window.localStorage.setItem(
        IMAGE_ENGINE_SESSIONS_KEY,
        JSON.stringify(
          nextSessions
        )
      );

      setSavedSessions(
        nextSessions
      );

      setRenamingSession(
        false
      );

      setStatus(
        `Session renamed • ${nextTitle}`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        "Unable to rename the saved session."
      );
    }
  }

  function deleteSelectedSession() {
    if (typeof window === "undefined") {
      return;
    }

    if (!selectedSavedSessionId) {
      setStatus(
        "Choose a saved session to delete."
      );
      return;
    }

    const selected =
      savedSessions.find(
        (session) =>
          session.id ===
          selectedSavedSessionId
      );

    const confirmed =
      window.confirm(
        `Delete saved session "${selected?.label || "Selected session"}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const nextSessions =
        savedSessions.filter(
          (session) =>
            session.id !==
            selectedSavedSessionId
        );

      window.localStorage.setItem(
        IMAGE_ENGINE_SESSIONS_KEY,
        JSON.stringify(
          nextSessions
        )
      );

      setSavedSessions(
        nextSessions
      );

      const nextSelectedId =
        nextSessions[0]?.id || "";

      setSelectedSavedSessionId(
        nextSelectedId
      );

      setSessionTitle(
        nextSessions[0]?.label || ""
      );

      setRenamingSession(
        false
      );

      setStatus(
        selected?.label
          ? `Session deleted • ${selected.label}`
          : "Saved session deleted."
      );
    } catch (error) {
      console.error(error);
      setStatus(
        "Unable to delete the saved session."
      );
    }
  }

  function restoreSession() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const chosenSession =
        savedSessions.find(
          (session) =>
            session.id ===
            selectedSavedSessionId
        );

      const legacyRaw =
        window.localStorage.getItem(
          IMAGE_ENGINE_SESSION_KEY
        );

      if (
        !chosenSession &&
        !legacyRaw
      ) {
        setStatus(
          "No saved Product Image Engine session was found in this browser."
        );
        return;
      }

      const session:
        SavedImageEngineSession =
          chosenSession ||
          JSON.parse(
            legacyRaw as string
          );

      if (
        session.version !== 1 ||
        !["peptides", "sprays", "lab-materials"].includes(session.family)
      ) {
        setStatus("The saved session is not compatible with this version of the page.");
        return;
      }

      pendingSessionRestoreRef.current = session;
      restoredBulkStateRef.current = new Map(
        (session.bulk || []).map((item) => [item.productId, item])
      );

      setPaletteChoice(session.paletteChoice || "random");
      setCustomPickerColor(session.customPickerColor || "#ff45d8");

      setNameY(session.layout?.nameY ?? 1105);
      setStrengthY(session.layout?.strengthY ?? 1170);
      setResearchY(session.layout?.researchY ?? 1205);
      setNameFontSize(session.layout?.nameFontSize ?? 54);
      setStrengthFontSize(session.layout?.strengthFontSize ?? 42);
      setResearchFontSize(session.layout?.researchFontSize ?? 22);

      if (family !== session.family) {
        setStatus("Restoring saved session...");
        setFamily(session.family);
        return;
      }

      const savedTemplateExists = templates.some(
        (template) => template.id === session.selectedTemplateId
      );
      const savedProductExists = products.some(
        (product) => product.id === session.selectedProductId
      );

      if (savedTemplateExists) {
        setSelectedTemplateId(session.selectedTemplateId);
      }

      if (savedProductExists) {
        setSelectedProductId(session.selectedProductId);
      }

      pendingSessionRestoreRef.current = null;

      if ((session.bulk || []).length > 0) {
        setRestoreBulkRequested(true);
        setStatus("Session restored. Rebuilding saved bulk previews...");
      } else {
        setStatus("Saved session restored.");
      }
    } catch (error) {
      console.error(error);
      setStatus("The saved session could not be restored.");
    }
  }

  const loadEngineData =
    useCallback(
      async () => {
        try {
          setStatus(
            "Loading Product Image Engine..."
          );

          const headers =
            await getAuthHeaders();

          const [
            productResponse,
            templateResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/admin/product-image-engine/products?family=${family}`,
                {
                  headers,
                }
              ),

              fetch(
                `/api/admin/product-image-engine/templates?family=${family}`,
                {
                  headers,
                }
              ),
            ]);

          if (
            !productResponse.ok
          ) {
            throw new Error(
              await productResponse.text()
            );
          }

          if (
            !templateResponse.ok
          ) {
            throw new Error(
              await templateResponse.text()
            );
          }

          const productJson =
            await productResponse.json();

          const templateJson =
            await templateResponse.json();

          const loadedProducts:
            Product[] =
            productJson.products ||
            [];

          const loadedTemplates:
            Template[] =
            templateJson.templates ||
            [];

          setProducts(
            loadedProducts
          );

          setTemplates(
            loadedTemplates
          );

          const requestedProductSlug =
            typeof window !== "undefined"
              ? new URLSearchParams(
                  window.location.search
                ).get("product")
              : null;

          const requestedProduct =
            loadedProducts.find(
              (product) =>
                product.slug ===
                requestedProductSlug
            );

          const firstProduct =
            requestedProduct ||
            loadedProducts[0];

          const activeTemplate =
            loadedTemplates.find(
              (
                template
              ) =>
                template.is_active
            ) ||
            loadedTemplates[0];

          const pendingSession =
            pendingSessionRestoreRef.current;

          const sessionForFamily =
            pendingSession?.family === family
              ? pendingSession
              : null;

          const restoredProduct =
            sessionForFamily
              ? loadedProducts.find(
                  (product) =>
                    product.id === sessionForFamily.selectedProductId
                )
              : undefined;

          const restoredTemplate =
            sessionForFamily
              ? loadedTemplates.find(
                  (template) =>
                    template.id === sessionForFamily.selectedTemplateId
                )
              : undefined;

          const nextProduct =
            restoredProduct || firstProduct;

          const nextTemplate =
            restoredTemplate || activeTemplate;

          setSelectedProductId(
            nextProduct?.id || ""
          );

          setSelectedTemplateId(
            nextTemplate?.id || ""
          );

          if (sessionForFamily) {
            setPaletteChoice(
              sessionForFamily.paletteChoice || "random"
            );
            setCustomPickerColor(
              sessionForFamily.customPickerColor || "#ff45d8"
            );
            setNameY(sessionForFamily.layout?.nameY ?? 1105);
            setStrengthY(sessionForFamily.layout?.strengthY ?? 1170);
            setResearchY(sessionForFamily.layout?.researchY ?? 1205);
            setNameFontSize(sessionForFamily.layout?.nameFontSize ?? 54);
            setStrengthFontSize(sessionForFamily.layout?.strengthFontSize ?? 42);
            setResearchFontSize(sessionForFamily.layout?.researchFontSize ?? 22);

            restoredBulkStateRef.current = new Map(
              (sessionForFamily.bulk || []).map((item) => [item.productId, item])
            );

            pendingSessionRestoreRef.current = null;

            if ((sessionForFamily.bulk || []).length > 0) {
              setRestoreBulkRequested(true);
              setStatus("Session restored. Rebuilding saved bulk previews...");
            } else {
              setStatus("Saved session restored.");
            }
          } else {
            loadTemplateControls(
              nextTemplate
            );
          }

          if (
            previewUrl
          ) {
            URL.revokeObjectURL(
              previewUrl
            );
          }

          setPreviewUrl("");

          if (!sessionForFamily) {
            setStatus("");
          }
        } catch (
          error
        ) {
          console.error(
            error
          );

          setStatus(
            error instanceof Error
              ? error.message
              : "Unable to load Product Image Engine."
          );
        }
      },
      [
        family,
      ]
    );

  useEffect(
    () => {
      void loadEngineData();
    },
    [
      loadEngineData,
    ]
  );

  useEffect(() => {
    if (!editingPreviewId || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingPreviewId]);

  useEffect(
    () => {
      const selectedTemplate =
        templates.find(
          (
            template
          ) =>
            template.id ===
            selectedTemplateId
        );

      loadTemplateControls(
        selectedTemplate
      );
    },
    [
      selectedTemplateId,
      templates,
    ]
  );

  async function uploadTemplate(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    if (
      !templateFile
    ) {
      setStatus(
        "Choose an AI-generated template image first."
      );

      return;
    }

    try {
      setBusy(true);

      setStatus(
        "Uploading AI master template..."
      );

      const headers =
        await getAuthHeaders();

      const form =
        new FormData();

      form.append(
        "family",
        family
      );

      form.append(
        "name",
        templateName
      );

      form.append(
        "template",
        templateFile
      );

      if (
        maskFile
      ) {
        form.append(
          "mask",
          maskFile
        );
      }

      const response =
        await fetch(
          "/api/admin/product-image-engine/templates",
          {
            method:
              "POST",

            headers,

            body:
              form,
          }
        );

      const responseText =
        await response.text();

      if (
        !response.ok
      ) {
        throw new Error(
          responseText ||
            "Template upload failed."
        );
      }

      setTemplateFile(
        null
      );

      setMaskFile(
        null
      );

      setStatus(
        "Template uploaded and activated."
      );

      await loadEngineData();
    } catch (
      error
    ) {
      console.error(
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Template upload failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveLayout() {
    if (
      !selectedTemplateId
    ) {
      setStatus(
        "Choose a template first."
      );

      return;
    }

    try {
      setBusy(true);

      setStatus(
        "Saving template layout..."
      );

      const response =
        await fetch(
          "/api/admin/product-image-engine/templates",
          {
            method:
              "PATCH",

            headers: {
              ...(
                await getAuthHeaders()
              ),

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                templateId:
                  selectedTemplateId,

                nameY,

                strengthY,

                researchTextY:
                  researchY,

                nameFontSize,

                strengthFontSize,

                researchFontSize,
              }),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          json.error ||
            "Unable to save layout."
        );
      }

      const updatedTemplate:
        Template =
        json.template;

      setTemplates(
        (
          current
        ) =>
          current.map(
            (
              template
            ) =>
              template.id ===
              updatedTemplate.id
                ? updatedTemplate
                : template
          )
      );

      loadTemplateControls(
        updatedTemplate
      );

      setStatus(
        "Template layout saved."
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to save template layout."
      );
    } finally {
      setBusy(false);
    }
  }

  function useCustomColor(
    value: string
  ) {
    setCustomPickerColor(
      value
    );

    if (
      /^#[0-9a-fA-F]{6}$/.test(
        value
      )
    ) {
      setPaletteChoice(
        "custom"
      );
    }
  }

  function getValidHexColor(
    value?: string | null
  ) {
    const trimmed =
      value?.trim();

    return trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed)
      ? trimmed
      : null;
  }

  function getProductAccentColor(
    product?: Product
  ) {
    return (
      getValidHexColor(
        product?.color
      ) || "#ff45d8"
    );
  }

  function getManualOrProductColor(
    product?: Product
  ) {
    return (
      getValidHexColor(
        customPickerColor
      ) || getProductAccentColor(product)
    );
  }

  async function generatePreview() {
    if (
      !selectedProductId ||
      !selectedTemplateId
    ) {
      setStatus(
        "Choose a product and template first."
      );

      return;
    }

    try {
      setBusy(true);

      setStatus(
        "Generating preview..."
      );

      const selectedPreviewProduct =
        products.find(
          (product) =>
            product.id ===
            selectedProductId
        );

      const response =
        await fetch(
          "/api/admin/product-image-engine/preview",
          {
            method:
              "POST",

            cache:
              "no-store",

            headers: {
              ...(
                await getAuthHeaders()
              ),

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                productId:
                  selectedProductId,

                templateId:
                  selectedTemplateId,

                layout: {
                  nameY,

                  strengthY,

                  researchTextY:
                    researchY,

                  nameFontSize,

                  strengthFontSize,

                  researchFontSize,
                },

                paletteKey:
                  "custom",
                customColor:
                  getManualOrProductColor(
                    selectedPreviewProduct
                  ),
              }),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          await response.text()
        );
      }

      const mode =
        response.headers.get(
          "X-Product-Image-Mode"
        );

      if (
        mode !==
        "preview-only"
      ) {
        throw new Error(
          "Preview safety check failed. No live image changes were allowed."
        );
      }

      const blob =
        await response.blob();

      if (
        previewUrl
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      const nextPreviewUrl =
        URL.createObjectURL(
          blob
        );

      setPreviewUrl(
        nextPreviewUrl
      );

      const palette =
        response.headers.get(
          "X-Palette-Key"
        );

      setStatus(
        palette
          ? `Safe preview ready • ${palette} • live website image unchanged`
          : "Safe preview ready • live website image unchanged"
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Preview generation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function splitProductLabel(productName: string) {
    const cleaned = productName.trim();

    const match = cleaned.match(
      /^(.*?)(?:\s+|\s*[-–—]\s*)((?:\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?)?\s*(?:mg|mcg|g|iu))|(?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)\s*\+\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)))$/i
    );

    if (!match) {
      return {
        name: cleaned,
        strength: "",
      };
    }

    return {
      name: match[1].trim(),
      strength: match[2]
        .replace(/\s+/g, "")
        .replace(/mg\+/, "mg + ")
        .trim(),
    };
  }

  function getLongestLabelLine(
    value: string
  ) {
    return value
      .replace(/\r\n/g, "\n")
      .split("\n")
      .reduce(
        (longest, line) =>
          line.length >
          longest.length
            ? line
            : longest,
        ""
      );
  }

  function getMaximumRenderedNameFontSize(
    value: string
  ) {
    const length =
      getLongestLabelLine(
        value
      ).length;

    if (length > 32) return 30;
    if (length > 27) return 34;
    if (length > 22) return 40;
    if (length > 18) return 46;
    if (length > 14) return 54;
    if (length > 10) return 62;

    return Number.POSITIVE_INFINITY;
  }

  function clampNameFontSizeToRenderer(
    labelText: string,
    requestedSize: number
  ) {
    const maximum =
      getMaximumRenderedNameFontSize(
        labelText
      );

    return Number.isFinite(maximum)
      ? Math.min(
          requestedSize,
          maximum
        )
      : requestedSize;
  }

  function measureLabelWidth(
    value: string,
    fontSize: number
  ) {
    if (
      typeof document === "undefined"
    ) {
      return value.length * fontSize * 0.62;
    }

    const canvas =
      document.createElement("canvas");

    const context =
      canvas.getContext("2d");

    if (!context) {
      return value.length * fontSize * 0.62;
    }

    context.font =
      `900 ${fontSize}px Arial, Helvetica, sans-serif`;

    return context.measureText(value).width;
  }

  function runFitCheck(
    product: Product,
    template: Template,
    layout: ProductLayout
  ) {
    const reasons: string[] = [];

    const label =
      splitProductLabel(
        product.name
      );

    const displayName =
      layout.labelText ||
      label.name;

    const displayLines =
      displayName
        .replace(/\r\n/g, "\n")
        .split("\n");

    /*
     * Conservative safe zones. These scale with every template's
     * actual canvas instead of assuming all masters are identical.
     * The real rendered preview is still shown for human approval.
     */
    const nameSafeWidth =
      template.canvas_width * 0.78;

    const strengthSafeWidth =
      template.canvas_width * 0.68;

    const longestDisplayLine =
      displayLines.reduce(
        (longest, line) =>
          line.length >
          longest.length
            ? line
            : longest,
        ""
      );

    const nameWidth =
      measureLabelWidth(
        longestDisplayLine,
        layout.nameFontSize
      );

    if (
      nameWidth >
      nameSafeWidth
    ) {
      reasons.push(
        `Longest product-name line is ${Math.round(nameWidth)}px wide at the selected font size; conservative safe width is ${Math.round(nameSafeWidth)}px.`
      );
    }

    if (label.strength) {
      const strengthWidth =
        measureLabelWidth(
          label.strength,
          layout.strengthFontSize
        );

      if (
        strengthWidth >
        strengthSafeWidth
      ) {
        reasons.push(
          `Strength is ${Math.round(strengthWidth)}px wide; conservative safe width is ${Math.round(strengthSafeWidth)}px.`
        );
      }
    }

    const minTop =
      template.canvas_height * 0.04;

    const maxBottom =
      template.canvas_height * 0.96;

    if (
      layout.nameY < minTop ||
      layout.nameY > maxBottom
    ) {
      reasons.push(
        "Product-name Y position is outside the conservative template safe area."
      );
    }

    if (
      layout.strengthY < minTop ||
      layout.strengthY > maxBottom
    ) {
      reasons.push(
        "Strength Y position is outside the conservative template safe area."
      );
    }

    if (
      layout.researchTextY < minTop ||
      layout.researchTextY > maxBottom
    ) {
      reasons.push(
        "Research-text Y position is outside the conservative template safe area."
      );
    }

    if (
      layout.strengthY - layout.nameY <
      Math.max(
        layout.nameFontSize * 0.72,
        26
      )
    ) {
      reasons.push(
        "Product name and strength are close enough that they may overlap."
      );
    }

    if (
      layout.researchTextY - layout.strengthY <
      Math.max(
        layout.strengthFontSize * 0.72,
        22
      )
    ) {
      reasons.push(
        "Strength and research text are close enough that they may overlap."
      );
    }

    return {
      fitStatus:
        reasons.length === 0
          ? "pass" as const
          : "review" as const,
      reasons,
    };
  }

  async function requestPreviewBlob(
    args: {
      headers: Record<string, string>;
      productId: string;
      templateId: string;
      layout: ProductLayout;
      labelText: string;
      letteringColor: string;
    }
  ) {
    const response =
      await fetch(
        "/api/admin/product-image-engine/preview",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            ...args.headers,
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              productId:
                args.productId,
              templateId:
                args.templateId,
              layout: args.layout,
              labelText:
                args.labelText,
              paletteKey:
                "custom",
              customColor:
                args.letteringColor,
            }),
        }
      );

    if (!response.ok) {
      throw new Error(
        await response.text()
      );
    }

    if (
      response.headers.get(
        "X-Product-Image-Mode"
      ) !==
      "preview-only"
    ) {
      throw new Error(
        "Preview safety check failed. No live image changes were allowed."
      );
    }

    return response.blob();
  }

  async function previewAllProducts() {
    if (
      !selectedTemplateId ||
      products.length === 0
    ) {
      setStatus(
        "Choose a template with products first."
      );
      return;
    }

    const template =
      templates.find(
        (item) =>
          item.id ===
          selectedTemplateId
      );

    if (!template) {
      setStatus(
        "The selected template could not be loaded."
      );
      return;
    }

    bulkPreviews.forEach(
      (item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(
            item.previewUrl
          );
        }
      }
    );

    setBulkPreviews([]);
    setBulkPreviewing(true);
    setBusy(true);

    try {
      const headers =
        await getAuthHeaders();

      const nextItems:
        (
          | BulkPreviewItem
          | undefined
        )[] = new Array(
          products.length
        );

      let completed = 0;
      let cursor = 0;

      async function processProduct(
        product: Product,
        index: number
      ) {
        const restoredBulkItem =
          restoredBulkStateRef.current.get(
            product.id
          );

        const baseProductLayout:
          ProductLayout =
            restoredBulkItem?.layout || {
              labelText:
                splitProductLabel(
                  product.name
                ).name,
              nameY,
              strengthY,
              researchTextY:
                researchY,
              nameFontSize,
              strengthFontSize,
              researchFontSize,
            };

        const productLayout:
          ProductLayout = {
            ...baseProductLayout,
            nameFontSize:
              clampNameFontSizeToRenderer(
                baseProductLayout.labelText,
                baseProductLayout.nameFontSize
              ),
          };

        const letteringColor =
          getValidHexColor(
            restoredBulkItem?.letteringColor
          ) ||
          getManualOrProductColor(product);

        const blob =
          await requestPreviewBlob({
            headers,
            productId:
              product.id,
            templateId:
              selectedTemplateId,
            layout:
              productLayout,
            labelText:
              productLayout.labelText,
            letteringColor,
          });

        const fit =
          runFitCheck(
            product,
            template,
            productLayout
          );

        nextItems[index] = {
          productId:
            product.id,
          productName:
            product.name,
          previewUrl:
            URL.createObjectURL(
              blob
            ),
          fitStatus:
            fit.fitStatus,
          reasons:
            fit.reasons,
          approved:
            restoredBulkItem?.approved ??
            (fit.fitStatus === "pass"),
          layout:
            productLayout,
          letteringColor,
        };

        completed += 1;

        setStatus(
          `Safe-previewing ${completed} of ${products.length}: ${product.name}`
        );

        setBulkPreviews(
          nextItems.filter(
            Boolean
          ) as BulkPreviewItem[]
        );
      }

      async function worker() {
        while (
          cursor <
          products.length
        ) {
          const index =
            cursor;
          cursor += 1;

          const product =
            products[index];

          await processProduct(
            product,
            index
          );
        }
      }

      await Promise.all(
        Array.from(
          {
            length:
              Math.min(
                BULK_PREVIEW_CONCURRENCY,
                products.length
              ),
          },
          () => worker()
        )
      );

      const finalItems =
        nextItems.filter(
          Boolean
        ) as BulkPreviewItem[];

      const passing =
        finalItems.filter(
          (item) =>
            item.fitStatus ===
            "pass"
        ).length;

      const review =
        finalItems.length - passing;

      setBulkPreviews(
        finalItems
      );

      setStatus(
        `Bulk preflight complete: ${passing} passed automatically, ${review} need visual review. Preview concurrency: ${Math.min(
          BULK_PREVIEW_CONCURRENCY,
          products.length
        )} at a time. Nothing was published.`
      );
    } catch (error) {
      console.error(error);

      setStatus(
        error instanceof Error
          ? error.message
          : "Bulk preview failed."
      );
    } finally {
      setBulkPreviewing(false);
      setBusy(false);
    }
  }

  function setBulkApproval(
    productId: string,
    approved: boolean
  ) {
    setBulkPreviews(
      (current) =>
        current.map(
          (item) =>
            item.productId ===
            productId
              ? {
                  ...item,
                  approved,
                }
              : item
        )
    );
  }

  function updatePreviewLabelText(
    productId: string,
    value: string
  ) {
    setBulkPreviews(
      (current) =>
        current.map(
          (item) =>
            item.productId ===
            productId
              ? {
                  ...item,
                  approved: false,
                  layout: {
                    ...item.layout,
                    labelText:
                      value,
                    nameFontSize:
                      clampNameFontSizeToRenderer(
                        value,
                        item.layout.nameFontSize
                      ),
                  },
                }
              : item
        )
    );
  }

  function updatePreviewLetteringColor(
    productId: string,
    value: string
  ) {
    setBulkPreviews((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              approved: false,
              letteringColor:
                /^#[0-9a-fA-F]{6}$/.test(value)
                  ? value
                  : item.letteringColor,
            }
          : item
      )
    );
  }

  function updatePreviewLayout(
    productId: string,
    field: keyof ProductLayout,
    value: number
  ) {
    setBulkPreviews((current) =>
      current.map((item) => {
        if (
          item.productId !==
          productId
        ) {
          return item;
        }

        const nextValue =
          field === "nameFontSize"
            ? clampNameFontSizeToRenderer(
                item.layout.labelText,
                value
              )
            : value;

        return {
          ...item,
          approved: false,
          layout: {
            ...item.layout,
            [field]: nextValue,
          },
        };
      })
    );
  }

  async function rePreviewBulkProduct(
    productId: string,
    options?: {
      silent?: boolean;
      requestId?: number;
    }
  ) {
    const item =
      bulkPreviews.find(
        (entry) =>
          entry.productId ===
          productId
      );

    const product =
      products.find(
        (entry) =>
          entry.id ===
          productId
      );

    const template =
      templates.find(
        (entry) =>
          entry.id ===
          selectedTemplateId
      );

    if (
      !item ||
      !product ||
      !template
    ) {
      setStatus(
        "Unable to load this vial for editing."
      );
      return;
    }

    const requestId =
      options?.requestId ??
      livePreviewSequenceRef.current + 1;

    livePreviewSequenceRef.current =
      Math.max(
        livePreviewSequenceRef.current,
        requestId
      );

    latestLivePreviewByProductRef.current[
      productId
    ] = requestId;

    try {
      setBusy(true);

      if (!options?.silent) {
        setStatus(
          `Re-previewing ${product.name}...`
        );
      }

      const blob =
        await requestPreviewBlob({
          headers:
            await getAuthHeaders(),
          productId,
          templateId:
            selectedTemplateId,
          layout:
            item.layout,
          labelText:
            item.layout.labelText,
          letteringColor:
            item.letteringColor ||
            getManualOrProductColor(
              product
            ),
        });

      if (
        latestLivePreviewByProductRef
          .current[productId] !==
        requestId
      ) {
        return;
      }

      const nextUrl =
        URL.createObjectURL(
          blob
        );

      const fit =
        runFitCheck(
          product,
          template,
          item.layout
        );

      setBulkPreviews(
        (current) =>
          current.map(
            (entry) => {
              if (
                entry.productId !==
                productId
              ) {
                return entry;
              }

              if (
                entry.previewUrl
              ) {
                URL.revokeObjectURL(
                  entry.previewUrl
                );
              }

              return {
                ...entry,
                previewUrl:
                  nextUrl,
                fitStatus:
                  fit.fitStatus,
                reasons:
                  fit.reasons,
                approved:
                  false,
              };
            }
          )
      );

      if (!options?.silent) {
        setStatus(
          `${product.name} preview updated. Review it, then approve it when ready.`
        );
      }
    } catch (error) {
      console.error(error);

      if (
        latestLivePreviewByProductRef
          .current[productId] !==
        requestId
      ) {
        return;
      }

      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to refresh this vial preview."
      );
    } finally {
      if (
        latestLivePreviewByProductRef
          .current[productId] ===
        requestId
      ) {
        setBusy(false);
      }
    }
  }

  const editingPreviewRenderSignature =
    useMemo(() => {
      if (!editingPreviewId) {
        return "";
      }

      const item =
        bulkPreviews.find(
          (entry) =>
            entry.productId ===
            editingPreviewId
        );

      if (!item) {
        return "";
      }

      return JSON.stringify({
        labelText:
          item.layout.labelText,
        nameY:
          item.layout.nameY,
        strengthY:
          item.layout.strengthY,
        researchTextY:
          item.layout.researchTextY,
        nameFontSize:
          item.layout.nameFontSize,
        strengthFontSize:
          item.layout.strengthFontSize,
        researchFontSize:
          item.layout.researchFontSize,
        letteringColor:
          item.letteringColor,
      });
    }, [
      editingPreviewId,
      bulkPreviews,
    ]);

  useEffect(() => {
    if (
      !editingPreviewId ||
      !editingPreviewRenderSignature
    ) {
      return;
    }

    const requestId =
      livePreviewSequenceRef.current + 1;

    const timer =
      window.setTimeout(
        () => {
          void rePreviewBulkProduct(
            editingPreviewId,
            {
              silent: true,
              requestId,
            }
          );
        },
        550
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    editingPreviewId,
    editingPreviewRenderSignature,
  ]);

  function approveAllPassing() {
    setBulkPreviews(
      (current) =>
        current.map((item) =>
          item.fitStatus === "pass"
            ? {
                ...item,
                approved: true,
              }
            : item
        )
    );
  }

  function setAllBulkApproval(approved: boolean) {
    setBulkPreviews(
      (current) =>
        current.map((item) => ({
          ...item,
          approved,
        }))
    );
  }

  function clearBulkApprovals() {
    setBulkPreviews(
      (current) =>
        current.map(
          (item) => ({
            ...item,
            approved: false,
          })
        )
    );
  }

  async function regenerateApproved() {
    const approvedIds =
      bulkPreviews
        .filter(
          (item) =>
            item.approved
        )
        .map(
          (item) =>
            item.productId
        );

    if (
      approvedIds.length === 0
    ) {
      setStatus(
        "Approve at least one preview before publishing."
      );
      return;
    }

    const approvedItems = bulkPreviews.filter((item) =>
      approvedIds.includes(item.productId)
    );

    const confirmed = window.confirm(
      `Regenerate and replace ${approvedItems.length} approved live image${approvedItems.length === 1 ? "" : "s"}?`
    );

    if (!confirmed) return;

    try {
      setBusy(true);

      for (let index = 0; index < approvedItems.length; index += 1) {
        const item = approvedItems[index];

        setStatus(
          `Publishing approved image ${index + 1} of ${approvedItems.length}: ${item.productName}`
        );

        await generateImages(
          [item.productId],
          item.layout,
          true,
          item.letteringColor
        );
      }

      setStatus(
        `${approvedItems.length} approved live image${approvedItems.length === 1 ? "" : "s"} updated.`
      );

      await loadEngineData();
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error
          ? error.message
          : "Approved image generation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateImages(
    productIds:
      string[],
    layoutOverride?: ProductLayout,
    skipConfirmation = false,
    letteringColorOverride?: string
  ) {
    if (
      !selectedTemplateId
    ) {
      setStatus(
        "Choose a template first."
      );

      return;
    }

    const scope =
      productIds.length > 0
        ? "this product"
        : `ALL ${family.replace(
            "-",
            " "
          )} products`;

    if (!skipConfirmation) {
      const confirmed =
        window.confirm(
          `This WILL replace the live website image for ${scope}. Continue?`
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setBusy(true);

      setStatus(
        "Generating product images..."
      );

      const generationTargetProduct =
        productIds.length === 1
          ? products.find(
              (product) =>
                product.id ===
                productIds[0]
            )
          : selectedProduct;

      const response =
        await fetch(
          "/api/admin/product-image-engine/generate",
          {
            method:
              "POST",

            headers: {
              ...(
                await getAuthHeaders()
              ),

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                commit:
                  true,

                family,

                templateId:
                  selectedTemplateId,

                productIds,

                layout:
                  layoutOverride || {
                    labelText:
                      splitProductLabel(
                        selectedProduct?.name ||
                        ""
                      ).name,
                    nameY,

                    strengthY,

                    researchTextY:
                      researchY,

                    nameFontSize,

                    strengthFontSize,

                    researchFontSize,
                  },

                labelText:
                  layoutOverride?.labelText ||
                  null,

                paletteKey:
                  "custom",
                customColor:
                  getValidHexColor(
                    letteringColorOverride
                  ) ||
                  getManualOrProductColor(
                    generationTargetProduct
                  ),
              }),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          json.error ||
            "Image generation failed."
        );
      }

      if (!skipConfirmation) {
        setStatus(
          `${json.count} LIVE product image${
            json.count === 1
              ? ""
              : "s"
          } updated on the website.`
        );

        await loadEngineData();
      }
    } catch (
      error
    ) {
      console.error(
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Image generation failed."
      );
    } finally {
      if (!skipConfirmation) {
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    if (
      !restoreBulkRequested ||
      busy ||
      bulkPreviewing ||
      !selectedTemplateId ||
      products.length === 0
    ) {
      return;
    }

    setRestoreBulkRequested(false);
    void previewAllProducts();
  }, [
    restoreBulkRequested,
    selectedTemplateId,
    products.length,
  ]);

  const activeTemplate =
    templates.find(
      (
        template
      ) =>
        template.id ===
        selectedTemplateId
    );

  const selectedProduct =
    products.find(
      (
        product
      ) =>
        product.id ===
        selectedProductId
    );

  const approvedCount =
    bulkPreviews.filter(
      (item) => item.approved
    ).length;

  const hasApprovedItems =
    approvedCount > 0;

  const selectedProductApproved =
    bulkPreviews.some(
      (item) =>
        item.productId === selectedProductId &&
        item.approved
    );

  return (
    <main style={page}>
      <div style={shell}>
        <header style={header}>
          <div style={headerTopRow}>
            <div>
              <span style={eyebrow}>
                PUGPEP ADMIN
              </span>

              <h1 style={title}>
                Product Image Engine
              </h1>

              <p style={subtitle}>
                Build consistent PugPep product
                artwork using master templates,
                adjustable typography, and
                cyberpunk neon palettes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.history.back();
                }
              }}
              style={backButton}
            >
              ← BACK
            </button>
          </div>
        </header>

        <div className="image-engine-top-grid" style={topStepGrid}>
            <section style={panel}>
          <div style={sectionHeader}>
            <div>
              <span style={stepLabel}>
                STEP 01
              </span>

              <h2 style={panelTitle}>
                AI Master Template
              </h2>
            </div>
          </div>

          <form
            onSubmit={
              uploadTemplate
            }
            style={masterTemplateFormGrid}
          >
            <label style={label}>
              Template name

              <input
                value={
                  templateName
                }
                onChange={
                  (
                    event
                  ) =>
                    setTemplateName(
                      event.target.value
                    )
                }
                style={input}
              />
            </label>

            <label style={label}>
              AI-generated template image

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  (
                    event
                  ) =>
                    setTemplateFile(
                      event.target.files?.[0] ||
                        null
                    )
                }
                style={fileInput}
              />
            </label>

            <label style={label}>
              Optional vial color mask

              <input
                type="file"
                accept="image/png"
                onChange={
                  (
                    event
                  ) =>
                    setMaskFile(
                      event.target.files?.[0] ||
                        null
                    )
                }
                style={fileInput}
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              style={primaryButton}
            >
              UPLOAD & ACTIVATE TEMPLATE
            </button>
          </form>
        </section>

        </div>

        <section style={panel}>
          <div style={previewHeader}>
            <div>
              <span style={stepLabel}>
                STEP 02
              </span>

              <h2 style={panelTitle}>
                Preview
              </h2>
            </div>

            <div style={previewFamilyInline}>
              <span style={previewFamilyLabel}>
                PRODUCT FAMILY
              </span>

          <div style={familyRow}>
            {(
              [
                "peptides",
                "sprays",
                "lab-materials",
              ] as Family[]
            ).map(
              (
                item
              ) => {
                const active =
                  family ===
                  item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={
                      () =>
                        setFamily(
                          item
                        )
                    }
                    style={{
                      ...pill,
                      ...(active
                        ? pillActive
                        : {}),
                    }}
                  >
                    {
                      item
                        .replace(
                          "-",
                          " "
                        )
                        .toUpperCase()
                    }
                  </button>
                );
              }
            )}
          </div>

            </div>
          </div>

          <div style={previewSetupInlinePanel}>
            <div style={previewSetupFieldGroup}>
              <span style={previewSetupLabel}>
                TEMPLATE
              </span>

              <select
                value={selectedTemplateId}
                onChange={(event) =>
                  setSelectedTemplateId(event.target.value)
                }
                style={input}
              >
                <option value="">
                  Choose template
                </option>

                {templates.map((template) => (
                  <option
                    key={template.id}
                    value={template.id}
                  >
                    {template.name} • v{template.version}
                    {template.is_active ? " • ACTIVE" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={previewSetupFieldGroup}>
              <span style={previewSetupLabel}>
                PRODUCT
              </span>

              <select
                value={selectedProductId}
                onChange={(event) =>
                  setSelectedProductId(event.target.value)
                }
                style={input}
              >
                <option value="">
                  Choose product
                </option>

                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={previewSetupColorGroup}>
              <span style={previewSetupLabel}>
                PRODUCT COLOR
              </span>

              <div className="image-engine-color-controls" style={colorControlsInline}>
                <input
                  type="color"
                  value={customPickerColor}
                  onChange={(event) => {
                    useCustomColor(event.target.value);
                  }}
                  style={colorWheelCompact}
                  aria-label="Choose product accent color"
                />

                <input
                  value={customPickerColor}
                  onChange={(event) => {
                    useCustomColor(event.target.value);
                  }}
                  onBlur={() => {
                    if (!/^#[0-9a-fA-F]{6}$/.test(customPickerColor)) {
                      useCustomColor("#ff45d8");
                    }
                  }}
                  placeholder="#ff45d8"
                  style={colorHexInputInline}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={
              busy ||
              !selectedTemplateId ||
              !selectedProductId
            }
            onClick={
              () =>
                void generatePreview()
            }
            style={secondaryButton}
          >
            GENERATE PREVIEW
          </button>

          <div style={previewGrid}>
            <div style={previewCard}>
              <span style={previewLabel}>
                MASTER TEMPLATE
              </span>

              {
                activeTemplate?.template_url
                  ? (
                    <img
                      src={
                        activeTemplate.template_url
                      }
                      alt="PugPep AI master template"
                      style={previewImage}
                    />
                  )
                  : (
                    <div style={emptyPreview}>
                      No template selected
                    </div>
                  )
              }
            </div>

            <div style={previewCard}>
              <span style={previewLabel}>
                GENERATED PREVIEW
              </span>

              {
                previewUrl
                  ? (
                    <img
                      src={
                        previewUrl
                      }
                      alt="Generated PugPep product preview"
                      style={previewImage}
                    />
                  )
                  : (
                    <div style={emptyPreview}>
                      Generate a preview
                    </div>
                  )
              }
            </div>

            <div style={textLayoutBelowPreviews}>
              <div style={textLayoutSideHeader}>
                <div>
                  <span style={previewSetupLabel}>
                    TEXT LAYOUT
                  </span>

                  <p style={textLayoutSideHelp}>
                    Adjust the label positioning and font sizes while viewing
                    the Master Template and Generated Preview side by side above.
                  </p>
                </div>

                <div style={layoutActionButtons}>
                  <button
                    type="button"
                    onClick={
                      () =>
                        void generatePreview()
                    }
                    disabled={
                      busy ||
                      !selectedTemplateId ||
                      !selectedProductId
                    }
                    style={refreshPreviewButton}
                  >
                    REFRESH PREVIEW
                  </button>

                  {!renamingSession ? (
                    <button
                      type="button"
                      onClick={() => {
                        const selected =
                          savedSessions.find(
                            (session) =>
                              session.id ===
                              selectedSavedSessionId
                          );

                        setSessionTitle(
                          selected?.label || ""
                        );

                        setRenamingSession(
                          true
                        );
                      }}
                      disabled={
                        busy ||
                        bulkPreviewing ||
                        !selectedSavedSessionId
                      }
                      style={sessionRenameButton}
                    >
                      RENAME
                    </button>
                  ) : (
                    <div style={sessionRenameEditor}>
                      <input
                        value={sessionTitle}
                        onChange={(event) =>
                          setSessionTitle(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            event.preventDefault();
                            renameSelectedSession();
                          }

                          if (
                            event.key ===
                            "Escape"
                          ) {
                            setRenamingSession(
                              false
                            );
                          }
                        }}
                        autoFocus
                        placeholder="Session title"
                        style={sessionTitleInput}
                        aria-label="Saved session title"
                      />

                      <button
                        type="button"
                        onClick={
                          renameSelectedSession
                        }
                        disabled={
                          busy ||
                          bulkPreviewing ||
                          !sessionTitle.trim()
                        }
                        style={sessionRenameSaveButton}
                      >
                        SAVE
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      deleteSelectedSession
                    }
                    disabled={
                      busy ||
                      bulkPreviewing ||
                      !selectedSavedSessionId
                    }
                    style={sessionDeleteButton}
                  >
                    DELETE
                  </button>

                  <select
                    value={selectedSavedSessionId}
                    onChange={(event) => {
                      const nextId =
                        event.target.value;

                      setSelectedSavedSessionId(
                        nextId
                      );

                      setRenamingSession(
                        false
                      );

                      const selected =
                        savedSessions.find(
                          (session) =>
                            session.id ===
                            nextId
                        );

                      setSessionTitle(
                        selected?.label || ""
                      );
                    }}
                    disabled={
                      busy ||
                      bulkPreviewing ||
                      savedSessions.length === 0
                    }
                    style={sessionSelect}
                    aria-label="Choose a saved Product Image Engine session"
                  >
                    {savedSessions.length === 0 ? (
                      <option value="">
                        NO SAVED SESSIONS
                      </option>
                    ) : (
                      savedSessions.map(
                        (session) => (
                          <option
                            key={session.id}
                            value={session.id}
                          >
                            {session.label}
                          </option>
                        )
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={restoreSession}
                    disabled={
                      busy ||
                      bulkPreviewing
                    }
                    style={sessionRestoreButton}
                  >
                    LOAD SELECTED SESSION
                  </button>

                  <button
                    type="button"
                    onClick={saveSession}
                    disabled={busy || bulkPreviewing}
                    style={sessionSaveButton}
                  >
                    SAVE SESSION
                  </button>

                  <button
                    type="button"
                    onClick={
                      () =>
                        void saveLayout()
                    }
                    disabled={
                      busy ||
                      !selectedTemplateId
                    }
                    style={saveButton}
                  >
                    SAVE LAYOUT
                  </button>
                </div>
              </div>

              <div style={editorGrid}>
                <TextControl
                  title="Product Name"
                  y={nameY}
                  setY={setNameY}
                  fontSize={
                    nameFontSize
                  }
                  setFontSize={
                    setNameFontSize
                  }
                />

                <TextControl
                  title="Strength"
                  y={
                    strengthY
                  }
                  setY={
                    setStrengthY
                  }
                  fontSize={
                    strengthFontSize
                  }
                  setFontSize={
                    setStrengthFontSize
                  }
                />

                <TextControl
                  title="Research Use Only"
                  y={
                    researchY
                  }
                  setY={
                    setResearchY
                  }
                  fontSize={
                    researchFontSize
                  }
                  setFontSize={
                    setResearchFontSize
                  }
                />
              </div>
            </div>
          </div>

        </section>

        <section style={panel}>
          <div style={sectionHeader}>
            <div>
              <span style={stepLabel}>
                STEP 03
              </span>

              <h2 style={panelTitle}>
                Bulk Safety Check & Publish
              </h2>
            </div>
          </div>

          <p style={helperText}>
            Preview every product, approve the images that look correct, then publish directly
            from the same action row. Nothing is published until you use one of the regenerate buttons.
          </p>

          <div style={combinedActionRow}>
            <button
              type="button"
              disabled={
                busy ||
                bulkPreviewing
              }
              onClick={() =>
                void previewAllProducts()
              }
              style={secondaryButton}
            >
              {bulkPreviewing
                ? "PREVIEWING ALL..."
                : `PREVIEW ALL ${family
                    .replace("-", " ")
                    .toUpperCase()}`}
            </button>

            {bulkPreviews.length > 0 && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={approveAllPassing}
                  title="Checks every AUTO PASS product. Products marked REVIEW are left exactly as you set them."
                  style={{
                    ...miniActionButton,
                    ...(
                      bulkPreviews.some((item) => item.fitStatus === "pass") &&
                      bulkPreviews
                        .filter((item) => item.fitStatus === "pass")
                        .every((item) => item.approved)
                        ? miniActionButtonActive
                        : {}
                    ),
                  }}
                >
                  APPROVE ALL PASSING
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={clearBulkApprovals}
                  style={{
                    ...miniActionButton,
                    ...(hasApprovedItems
                      ? clearApprovalsActiveButton
                      : {}),
                  }}
                >
                  CLEAR APPROVALS
                </button>
              </>
            )}

            <button
              type="button"
              disabled={
                busy ||
                !selectedProductId ||
                !selectedTemplateId ||
                !selectedProductApproved
              }
              onClick={() => {
                const approvedItem = bulkPreviews.find(
                  (item) =>
                    item.productId === selectedProductId &&
                    item.approved
                );

                if (approvedItem) {
                  void generateImages(
                    [selectedProductId],
                    approvedItem.layout
                  );
                }
              }}
              title={
                selectedProductApproved
                  ? "Regenerate the approved selected product"
                  : "Preview and approve this product first"
              }
              style={{
                ...secondaryButton,
                ...(selectedProductApproved
                  ? regenerateProductActiveButton
                  : {}),
                opacity:
                  selectedProductApproved
                    ? 1
                    : 0.45,
              }}
            >
              REGENERATE THIS PRODUCT
            </button>

            <button
              type="button"
              disabled={
                busy ||
                !selectedTemplateId ||
                !hasApprovedItems
              }
              onClick={() =>
                void regenerateApproved()
              }
              style={{
                ...dangerButton,
                ...(hasApprovedItems
                  ? regenerateApprovedActiveButton
                  : {}),
              }}
            >
              REGENERATE APPROVED ({
                approvedCount
              })
            </button>

            <button
              type="button"
              disabled={
                busy ||
                !selectedTemplateId
              }
              onClick={() =>
                void saveLayout()
              }
              style={stepThreeSaveLayoutButton}
            >
              SAVE LAYOUT
            </button>

            {bulkPreviews.length > 0 && (
              <label style={selectAllInlineLabelShifted}>
                <input
                  type="checkbox"
                  checked={
                    bulkPreviews.length > 0 &&
                    bulkPreviews.every((item) => item.approved)
                  }
                  ref={(input) => {
                    if (input) {
                      input.indeterminate =
                        approvedCount > 0 &&
                        approvedCount < bulkPreviews.length;
                    }
                  }}
                  onChange={(event) =>
                    setAllBulkApproval(event.target.checked)
                  }
                />
                <span>SELECT ALL</span>
              </label>
            )}
          </div>

          {status && (
            <div style={bulkInlineStatus}>
              {bulkPreviewing || busy ? "⚡ " : "● "}
              {status}
            </div>
          )}

          {bulkPreviews.length > 0 && (
            <>
              <div style={bulkSummaryBar}>
                <span>
                  <strong style={{ color: "#00ff99" }}>
                    {bulkPreviews.filter((item) => item.fitStatus === "pass").length}
                  </strong>{" "}
                  automatic pass
                </span>

                <span>
                  <strong style={{ color: "#ffcc00" }}>
                    {bulkPreviews.filter((item) => item.fitStatus === "review").length}
                  </strong>{" "}
                  need review
                </span>

                <span>
                  <strong style={{ color: "#ff75df" }}>
                    {bulkPreviews.filter((item) => item.approved).length}
                  </strong>{" "}
                  approved to publish
                </span>
              </div>

              <div style={bulkPreviewGrid}>
                {bulkPreviews.map((item) => (
                  <article
                    key={item.productId}
                    onClick={() => setEditingPreviewId(item.productId)}
                    style={{
                      ...bulkPreviewCard,
                      cursor: "pointer",
                      borderColor:
                        item.fitStatus === "pass"
                          ? "rgba(0,255,153,.38)"
                          : "rgba(255,204,0,.48)",
                    }}
                  >
                    <div style={bulkCardHeader}>
                      <div>
                        <span
                          style={{
                            ...fitBadge,
                            color:
                              item.fitStatus === "pass"
                                ? "#00ff99"
                                : "#ffcc00",
                            borderColor:
                              item.fitStatus === "pass"
                                ? "rgba(0,255,153,.42)"
                                : "rgba(255,204,0,.42)",
                          }}
                        >
                          {item.fitStatus === "pass"
                            ? "✓ AUTO PASS"
                            : "⚠ REVIEW"}
                        </span>

                        <h3 style={bulkProductTitle}>
                          {item.productName}
                        </h3>
                      </div>

                      <label
                        style={approvalToggle}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={item.approved}
                          onChange={(event) =>
                            setBulkApproval(
                              item.productId,
                              event.target.checked
                            )
                          }
                        />
                        APPROVED
                      </label>
                    </div>

                    <img
                      src={item.previewUrl}
                      alt={`${item.productName} safe preview`}
                      style={bulkPreviewImage}
                    />

                    <div style={clickToEditHint}>
                      CLICK VIAL TO OPEN FONT EDITOR
                    </div>

                    {item.reasons.length > 0 ? (
                      <div style={reviewReasonBox}>
                        <strong>Check visually before approving:</strong>
                        {item.reasons.map((reason) => (
                          <span key={reason}>• {reason}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={passReasonBox}>
                        Automatic width and spacing checks passed. Visually confirm the
                        rendered preview before bulk publishing.
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {editingPreviewId && (() => {
                const editingItem = bulkPreviews.find(
                  (item) => item.productId === editingPreviewId
                );

                if (!editingItem) return null;

                return (
                  <div
                    style={letteringEditorOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Edit ${editingItem.productName} lettering`}
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setEditingPreviewId("");
                      }
                    }}
                  >
                    <div
                      style={letteringEditorModal}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <div style={letteringEditorHeader}>
                        <div>
                          <span style={stepLabel}>
                            INDIVIDUAL VIAL LETTERING EDITOR
                          </span>
                          <h3 style={letteringEditorTitle}>
                            {editingItem.productName}
                          </h3>
                          <p style={letteringEditorSubtext}>
                            Adjust only this vial. Changes here do not alter the
                            default layout for the other peptide previews.
                          </p>
                        </div>


                      </div>

                      <div className="lettering-editor-grid" style={letteringEditorGrid}>
                        <div style={editorImageCard}>
                          <div style={editorImageLabel}>
                            CURRENT PREVIEW
                          </div>

                          <img
                            src={editingItem.previewUrl}
                            alt={`${editingItem.productName} lettering editor preview`}
                            style={editorLargeImage}
                          />

                          <div style={editorPreviewNote}>
                            Changes render automatically after a short pause.
                            Review the updated vial, then approve it when ready.
                          </div>
                        </div>

                        <div style={letteringControlsPanel}>
                          <label style={{ ...label, gridColumn: "1 / -1" }}>
                            <span style={editorFieldLabel}>
                              PRODUCT NAME ON LABEL
                            </span>

                            <textarea
                              value={editingItem.layout.labelText}
                              onChange={(event) =>
                                updatePreviewLabelText(
                                  editingItem.productId,
                                  event.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.altKey &&
                                  event.key === "Enter"
                                ) {
                                  event.preventDefault();

                                  const target =
                                    event.currentTarget;

                                  const selectionStart =
                                    target.selectionStart;

                                  const selectionEnd =
                                    target.selectionEnd;

                                  const next =
                                    editingItem.layout.labelText.slice(
                                      0,
                                      selectionStart
                                    ) +
                                    "\n" +
                                    editingItem.layout.labelText.slice(
                                      selectionEnd
                                    );

                                  updatePreviewLabelText(
                                    editingItem.productId,
                                    next
                                  );

                                  requestAnimationFrame(
                                    () => {
                                      target.selectionStart =
                                        selectionStart + 1;
                                      target.selectionEnd =
                                        selectionStart + 1;
                                    }
                                  );
                                }
                              }}
                              rows={3}
                              style={labelTextArea}
                            />

                            <span style={labelWrapHint}>
                              Product names do not wrap automatically. Reduce the
                              font size or press Alt+Enter to place a manual line
                              break exactly where you want it.
                            </span>
                          </label>

                          <label
                            style={{
                              ...label,
                              gridColumn: "1 / -1",
                            }}
                          >
                            <span style={editorFieldLabel}>
                              LETTERING COLOR
                            </span>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "52px minmax(0, 1fr)",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="color"
                                value={
                                  editingItem.letteringColor ||
                                  "#ffffff"
                                }
                                onChange={(event) =>
                                  updatePreviewLetteringColor(
                                    editingItem.productId,
                                    event.target.value
                                  )
                                }
                                style={{
                                  width: 52,
                                  height: 42,
                                  padding: 3,
                                  border:
                                    "1px solid rgba(255,255,255,.18)",
                                  borderRadius: 9,
                                  background: "#090a0d",
                                  cursor: "pointer",
                                }}
                                aria-label="Choose this vial lettering color"
                              />

                              <input
                                value={
                                  editingItem.letteringColor ||
                                  "#ffffff"
                                }
                                onChange={(event) => {
                                  const value =
                                    event.target.value;

                                  setBulkPreviews(
                                    (current) =>
                                      current.map(
                                        (item) =>
                                          item.productId ===
                                          editingItem.productId
                                            ? {
                                                ...item,
                                                approved:
                                                  false,
                                                letteringColor:
                                                  value,
                                              }
                                            : item
                                      )
                                  );
                                }}
                                onBlur={() => {
                                  if (
                                    !/^#[0-9a-fA-F]{6}$/.test(
                                      editingItem.letteringColor
                                    )
                                  ) {
                                    updatePreviewLetteringColor(
                                      editingItem.productId,
                                      getManualOrProductColor(
                                        products.find(
                                          (product) =>
                                            product.id ===
                                            editingItem.productId
                                        )
                                      )
                                    );
                                  }
                                }}
                                placeholder="#ffffff"
                                style={input}
                              />
                            </div>

                            <span style={labelWrapHint}>
                              This starts with the color used in the generated
                              preview. Change it here only when you want this
                              individual vial to use a different lettering color.
                            </span>
                          </label>

                          <EditorNumberControl
                            label={`Product Name Font${
                              Number.isFinite(
                                getMaximumRenderedNameFontSize(
                                  editingItem.layout.labelText
                                )
                              )
                                ? ` • MAX ${getMaximumRenderedNameFontSize(
                                    editingItem.layout.labelText
                                  )}`
                                : ""
                            }`}
                            value={editingItem.layout.nameFontSize}
                            onChange={(value) =>
                              updatePreviewLayout(
                                editingItem.productId,
                                "nameFontSize",
                                value
                              )
                            }
                            min={8}
                            step={1}
                          />

                          <EditorNumberControl
                            label="Product Name Y"
                            value={editingItem.layout.nameY}
                            onChange={(value) =>
                              updatePreviewLayout(
                                editingItem.productId,
                                "nameY",
                                value
                              )
                            }
                            min={0}
                            step={2}
                          />

                          <EditorNumberControl
                            label="Strength Font"
                            value={editingItem.layout.strengthFontSize}
                            onChange={(value) =>
                              updatePreviewLayout(
                                editingItem.productId,
                                "strengthFontSize",
                                value
                              )
                            }
                            min={8}
                            step={1}
                          />

                          <EditorNumberControl
                            label="Strength Y"
                            value={editingItem.layout.strengthY}
                            onChange={(value) =>
                              updatePreviewLayout(
                                editingItem.productId,
                                "strengthY",
                                value
                              )
                            }
                            min={0}
                            step={2}
                          />

                          <EditorNumberControl
                            label="Research Text Font"
                            value={editingItem.layout.researchFontSize}
                            onChange={(value) =>
                              updatePreviewLayout(
                                editingItem.productId,
                                "researchFontSize",
                                value
                              )
                            }
                            min={8}
                            step={1}
                          />

                          <EditorNumberControl
                            label="Research Text Y"
                            value={editingItem.layout.researchTextY}
                            onChange={(value) =>
                              updatePreviewLayout(
                                editingItem.productId,
                                "researchTextY",
                                value
                              )
                            }
                            min={0}
                            step={2}
                          />
                        </div>
                      </div>

                      <div style={editorActionRow}>
                        <button
                          type="button"
                          onClick={() => setEditingPreviewId("")}
                          style={editorCloseButton}
                        >
                          ← BACK TO ALL VIALS
                        </button>
<button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setBulkApproval(
                              editingItem.productId,
                              !editingItem.approved
                            )
                          }
                          style={
                            editingItem.approved
                              ? dangerButton
                              : approveVialButton
                          }
                        >
                          {editingItem.approved
                            ? "REMOVE APPROVAL"
                            : "APPROVE THIS VIAL"}
                        </button>
                      </div>

                      <p style={editorFooterHelp}>
                        Any lettering or color change removes approval automatically.
                        Re-preview the vial, inspect the result, then approve it.
                        Closing this editor keeps your individual settings for
                        this preview.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </section>

        {
          status && (
            <div style={statusBox}>
              {
                busy
                  ? "⚡ "
                  : "● "
              }

              {
                status
              }
            </div>
          )
        }
      </div>
    </main>
  );
}

function NumberControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={field}>
      <span
        style={{
          color: "#aeb1bb",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: ".08em",
        }}
      >
        {label}
      </span>

      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        style={input}
      />
    </label>
  );
}

function EditorNumberControl({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  const changeBy = (delta: number) => {
    onChange(
      Math.max(
        min,
        Number(value || 0) + delta
      )
    );
  };

  return (
    <div style={editorControlCard}>
      <span style={editorFieldLabel}>
        {label}
      </span>

      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) =>
          onChange(
            Math.max(
              min,
              Number(event.target.value || 0)
            )
          )
        }
        style={editorNumberInput}
      />

      <div style={editorNudgeRow}>
        <button
          type="button"
          onClick={() => changeBy(-step * 5)}
          style={editorNudgeButton}
        >
          −{step * 5}
        </button>

        <button
          type="button"
          onClick={() => changeBy(-step)}
          style={editorNudgeButton}
        >
          −{step}
        </button>

        <button
          type="button"
          onClick={() => changeBy(step)}
          style={editorNudgeButton}
        >
          +{step}
        </button>

        <button
          type="button"
          onClick={() => changeBy(step * 5)}
          style={editorNudgeButton}
        >
          +{step * 5}
        </button>
      </div>
    </div>
  );
}

function TextControl(
  props: {
    title: string;

    y: number;

    setY:
      React.Dispatch<
        React.SetStateAction<number>
      >;

    fontSize: number;

    setFontSize:
      React.Dispatch<
        React.SetStateAction<number>
      >;
  }
) {
  const {
    title,
    y,
    setY,
    fontSize,
    setFontSize,
  } =
    props;

  return (
    <div style={controlCard}>
      <strong style={controlTitle}>
        {
          title
        }
      </strong>

      <label style={label}>
        Y Position

        <input
          type="number"
          value={y}
          onChange={
            (
              event
            ) =>
              setY(
                Number(
                  event.target.value
                )
              )
          }
          style={input}
        />
      </label>

      <div style={miniButtonRow}>
        <button
          type="button"
          style={miniButton}
          onClick={
            () =>
              setY(
                (
                  current
                ) =>
                  Math.max(
                    0,
                    current - 10
                  )
              )
          }
        >
          ↑ 10
        </button>

        <button
          type="button"
          style={miniButton}
          onClick={
            () =>
              setY(
                (
                  current
                ) =>
                  current + 10
              )
          }
        >
          ↓ 10
        </button>
      </div>

      <label style={label}>
        Font Size

        <input
          type="number"
          min="8"
          max="120"
          value={
            fontSize
          }
          onChange={
            (
              event
            ) =>
              setFontSize(
                Number(
                  event.target.value
                )
              )
          }
          style={input}
        />
      </label>

      <div style={miniButtonRow}>
        <button
          type="button"
          style={miniButton}
          onClick={
            () =>
              setFontSize(
                (
                  current
                ) =>
                  Math.max(
                    8,
                    current - 2
                  )
              )
          }
        >
          FONT −
        </button>

        <button
          type="button"
          style={miniButton}
          onClick={
            () =>
              setFontSize(
                (
                  current
                ) =>
                  Math.min(
                    120,
                    current + 2
                  )
              )
          }
        >
          FONT +
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#050507",
  color: "#ffffff",
  padding: "110px 16px 60px",
};

const shell = {
  maxWidth: 1180,
  margin: "0 auto",
  display: "grid",
  gap: 16,
};

const header = {
  padding: "4px 2px 10px",
};

const headerTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap" as const,
};

const backButton = {
  minHeight: 40,
  padding: "9px 14px",
  border: "1px solid rgba(0,217,255,.48)",
  borderRadius: 999,
  background: "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};


const eyebrow = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".18em",
};

const title = {
  margin: "4px 0 0",
  fontSize: "clamp(32px, 5vw, 56px)",
  lineHeight: 0.98,
  letterSpacing: "-.05em",
};

const subtitle = {
  maxWidth: 760,
  margin: "8px 0 0",
  color: "#aeb2ba",
  fontSize: 13,
  lineHeight: 1.6,
};

const panel = {
  padding: 16,
  border:
    "1px solid rgba(0,217,255,.18)",
  borderRadius: 16,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.04), rgba(255,69,216,.025), rgba(0,255,153,.03))",
};

const sectionHeader = {
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap" as const,
};

const stepLabel = {
  color: "#ff8ee7",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: ".16em",
};

const panelTitle = {
  margin: "4px 0 0",
  color: "#ffffff",
  fontSize: 18,
};

const familyRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const pill = {
  minHeight: 36,
  padding: "7px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor:
    "rgba(255,255,255,.14)",
  borderRadius: 999,
  background: "#0a0a0c",
  color: "#b8bbc3",
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
};

const pillActive = {
  borderColor: "#00ff99",
  color: "#00ff99",
  background:
    "rgba(0,255,153,.07)",
};

const formGrid = {
  display: "grid",
  gap: 12,
};

const masterTemplateFormGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, .8fr) minmax(240px, 1fr) minmax(220px, .9fr) auto",
  gap: 12,
  alignItems: "end",
};

const controlGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const editorGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const controlCard = {
  padding: 9,
  display: "grid",
  gap: 10,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 12,
  background:
    "rgba(0,0,0,.24)",
};

const controlTitle = {
  color: "#7df9ff",
  fontSize: 12,
};

const field = {
  minWidth: 0,
  display: "grid",
  gap: 6,
};

const label = {
  display: "grid",
  gap: 6,
  color: "#c9cbd2",
  fontSize: 11,
  fontWeight: 850,
};

const input = {
  minHeight: 40,
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "6px 9px",
  border:
    "1px solid rgba(0,217,255,.24)",
  borderRadius: 9,
  outline: "none",
  background: "#09090b",
  color: "#ffffff",
};

const fileInput = {
  minHeight: 40,
  padding: 9,
  border:
    "1px dashed rgba(0,217,255,.30)",
  borderRadius: 9,
  background: "#09090b",
  color: "#c9cbd2",
};

const primaryButton = {
  width: "fit-content",
  minHeight: 40,
  padding: "9px 14px",
  border:
    "1px solid rgba(0,255,153,.72)",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButton = {
  minHeight: 40,
  padding: "9px 14px",
  border:
    "1px solid rgba(0,217,255,.48)",
  borderRadius: 999,
  background:
    "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
};

const layoutActionButtons = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap" as const,
};

const refreshPreviewButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(0,217,255,.48)",
  background: "rgba(0,217,255,.07)",
  color: "#7df9ff",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const saveButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(255,69,216,.5)",
  background: "rgba(255,69,216,.07)",
  color: "#ff75df",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const sessionSaveButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(0,255,153,.5)",
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const stepThreeSaveLayoutButton = {
  ...primaryButton,
  minHeight: 40,
  padding: "9px 14px",
  borderColor: "rgba(0,255,153,.78)",
  background: "rgba(0,255,153,.16)",
  color: "#00ff99",
  boxShadow: "0 0 18px rgba(0,255,153,.18)",
};

const sessionRenameEditor = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const sessionTitleInput = {
  minHeight: 40,
  minWidth: 210,
  padding: "0 11px",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#08090c",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 800,
  outline: "none",
};

const sessionRenameSaveButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(0,255,153,.5)",
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const sessionRenameButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(255,212,0,.5)",
  background: "rgba(255,212,0,.07)",
  color: "#ffd400",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const sessionDeleteButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(255,92,92,.5)",
  background: "rgba(255,92,92,.07)",
  color: "#ff6b6b",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const sessionSelect = {
  minHeight: 40,
  maxWidth: 290,
  padding: "0 10px",
  border: "1px solid rgba(0,217,255,.36)",
  borderRadius: 9,
  background: "#08090c",
  color: "#dfe5ea",
  fontSize: 10,
  fontWeight: 800,
  outline: "none",
};

const sessionRestoreButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  border: "1px solid rgba(162,108,255,.5)",
  background: "rgba(162,108,255,.07)",
  color: "#c7a4ff",
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
};

const approveVialButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
  border: "1px solid rgba(0,255,153,.55)",
  background: "rgba(0,255,153,.09)",
  color: "#00ff99",
};

const dangerButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
  border: "1px solid rgba(255,122,69,.55)",
  background: "rgba(255,122,69,.09)",
  color: "#ff9b6a",
};

const miniButtonRow = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 6,
};

const miniButton = {
  padding: "7px 8px",
  border:
    "1px solid rgba(0,217,255,.18)",
  borderRadius: 7,
  background:
    "rgba(0,217,255,.05)",
  color: "#7df9ff",
  cursor: "pointer",
  fontSize: 9,
  fontWeight: 900,
};

const paletteGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
};

const paletteButton = {
  minHeight: 42,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor:
    "rgba(255,255,255,.12)",
  borderRadius: 10,
  background:
    "rgba(0,0,0,.28)",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 10,
};

const colorDot = {
  width: 12,
  height: 12,
  borderRadius: 999,
  boxShadow:
    "0 0 12px currentColor",
};

const helperText = {
  margin: "10px 0 0",
  color: "#858a94",
  fontSize: 10,
  lineHeight: 1.5,
};

const previewHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap" as const,
  marginBottom: 14,
};

const previewFamilyInline = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const previewFamilyLabel = {
  color: "#8f94a0",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".09em",
};

const textLayoutBelowPreviews = {
  gridColumn: "1 / -1",
  padding: 12,
  border: "1px solid rgba(0,217,255,.12)",
  borderRadius: 12,
  background: "rgba(0,217,255,.025)",
  display: "grid",
  gap: 10,
};

const textLayoutSideHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap" as const,
};

const textLayoutSideHelp = {
  margin: "4px 0 0",
  color: "#7f8490",
  fontSize: 9,
  lineHeight: 1.45,
  maxWidth: 420,
};

const previewSetupInlinePanel = {
  marginBottom: 14,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 12,
  background: "rgba(255,255,255,.02)",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  alignItems: "end",
};

const previewSetupFieldGroup = {
  minWidth: 0,
  display: "grid",
  gap: 8,
};

const previewSetupColorGroup = {
  minWidth: 0,
  display: "grid",
  gap: 8,
};

const colorControlsInline = {
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr)",
  gap: 8,
  alignItems: "center",
};

const colorWheelCompact = {
  width: 52,
  height: 40,
  minWidth: 0,
  boxSizing: "border-box" as const,
  padding: 2,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 9,
  background: "#050507",
  cursor: "pointer",
};

const previewSetupPanel = {
  marginBottom: 14,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 12,
  background: "rgba(255,255,255,.02)",
  display: "grid",
  gap: 12,
};

const previewSetupSection = {
  display: "grid",
  gap: 10,
};

const previewSetupLabel = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".1em",
};

const previewSetupDivider = {
  height: 1,
  background: "rgba(255,255,255,.08)",
};

const previewGrid = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const previewCard = {
  position:
    "relative" as const,
  minHeight: 420,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 14,
  background: "#020203",
};

const previewLabel = {
  position:
    "absolute" as const,
  top: 10,
  left: 10,
  zIndex: 2,
  padding: "5px 8px",
  border:
    "1px solid rgba(0,217,255,.25)",
  borderRadius: 999,
  background:
    "rgba(0,0,0,.78)",
  color: "#7df9ff",
  fontSize: 9,
  fontWeight: 950,
};

const previewImage = {
  width: "100%",
  height: "100%",
  minHeight: 420,
  display: "block",
  objectFit:
    "contain" as const,
  objectPosition:
    "center",
};

const emptyPreview = {
  minHeight: 420,
  display: "grid",
  placeItems: "center",
  color: "#6f747d",
  fontSize: 12,
};

const selectedProductBar = {
  marginTop: 10,
  padding: "9px 10px",
  display: "flex",
  alignItems: "center",
  gap: 9,
  flexWrap: "wrap" as const,
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,.018)",
  color: "#ffffff",
  fontSize: 11,
};

const selectedProductLabel = {
  color: "#7df9ff",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: ".12em",
};

const actionRow = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap" as const,
};

const combinedActionRow = {
  display: "flex",
  gap: 9,
  alignItems: "stretch",
  flexWrap: "nowrap" as const,
  overflowX: "auto" as const,
  paddingBottom: 4,
};

const topStepGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 14,
  alignItems: "stretch",
};

const bottomStepsGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2.2fr) minmax(300px, .8fr)",
  gap: 14,
  alignItems: "start",
};

const colorPickerGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 14,
  width: "100%",
  minWidth: 0,
};

const customColorPanel = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  minHeight: 96,
  padding: 14,
  display: "grid",
  gap: 10,
  border: "1px solid rgba(255,69,216,.30)",
  borderRadius: 14,
  background: "rgba(255,69,216,.035)",
};

const colorControls = {
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
};

const colorWheel = {
  width: 72,
  height: 52,
  minWidth: 0,
  boxSizing: "border-box" as const,
  padding: 2,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 10,
  background: "#050507",
  cursor: "pointer",
};

const colorHexInputInline = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  minHeight: 40,
  height: 40,
  padding: "6px 9px",
  border: "1px solid rgba(0,217,255,.24)",
  borderRadius: 9,
  background: "#09090b",
  color: "#ffffff",
  fontWeight: 850,
  letterSpacing: ".05em",
};

const colorHexInput = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box" as const,
  minHeight: 48,
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
  fontWeight: 850,
  letterSpacing: ".05em",
};

const colorModeStatus = {
  color: "#9fa3ad",
  fontSize: 10,
  lineHeight: 1.45,
};

const miniActionButton = {
  minHeight: 40,
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 999,
  background: "rgba(255,255,255,.035)",
  color: "#c8cbd3",
  fontSize: 9,
  fontWeight: 950,
  cursor: "pointer",
};

const miniActionButtonActive = {
  borderColor: "rgba(0,255,153,.65)",
  background: "rgba(0,255,153,.12)",
  color: "#00ff99",
};

const clearApprovalsActiveButton = {
  borderColor: "rgba(255,204,0,.70)",
  background: "rgba(255,204,0,.14)",
  color: "#ffd84d",
  boxShadow: "0 0 18px rgba(255,204,0,.18)",
};

const regenerateApprovedActiveButton = {
  borderColor: "rgba(0,255,153,.78)",
  background: "rgba(0,255,153,.16)",
  color: "#00ff99",
  boxShadow: "0 0 18px rgba(0,255,153,.18)",
};

const regenerateProductActiveButton = {
  borderColor: "rgba(255,69,216,.74)",
  background: "rgba(255,69,216,.14)",
  color: "#ff8ee7",
  boxShadow: "0 0 18px rgba(255,69,216,.18)",
};

const selectAllBar = {
  marginTop: 12,
  marginBottom: 10,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
  border: "1px solid rgba(255,117,223,.22)",
  borderRadius: 11,
  background: "rgba(255,117,223,.035)",
};

const selectAllLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#ff75df",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".08em",
  cursor: "pointer",
};

const selectAllHelp = {
  color: "#8f94a0",
  fontSize: 10,
  lineHeight: 1.4,
};

const clickToEditHint = {
  marginTop: -2,
  padding: "7px 9px",
  border: "1px solid rgba(0,217,255,.22)",
  borderRadius: 8,
  background: "rgba(0,217,255,.04)",
  color: "#7df9ff",
  textAlign: "center" as const,
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: ".08em",
};

const letteringEditorOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 1000,
  padding: "clamp(8px, 2vw, 20px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,.86)",
  backdropFilter: "blur(8px)",
};

const letteringEditorModal = {
  width: "min(1180px, 100%)",
  maxHeight: "95vh",
  overflowY: "auto" as const,
  padding: "clamp(12px, 2vw, 18px)",
  border: "1px solid rgba(255,69,216,.44)",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(255,69,216,.055), rgba(0,217,255,.03)), #08080c",
  boxShadow:
    "0 28px 90px rgba(0,0,0,.72), 0 0 36px rgba(255,69,216,.12)",
};

const letteringEditorHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap" as const,
  marginBottom: 10,
};

const letteringEditorTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: 21,
  fontWeight: 950,
};

const letteringEditorSubtext = {
  margin: "7px 0 0",
  maxWidth: 650,
  color: "#8f94a0",
  fontSize: 11,
  lineHeight: 1.55,
};

const editorCloseButton = {
  minHeight: 40,
  padding: "0 13px",
  borderRadius: 9,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 3px 10px rgba(0,0,0,.24)",
  border: "1px solid rgba(0,217,255,.52)",
  background: "rgba(0,217,255,.08)",
  color: "#7df9ff",
};

const letteringEditorGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, .9fr) minmax(420px, 1.1fr)",
  gap: 12,
  alignItems: "start",
};

const editorImageCard = {
  position: "sticky" as const,
  top: 0,
  padding: 9,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 13,
  background: "#020203",
};

const editorImageLabel = {
  marginBottom: 5,
  color: "#7df9ff",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".1em",
};

const editorLargeImage = {
  display: "block",
  width: "100%",
  maxHeight: "58vh",
  objectFit: "contain" as const,
  borderRadius: 8,
  background: "#000000",
};

const editorPreviewNote = {
  marginTop: 6,
  color: "#7f8490",
  fontSize: 9,
  lineHeight: 1.5,
};

const letteringControlsPanel = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const editorControlCard = {
  padding: 12,
  display: "grid",
  gap: 6,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 11,
  background: "rgba(255,255,255,.025)",
};

const editorFieldLabel = {
  color: "#aeb1bb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const editorNumberInput = {
  width: "100%",
  minWidth: 0,
  height: 36,
  boxSizing: "border-box" as const,
  padding: "8px 10px",
  border: "1px solid rgba(0,217,255,.25)",
  borderRadius: 8,
  background: "#050507",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 850,
  outline: "none",
};

const editorNudgeRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 4,
};

const editorNudgeButton = {
  minHeight: 28,
  padding: "4px 4px",
  border: "1px solid rgba(125,249,255,.2)",
  borderRadius: 7,
  background: "rgba(0,217,255,.045)",
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const labelTextArea = {
  width: "100%",
  minWidth: 0,
  minHeight: 74,
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
  padding: "8px 10px",
  border: "1px solid rgba(0,217,255,.28)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 15,
  fontWeight: 850,
  lineHeight: 1.35,
  letterSpacing: ".03em",
  outline: "none",
};

const labelWrapHint = {
  color: "#7f8490",
  fontSize: 9,
  lineHeight: 1.45,
};

const editorActionRow = {
  marginTop: 10,
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const editorFooterHelp = {
  margin: "12px 0 0",
  color: "#8f94a0",
  fontSize: 10,
  lineHeight: 1.5,
};

const bulkSummaryBar = {
  marginTop: 14,
  padding: "10px 12px",
  display: "flex",
  gap: 16,
  flexWrap: "wrap" as const,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 11,
  background: "rgba(255,255,255,.02)",
  color: "#9fa3ad",
  fontSize: 11,
};

const bulkPreviewGrid = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};

const bulkPreviewCard = {
  padding: 12,
  display: "grid",
  gap: 10,
  border: "1px solid",
  borderRadius: 14,
  background: "rgba(0,0,0,.25)",
};

const bulkCardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
};

const fitBadge = {
  display: "inline-flex",
  padding: "4px 7px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: ".08em",
};

const bulkProductTitle = {
  margin: "7px 0 0",
  color: "#ffffff",
  fontSize: 14,
  lineHeight: 1.3,
};

const approvalToggle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#ff75df",
  fontSize: 9,
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const bulkPreviewImage = {
  width: "100%",
  aspectRatio: "4 / 5",
  display: "block",
  objectFit: "contain" as const,
  borderRadius: 10,
  background: "#020203",
};

const reviewReasonBox = {
  padding: 10,
  display: "grid",
  gap: 4,
  border: "1px solid rgba(255,204,0,.26)",
  borderRadius: 9,
  background: "rgba(255,204,0,.05)",
  color: "#e6c65d",
  fontSize: 10,
  lineHeight: 1.45,
};

const passReasonBox = {
  padding: 10,
  border: "1px solid rgba(0,255,153,.22)",
  borderRadius: 9,
  background: "rgba(0,255,153,.045)",
  color: "#85d9ad",
  fontSize: 10,
  lineHeight: 1.45,
};

const bulkInlineStatus = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,217,255,.22)",
  background: "rgba(0,217,255,.06)",
  color: "#d9f8ff",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.45,
};

const statusBox = {
  position:
    "sticky" as const,
  bottom: 14,
  zIndex: 20,
  padding: "10px 12px",
  border:
    "1px solid rgba(0,255,153,.30)",
  borderRadius: 12,
  background:
    "rgba(0,15,10,.95)",
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 850,
};

const selectAllInlineLabel: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" };

const selectAllInlineLabelShifted: React.CSSProperties = {
  ...selectAllInlineLabel,
  marginLeft: 18,
  flexShrink: 0,
};
