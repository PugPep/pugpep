"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type DocumentView = { url: string; title: string; isPdf: boolean };

/**
 * Shared COA viewer. Intercepts only ordinary clicks on public Supabase
 * 'coas' storage links already rendered by the storefront. The source URL
 * is not modified or resized and remains available via Open Original.
 *
 * File location: app/components/CoaViewer.tsx
 */
export default function CoaViewer() {
  const [documentView, setDocumentView] = useState<DocumentView | null>(null);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const scrollArea = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => {
    setDocumentView(null);
    setImageSize(null);
    setScale(1);
    setFit(true);
  }, []);

  useEffect(() => {
    function openUrl(rawUrl: string, title?: string) {
      let url: URL;
      try { url = new URL(rawUrl, window.location.href); } catch { return false; }
      if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url.origin)) return false;
      if (!/\/storage\/v1\/object\/public\/coas\//i.test(url.pathname)) return false;
      const path = decodeURIComponent(url.pathname);
      if (!/\.(png|jpe?g|webp|gif|pdf)$/i.test(path)) return false;
      const name = path.split("/").pop() || "Certificate of Analysis";
      setDocumentView({ url: url.toString(), title: title || name, isPdf: /\.pdf$/i.test(path) });
      setScale(1); setFit(true); setImageSize(null);
      return true;
    }
    function onExplicitOpen(event: Event) {
      const detail = (event as CustomEvent<{ url: string; title?: string }>).detail;
      if (detail?.url) openUrl(detail.url, detail.title);
    }
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.hasAttribute("download") || link.dataset.coaViewerIgnore === "true" || link.dataset.coaViewerGuard === "true") return;
      if (openUrl(link.href, link.getAttribute("aria-label") || undefined)) {
        event.preventDefault();
        // Stop page-level click handlers from navigating to the same URL.
        event.stopPropagation();
      }
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("pugpep:open-coa", onExplicitOpen);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("pugpep:open-coa", onExplicitOpen); };
  }, []);

  useEffect(() => {
    if (!documentView) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [documentView, close]);

  const zoomTo = (nextScale: number) => {
    setFit(false);
    setScale(Math.min(4, Math.max(0.25, Math.round(nextScale * 100) / 100)));
  };
  if (!documentView) return null;

  const actionStyle: CSSProperties = {
    background: "#141d28", color: "#f5fbff", border: "1px solid #486171",
    borderRadius: 8, padding: "9px 12px", fontWeight: 700, fontSize: 13,
    cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
  };
  const width = imageSize?.width || 0;
  const height = imageSize?.height || 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Certificate of Analysis viewer"
      style={{ position: "fixed", inset: 0, zIndex: 2147483640, background: "rgba(0,0,0,.93)", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderBottom: "1px solid #243444", background: "#07101a" }}>
        <strong style={{ flex: "1 1 140px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }} title={documentView.title}>COA · {documentView.title}</strong>
        {!documentView.isPdf && <>
          <button type="button" style={actionStyle} onClick={() => setFit(true)}>Fit</button>
          <button type="button" style={actionStyle} onClick={() => zoomTo(1)}>100%</button>
          <button type="button" aria-label="Zoom out" style={actionStyle} onClick={() => zoomTo((fit ? 1 : scale) / 1.25)}>−</button>
          <button type="button" aria-label="Zoom in" style={actionStyle} onClick={() => zoomTo((fit ? 1 : scale) * 1.25)}>+</button>
        </>}
        <a href={documentView.url} target="_blank" rel="noopener noreferrer" data-coa-viewer-ignore="true" style={actionStyle}>Open original ↗</a>
        <button type="button" style={{ ...actionStyle, background: "#23303d", borderColor: "#6c8392" }} onClick={close}>Close ✕</button>
      </div>
      <div ref={scrollArea} style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: fit ? "center" : "flex-start", justifyContent: fit ? "center" : "flex-start", padding: fit ? 12 : 18 }}>
        {documentView.isPdf ? (
          <iframe title="Certificate PDF" src={documentView.url} style={{ display: "block", border: 0, width: "100%", height: "100%", minHeight: 350, background: "#fff" }} />
        ) : (
          // Plain IMG, not next/image: no transformations, optimizers or thumbnails.
          // Fit mode shows the whole certificate; 100% uses intrinsic pixels.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={documentView.url} alt={documentView.title}
            onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={fit
              ? { display: "block", maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", flexShrink: 0 }
              : { display: "block", width: width ? `${Math.round(width * scale)}px` : "auto", height: height ? `${Math.round(height * scale)}px` : "auto", maxWidth: "none", maxHeight: "none", flexShrink: 0 }} />
        )}
      </div>
      <div style={{ padding: "7px 12px", textAlign: "center", color: "#b9c8d7", fontSize: 12, background: "#07101a" }}>
        {documentView.isPdf ? "PDF — use document controls to zoom" : fit ? "Fit to screen · Select 100% to inspect the original pixels" : `${Math.round(scale * 100)}% · Original ${width} × ${height} pixels`}
      </div>
    </div>
  );
}
