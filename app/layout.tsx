"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabaseClient";
import { loadStorefrontSales, getPrimaryStorefrontCampaign } from "../lib/storefrontCampaigns";

import {

  useEffect,

  useRef,

  useState,

} from "react";

import {

  CartProvider,

  useCart,
  getCartItemTotals,

} from "./cartContext";

import CartIcon from "./CartIcon";

import AuthNav from "./AuthNav";

import AdminMenu from "./AdminMenu";

import PromoCapture from "./PromoCapture";

import CoaViewer from "./components/CoaViewer";

export default function RootLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  const [

    menuOpen,

    setMenuOpen,

  ] = useState(false);

  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);

  const [

    desktopHeaderOpen,

    setDesktopHeaderOpen,

  ] = useState(false);

  const desktopHeaderCloseTimer =

    useRef<

      ReturnType<typeof setTimeout> | null

    >(null);

  function cancelDesktopHeaderClose() {

    if (

      desktopHeaderCloseTimer.current

    ) {

      clearTimeout(

        desktopHeaderCloseTimer.current

      );

      desktopHeaderCloseTimer.current =

        null;

    }

  }

  function openDesktopHeader() {

    cancelDesktopHeaderClose();

    setDesktopHeaderOpen(true);

  }

  function closeDesktopHeaderImmediately() {

    cancelDesktopHeaderClose();

    setDesktopHeaderOpen(false);

  }

  function scheduleDesktopHeaderClose() {

    cancelDesktopHeaderClose();

    desktopHeaderCloseTimer.current =

      setTimeout(() => {

        setDesktopHeaderOpen(false);

        desktopHeaderCloseTimer.current =

          null;

      }, 1200);

  }

  useEffect(() => {

    function handleEscape(

      event: KeyboardEvent

    ) {

      if (

        event.key ===

        "Escape"

      ) {

        setMenuOpen(false);

        closeDesktopHeaderImmediately();

      }

    }

    window.addEventListener(

      "keydown",

      handleEscape

    );

    return () => {

      window.removeEventListener(

        "keydown",

        handleEscape

      );

      cancelDesktopHeaderClose();

    };

  }, []);

  useEffect(() => {
    let previousY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (window.innerWidth > 800) {
        setMobileHeaderHidden(false);
        previousY = currentY;
        return;
      }
      if (currentY < 70 || menuOpen) {
        setMobileHeaderHidden(false);
      } else if (Math.abs(currentY - previousY) > 5) {
        setMobileHeaderHidden(currentY > previousY);
      }
      previousY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return (

    <html lang="en">

      <body style={bodyStyle}>

        <style>{`

          @keyframes tickerScroll {

            0% {

              transform: translateX(0);

            }

            100% {

              transform: translateX(-50%);

            }

          }

          .tickerTrack > span:nth-child(odd) {
            color: #66dcff;
            text-shadow: 0 0 2px rgba(0,217,255,.32);
          }
          .tickerTrack > span:nth-child(even) {
            color: #ff78cf;
            text-shadow: 0 0 2px rgba(255,85,197,.25);
          }

          .siteHeaderShell {

            transform: translateY(-100%);

            transition:

              transform 360ms ease,

              box-shadow 360ms ease;

          }

          .siteHeaderShell.open {

            transform: translateY(0);

          }

          .topActivationStrip {

            display: block;

          }

          .mobileMenuButton {

            display: none;

          }

          .mobileDropdown {

            display: none;

          }

          .desktopHeaderCart {

            display: block;

          }

          .mobileCart {

            display: none;

          }

          .floatingDesktopCart {

            display: grid;

          }

          /* Desktop: compact, matching header action heights and readable navigation. */
          @media (min-width: 801px) {
            .mobileHeaderActions a,
            .mobileHeaderActions button {
              box-sizing: border-box !important;
              height: 38px !important;
              min-height: 38px !important;
              max-height: 38px !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
          }

          @media (max-width: 800px) {

            .topActivationStrip {

              display: none !important;

            }

            .siteHeaderShell {
              position: sticky !important;
              transform: translateY(0) !important;
              transition: transform 260ms ease !important;
            }
            .siteHeaderShell.mobileHidden {
              transform: translateY(-100%) !important;
            }

            .desktopNav {

              display: none !important;

            }

            .mobileMenuButton {

              display: block !important;

            }

            .desktopHeaderCart {

              display: none !important;

            }

            .mobileCart {

              display: block !important;

            }

            .floatingDesktopCart {

              display: none !important;

            }

            .mobileDropdown {

              display: grid !important;

            }

            /* The desktop one-line header is wider than a phone screen.
               Give the logo and controls separate rows and allow the
               controls to wrap without cropping the cart. */
            .siteNav {

              display: grid !important;
              grid-template-columns: minmax(0, 1fr) !important;
              align-items: stretch !important;
              gap: 9px !important;
              padding: 10px 12px 12px !important;
              max-width: 100vw !important;
              min-width: 0 !important;

            }

            .mobileHeaderIdentity {
              min-width: 0 !important;
              max-width: 100% !important;
            }

            .mobileHeaderIdentity img {
              max-width: min(185px, 54vw) !important;
              height: auto !important;
            }

            .mobileHeaderActions {
              display: flex !important;
              width: 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              flex-wrap: wrap !important;
              align-items: center !important;
              justify-content: flex-end !important;
              gap: 8px !important;
            }

            .mobileHeaderActions > * {
              flex-shrink: 0 !important;
              max-width: 100% !important;
            }

            .mobileCart {
              min-width: 0 !important;
              max-width: 100% !important;
            }

            .mobileMenuButton {
              flex-shrink: 0 !important;
            }

            /* Keep Account Access, cart and hamburger controls aligned.
               Target the visible interactive surfaces rather than changing
               their widths or the spacing between controls. */
            .mobileHeaderActions button,
            .mobileHeaderActions a {
              box-sizing: border-box !important;
              height: 44px !important;
              min-height: 44px !important;
              max-height: 44px !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
              vertical-align: middle !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
            }

            .mobileHeaderActions .mobileMenuButton {
              width: 44px !important;
              min-width: 44px !important;
              padding: 0 !important;
            }

            .tickerTrack {

              animation-duration: 28s !important;

            }

          }

          @media (prefers-reduced-motion: reduce) {

            .siteHeaderShell {

              transition: none !important;

            }

            .tickerTrack {

              animation: none !important;

            }

          }

        `}</style>

        <CartProvider>

          <PromoCapture />

          {/* Persistent announcement strip: independent of the auto-hiding navigation. */}
          <div className="persistentAnnouncement" style={topTicker}>

              <div

                className="tickerTrack"

                style={tickerTrack}

              >

                <span>

                  FREE U.S. SHIPPING ON

                  ORDERS OVER $250

                </span>

                <span>

                  3rd-PARTY TESTED

                </span>

                <span>

                  MULTIPLE PAYMENT OPTIONS

                </span>

                <span>

                  We support our active duty

                  military, veterans &amp; first

                  responders

                </span>

                <span>

                  FREE U.S. SHIPPING ON

                  ORDERS OVER $250

                </span>

                <span>

                  3rd-PARTY TESTED

                </span>

                <span>

                  MULTIPLE PAYMENT OPTIONS

                </span>

                <span>

                  We support our active duty

                  military, veterans &amp; first

                  responders

                </span>

              </div>

          </div>

          <div

            className="topActivationStrip"

            style={activationStrip}

            onMouseEnter={

              openDesktopHeader

            }

            aria-hidden="true"

          >

            <span

              style={activationGlow}

            />

          </div>

          <header

            className={`siteHeaderShell${desktopHeaderOpen ? " open" : ""}${mobileHeaderHidden && !menuOpen ? " mobileHidden" : ""}`}

            style={headerShell}

            onMouseEnter={

              openDesktopHeader

            }

            onMouseLeave={

              scheduleDesktopHeaderClose

            }

          >

            <nav

              className="siteNav"

              style={navStyle}

              aria-label="Primary navigation"

            >

              <div className="mobileHeaderIdentity" style={logoArea}>

                <Link

                  href="/"

                  style={logoText}

                  onClick={() => {

                    setMenuOpen(false);

                    closeDesktopHeaderImmediately();

                  }}

                >

                  <img
                    src="/pugpep-header-logo.png"
                    alt="PugPep"
                    width={220}
                    height={45}
                    style={headerLogoImage}
                  />

                </Link>

                <div

                  id="nav-user-email"

                  style={emailText}

                />

              </div>

              <div

                className="desktopNav"

                style={navLinks}

              >

                <NavLink

                  href="/"

                  label="HOME"

                  closeHeader={

                    closeDesktopHeaderImmediately

                  }

                />

                <NavLink
                  href="/create-custom-kit"
                  label="CREATE A KIT"
                  closeHeader={closeDesktopHeaderImmediately}
                />

                <NavLink

                  href="/about"

                  label="ABOUT"

                  closeHeader={

                    closeDesktopHeaderImmediately

                  }

                />

                <NavLink

                  href="/quality"

                  label="QUALITY"

                  closeHeader={

                    closeDesktopHeaderImmediately

                  }

                />

                <NavLink

                  href="/contact"

                  label="CONTACT"

                  closeHeader={

                    closeDesktopHeaderImmediately

                  }

                />

                <NavLink

                  href="/account"

                  label="MY ACCOUNT"

                  closeHeader={

                    closeDesktopHeaderImmediately

                  }

                />

              </div>

              <div className="mobileHeaderActions" style={rightNav}>

                <AdminMenu />

                <AuthNav />

                <div

                  className="desktopHeaderCart"

                >

                  <CartIcon />

                </div>

                <div

                  className="mobileCart"

                >

                  <CartIcon />

                </div>

                <button

                  type="button"

                  className="mobileMenuButton"

                  onClick={() =>

                    setMenuOpen(

                      (

                        current

                      ) =>

                        !current

                    )

                  }

                  style={mobileMenuButton}

                  aria-expanded={

                    menuOpen

                  }

                  aria-controls="mobile-site-menu"

                  aria-label={

                    menuOpen

                      ? "Close navigation menu"

                      : "Open navigation menu"

                  }

                >

                  {menuOpen

                    ? "×"

                    : "☰"}

                </button>

              </div>

            </nav>

            {menuOpen && (

              <div

                id="mobile-site-menu"

                className="mobileDropdown"

                style={mobileDropdown}

              >

                <MobileNavLink

                  href="/"

                  label="HOME"

                  setMenuOpen={

                    setMenuOpen

                  }

                />

                <MobileNavLink
                  href="/create-custom-kit"
                  label="CREATE A KIT"
                  setMenuOpen={setMenuOpen}
                />

                <MobileNavLink

                  href="/about"

                  label="ABOUT US"

                  setMenuOpen={

                    setMenuOpen

                  }

                />

                <MobileNavLink

                  href="/quality"

                  label="QUALITY"

                  setMenuOpen={

                    setMenuOpen

                  }

                />

                <MobileNavLink

                  href="/contact"

                  label="CONTACT"

                  setMenuOpen={

                    setMenuOpen

                  }

                />

                <MobileNavLink

                  href="/account"

                  label="MY ACCOUNT"

                  setMenuOpen={

                    setMenuOpen

                  }

                />

              </div>

            )}

          </header>

          <FloatingCart />

          {children}

          <CoaViewer />

        </CartProvider>

      </body>

    </html>

  );

}

function FloatingCart() {
  const { cart, total, updateQuantity, removeFromCart, setPurchaseType } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [campaignMinimum, setCampaignMinimum] = useState<number | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchItems, setSearchItems] = useState<{ id: string; name: string; slug: string; image: string | null }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const normalizedQuery = productQuery.trim().toLowerCase();
  const compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, "");
  const searchMatches = normalizedQuery ? searchItems.filter((item) =>
    item.name.toLowerCase().includes(normalizedQuery) || item.slug.toLowerCase().includes(normalizedQuery)
    || (compactQuery && `${item.name} ${item.slug}`.toLowerCase().replace(/[^a-z0-9]/g, "").includes(compactQuery))
  ).slice(0, 7) : [];
  const showSearchResults = searchFocused && normalizedQuery.length > 0;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const merchandiseCents = Math.round(total * 100);
  const kitSavingsCents = cart.reduce((sum, item) =>
    sum + (item.customKitGroupId && item.customKitLineTotal?.quantity === item.quantity
      ? Math.round(item.customKitLineTotal.kitSavings * 100) : 0), 0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCampaignMinimum(null);
    void (async () => {
      try {
        const sales = await loadStorefrontSales(createClient());
        if (cancelled) return;
        // Prefer a campaign relevant to a product already in this cart.
        const cartCampaign = cart.map((item) => sales[item.slug]).find(
          (sale) => sale?.source === "campaign" && sale.minimumSpend != null && sale.minimumSpend > 0
        );
        const primaryCampaign = getPrimaryStorefrontCampaign(sales);
        const minimum = cartCampaign?.minimumSpend ?? primaryCampaign?.minimumSpend ?? null;
        setCampaignMinimum(minimum != null && minimum > 0 ? minimum : null);
      } catch (error) {
        if (!cancelled) {
          console.error("Cart campaign minimum could not be loaded:", error);
          setCampaignMinimum(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open, cart]);

  function closeCart() {
    setOpen(false);
    setProductQuery("");
    setSearchFocused(false);
    setActiveResult(-1);
    const target = returnFocusRef.current?.isConnected ? returnFocusRef.current : triggerRef.current;
    requestAnimationFrame(() => target?.focus());
  }
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(false);
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (!cancelled) { setSearchLoading(false); setSearchError(true); }
    }, 12000);
    void (async () => {
      try {
        const { data, error } = await createClient().from("products").select("id,name,slug,image")
          .eq("is_active", true).order("name", { ascending: true }).abortSignal(controller.signal);
        if (cancelled) return;
        if (error) throw error;
        setSearchItems(data || []);
      } catch (error) {
        if (!cancelled) { console.error("Cart product search unavailable:", error); setSearchError(true); }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; clearTimeout(timeoutId); controller.abort(); };
  }, [open]);

  function openSearchProduct(slug: string) {
    closeCart();
    router.push(`/products/${slug}`);
  }

  async function handleCheckout(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    try {
      const { data, error } = await createClient().auth.getUser();
      closeCart();
      router.push(!error && data.user ? "/checkout" : "/cart");
    } catch {
      closeCart();
      router.push("/cart");
    }
  }
  useEffect(() => {
    function showCart() {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    }
    window.addEventListener("pugpep:open-cart", showCart);
    return () => window.removeEventListener("pugpep:open-cart", showCart);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = Array.from(document.body.children).filter((node): node is HTMLElement =>
      node instanceof HTMLElement && !node.contains(panelRef.current));
    const inertBefore = background.map((node) => node.inert);
    background.forEach((node) => { node.inert = true; });
    panelRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeCart(); }
      if (event.key === "Tab") {
        const controls = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) {
          event.preventDefault(); first.focus();
        }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((node, index) => { node.inert = inertBefore[index]; });
      window.removeEventListener("keydown", keydown);
    };
  }, [open]);

  return <>
    <style>{`
      .pugpep-cart-panel {
        --drawer-cyan: #7df9ff;
        --drawer-muted: #abb5c4;
        --drawer-border: rgba(178, 207, 224, .17);
        position: absolute; inset: 0 0 0 auto; width: min(520px, 100%);
        display: flex; flex-direction: column; box-sizing: border-box;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 16px; line-height: 1.4;
        background: #0e141a; color: #fff; box-shadow: -12px 0 35px #0008;
        border-left: 1px solid var(--drawer-border);
      }
      .pugpep-cart-panel :is(button, a, input):focus-visible, .pugpep-cart-trigger:focus-visible {
        outline: 3px solid #ff75df; outline-offset: 3px;
      }
      .pugpep-drawer-header, .pugpep-drawer-footer { flex: none; padding: 14px clamp(12px, 4vw, 24px); }
      .pugpep-drawer-header { position: relative; z-index: 1; border-bottom: 1px solid var(--drawer-border); }
      .pugpep-drawer-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
      .pugpep-drawer-title h2 { margin: 0; font-size: clamp(21px, 5vw, 27px); font-weight: 900; text-transform: uppercase; }
      .pugpep-drawer-title h2 span { color: var(--drawer-cyan); }
      .pugpep-drawer-close { width: 42px; height: 42px; padding: 0; border: 0; background: transparent; color: #fff; font: inherit; font-size: 30px; cursor: pointer; }
      .pugpep-drawer-delivery { margin: 11px 0 0; color: var(--drawer-cyan); font-size: 15px; line-height: 1.4; }
      .pugpep-drawer-delivery small { display: block; margin-top: 6px; color: var(--drawer-muted); font-size: 14px; }
      .pugpep-drawer-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 15px clamp(12px, 4vw, 24px); scrollbar-color: #44616e #0e141a; }
      .pugpep-drawer-items { border: 1px solid var(--drawer-border); border-radius: 15px; background: #111920; }
      .pugpep-drawer-item { display: grid; gap: 10px; padding: 14px; }
      .pugpep-drawer-item + .pugpep-drawer-item { border-top: 1px solid var(--drawer-border); }
      .pugpep-drawer-product { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .pugpep-drawer-product img { display: block; width: 68px; height: 70px; object-fit: contain; border-radius: 9px; background: #191f29; }
      .pugpep-drawer-name { color: #fff; text-decoration: none; font-size: 18px; font-weight: 850; overflow-wrap: anywhere; }
      .pugpep-drawer-name:hover, .pugpep-drawer-view:hover { color: var(--drawer-cyan); }
      .pugpep-drawer-meta { color: var(--drawer-muted); font-size: 15px; line-height: 1.45; margin: 3px 0 0; }
      .pugpep-drawer-badge { display: inline-block; margin-top: 5px; padding: 3px 6px; border-radius: 5px; background: #d3ff69; color: #182000; font-size: 13px; font-weight: 850; }
      .pugpep-drawer-controls { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 6px 10px; }
      .pugpep-drawer-quantity { display: flex; align-items: center; gap: 5px; }
      .pugpep-cart-step { width: 44px; height: 44px; border: 1px solid rgba(0,217,255,.34); background: #14222b; color: var(--drawer-cyan); border-radius: 50%; cursor: pointer; font: inherit; font-size: 20px; }
      .pugpep-cart-step:disabled { opacity: .4; cursor: default; }
      .pugpep-drawer-quantity span { min-width: 23px; text-align: center; font-variant-numeric: tabular-nums; }
      .pugpep-drawer-line-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 7px; font-size: 20px; font-variant-numeric: tabular-nums; }
      .pugpep-drawer-line-price del { color: var(--drawer-muted); font-size: 14px; }
      .pugpep-drawer-remove { padding: 9px 0; border: 0; background: transparent; color: #ff9be7; cursor: pointer; font: inherit; font-size: 15px; }
      .pugpep-drawer-footer { border-top: 1px solid var(--drawer-border); background: #0e141a; padding-bottom: max(14px, env(safe-area-inset-bottom)); }
      .pugpep-drawer-totals { display: grid; gap: 6px; margin: 0; }
      .pugpep-drawer-totals > div { display: flex; justify-content: space-between; gap: 12px; }
      .pugpep-drawer-totals dt { color: var(--drawer-muted); }
      .pugpep-drawer-totals dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
      .pugpep-drawer-totals .pugpep-drawer-total { padding-top: 8px; margin-top: 2px; border-top: 1px solid var(--drawer-border); font-size: 18px; font-weight: 850; }
      .pugpep-drawer-total dt { color: #fff; }
      .pugpep-drawer-cta { display: block; text-align: center; margin-top: 12px; padding: 13px 10px; border-radius: 999px; background: linear-gradient(105deg,#00d9ff,#ff45d8); color: #0d1018; text-decoration: none; font-size: 17px; font-weight: 900; }
      .pugpep-drawer-view { display: block; text-align: center; color: var(--drawer-muted); padding: 10px 0 0; text-underline-offset: 3px; font-size: 16px; }
      @media(max-width:800px) { .pugpep-cart-trigger { display:none !important; } }
      @media(max-height:480px) {
        .pugpep-cart-panel { overflow-y: auto; }
        .pugpep-drawer-body { flex: none; overflow-y: visible; }
      }
      @media(max-width:360px), (max-height:640px) {
        .pugpep-drawer-header, .pugpep-drawer-footer { padding-top: 8px; padding-bottom: max(8px, env(safe-area-inset-bottom)); }
        .pugpep-drawer-item { padding: 11px; }
        .pugpep-drawer-title { margin-bottom: 4px; }
        .pugpep-drawer-delivery { margin-top: 7px; }
      }
    `}</style>
    {open && <div style={{ position:"fixed", inset:0, zIndex:100010, background:"rgba(0,0,0,.65)" }}
      onClick={(event) => { if (event.target === event.currentTarget) closeCart(); }}>
      <section id="pugpep-cart-panel" ref={panelRef} tabIndex={-1} className="pugpep-cart-panel" role="dialog" aria-modal="true" aria-labelledby="pugpep-cart-title">
        <header className="pugpep-drawer-header">
          <div className="pugpep-drawer-title">
            <h2 id="pugpep-cart-title">Shopping Cart <span>({count})</span></h2>
            <button type="button" onClick={closeCart} aria-label="Close cart" className="pugpep-drawer-close">×</button>
          </div>
          <div style={{ position:"relative", flex:1, minWidth:0 }}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false); }}>
            <input type="search" role="combobox" aria-label="Search products" autoComplete="off"
              aria-autocomplete="list" aria-expanded={showSearchResults} aria-controls="cart-product-results"
              aria-activedescendant={showSearchResults && activeResult >= 0 && searchMatches[activeResult] ? `cart-product-result-${activeResult}` : undefined}
              placeholder={searchFocused ? "" : "Search products here"} value={productQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(event) => { setProductQuery(event.target.value); setSearchFocused(true); setActiveResult(-1); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && searchMatches.length) { event.preventDefault(); setActiveResult((index) => (index + 1) % searchMatches.length); }
                if (event.key === "ArrowUp" && searchMatches.length) { event.preventDefault(); setActiveResult((index) => (index <= 0 ? searchMatches.length - 1 : index - 1)); }
                if (event.key === "Enter" && searchMatches.length) { event.preventDefault(); openSearchProduct((searchMatches[activeResult] || searchMatches[0]).slug); }
                if (event.key === "Escape" && showSearchResults) { event.preventDefault(); event.stopPropagation(); setSearchFocused(false); setActiveResult(-1); }
              }}
              style={{ width:"100%", boxSizing:"border-box", minWidth:0, height:42, border:"1px solid #454956", borderRadius:7,
                padding:"0 8px", background:"#20232e", color:"#fff", font:"inherit" }} />
            {showSearchResults && <div id="cart-product-results" role="listbox" aria-label="Matching products"
              style={{ position:"absolute", right:0, top:"calc(100% + 6px)", width:"min(300px, calc(100vw - 40px))", maxHeight:300,
                overflowY:"auto", zIndex:2, background:"#20232e", border:"1px solid #454956", borderRadius:8, boxShadow:"0 8px 24px #0006" }}>
              {searchMatches.length > 0 ? searchMatches.map((item, index) => <button key={item.id} id={`cart-product-result-${index}`}
                type="button" role="option" aria-selected={activeResult === index} onClick={() => openSearchProduct(item.slug)}
                style={{ display:"flex", width:"100%", alignItems:"center", gap:8, padding:10, border:0, borderBottom:"1px solid #363b48",
                  background:activeResult === index ? "#344252" : "transparent", color:"#fff", textAlign:"left", font:"inherit", cursor:"pointer" }}>
                <img src={item.image || "/pugpep-logo.png"} alt="" style={{ width:32, height:38, objectFit:"contain", background:"#fff", borderRadius:4 }} />
                <span>{item.name}</span>
              </button>) : <p role="status" style={{ margin:0, padding:12, color:"#b7bed0", fontSize:14 }}>
                {searchLoading ? "Loading products…" : searchError ? "Product search is temporarily unavailable." : "No matching products."}
              </p>}
            </div>}
          </div>
          <p className="pugpep-drawer-delivery">
            <small>Discount codes, rewards, and shipping eligibility are confirmed at checkout.</small>
          </p>
          {campaignMinimum != null && <p className="pugpep-drawer-meta" role="note">
            ${campaignMinimum.toFixed(2)} minimum after discount
          </p>}
        </header>
        <div className="pugpep-drawer-body">
          {cart.length === 0 ? <p className="pugpep-drawer-meta">Your cart is empty.</p> :
            <div className="pugpep-drawer-items">
              {cart.map((item, index) => {
                const quote = getCartItemTotals(item);
                const kitQuote = item.customKitGroupId && item.customKitLineTotal?.quantity === item.quantity
                  ? item.customKitLineTotal : undefined;
                const salePercent = item.customKitGroupId ? kitQuote?.salePercent ?? 0 : item.salePercent;
                const showSale = item.customKitGroupId ? salePercent > 15
                  : item.wasOnSale && salePercent > 0 &&
                    !(item.purchaseType === "kit" && !item.hasCampaign && item.quantity >= 3);
                const lineTotal = item.customKitGroupId && (!kitQuote || kitQuote.kitSavings > 0)
                  ? quote.originalTotal : quote.total;
                const itemLabel = item.customKitGroupId ? "Custom kit vial" : item.purchaseType === "kit" ? "Kit of 10" : "Single vial";
                const unitLabel = item.purchaseType === "kit" ? "kit" : "vial";
                return (
                  <article key={JSON.stringify([item.customKitGroupId, item.productOptionId || item.slug, item.dosage, index])}
                    className="pugpep-drawer-item">
                    <div className="pugpep-drawer-product">
                      <Link href={`/products/${item.slug}`} onClick={closeCart} aria-label={`View ${item.name}`}>
                        <img src={item.image || "/pugpep-logo.png"} alt="" width={68} height={70} />
                      </Link>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/products/${item.slug}`} onClick={closeCart} className="pugpep-drawer-name">{item.name}</Link>
                        <p className="pugpep-drawer-meta">{item.dosage} · {itemLabel}</p>
                        <p className="pugpep-drawer-meta">${(lineTotal / item.quantity).toFixed(2)} per {unitLabel}</p>
                        {showSale && <span className="pugpep-drawer-badge">
                          {item.customKitGroupId && Math.round(salePercent) === 15 ? ">15% OFF" : `${Math.round(salePercent)}% OFF`}
                        </span>}
                      </div>
                    </div>
                    {!item.customKitGroupId && item.kitOption && <label className="pugpep-drawer-meta">
                      <input type="checkbox" checked={item.purchaseType === "kit"} disabled={item.purchaseType === "kit" ? !item.singleOption : item.kitOption.status === "out of stock"
                        || (item.kitOption.maxAvailable != null && item.kitOption.maxAvailable < 10 && item.kitOption.status !== "pre-sale")}
                        onChange={(event) => setPurchaseType(index, event.target.checked ? "kit" : "single")} /> Kit (10 vials)
                    </label>}
                    <div className="pugpep-drawer-controls">
                      <div className="pugpep-drawer-quantity">
                        <button className="pugpep-cart-step" type="button" disabled={item.quantity <= 1 && (item.purchaseType !== "kit" || !item.singleOption)} aria-label={`Decrease ${item.name} ${item.dosage} ${unitLabel} quantity`}
                          onClick={() => updateQuantity(index, item.quantity - 1)}>−</button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button className="pugpep-cart-step" type="button" aria-label={`Increase ${item.name} ${item.dosage} ${unitLabel} quantity`}
                          onClick={() => updateQuantity(index, item.quantity + 1)}>+</button>
                      </div>
                      <div className="pugpep-drawer-line-price" aria-live="polite" aria-atomic="true">
                        {lineTotal < quote.originalTotal && <del>${quote.originalTotal.toFixed(2)}</del>}
                        <strong>${lineTotal.toFixed(2)}</strong>
                      </div>
                      <button className="pugpep-drawer-remove" type="button" onClick={() => removeFromCart(index)}
                        aria-label={`Remove ${item.name} ${item.dosage} from cart`}>Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>}
        </div>
        <div className="pugpep-drawer-footer">
          <dl className="pugpep-drawer-totals">
            <div><dt>Subtotal</dt><dd>${((merchandiseCents + kitSavingsCents) / 100).toFixed(2)}</dd></div>
            {kitSavingsCents > 0 && <div><dt>Custom Kit Savings (15%)</dt><dd>−${(kitSavingsCents / 100).toFixed(2)}</dd></div>}
            <div><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
            <div className="pugpep-drawer-total"><dt>Estimated total</dt><dd aria-live="polite">${(merchandiseCents / 100).toFixed(2)}</dd></div>
          </dl>
          {cart.length > 0 && <Link href="/checkout" onClick={(event) => { void handleCheckout(event); }} className="pugpep-drawer-cta">Proceed to Checkout</Link>}
          <Link href="/cart" onClick={closeCart} className="pugpep-drawer-view">View Full Cart</Link>
        </div>
      </section>
    </div>}
  </>;
}

function NavLink({

  href,

  label,

  closeHeader,

}: {

  href: string;

  label: string;

  closeHeader: () => void;

}) {

  return (

    <Link

      href={href}

      style={navLink}

      onClick={closeHeader}

    >

      {label}

    </Link>

  );

}

function MobileNavLink({

  href,

  label,

  setMenuOpen,

}: {

  href: string;

  label: string;

  setMenuOpen: (

    open: boolean

  ) => void;

}) {

  return (

    <Link

      href={href}

      style={mobileNavLink}

      onClick={() =>

        setMenuOpen(false)

      }

    >

      {label}

    </Link>

  );

}

const bodyStyle = {

  margin: 0,

  minHeight: "100vh",

  background: "#000000",

  color: "#ffffff",

};

const announcementHeight = 34;

const activationStrip = {

  position:

    "fixed" as const,

  zIndex: 100000,

  top: announcementHeight,

  left: 0,

  width: "100%",

  height: 14,

  cursor: "default",

  background:

    "linear-gradient(180deg, rgba(0,217,255,.20), rgba(0,0,0,0))",

};

const activationGlow = {

  position:

    "absolute" as const,

  top: 0,

  left: "50%",

  width: 180,

  height: 3,

  transform:

    "translateX(-50%)",

  borderRadius: 999,

  background:

    "linear-gradient(90deg, transparent, #00d9ff, #ff45d8, transparent)",

  boxShadow:

    "0 0 12px rgba(0,217,255,.55)",

};

const headerShell = {

  position:

    "fixed" as const,

  zIndex: 99999,

  top: announcementHeight,

  left: 0,

  width: "100%",

  boxSizing:

    "border-box" as const,

  boxShadow:

    "0 18px 40px rgba(0,0,0,.34)",

};

const navStyle = {

  width: "100%",

  minHeight: 72,

  display: "flex",

  alignItems: "center",

  justifyContent:

    "space-between",

  gap: 20,

  padding: "14px 24px",

  boxSizing:

    "border-box" as const,

  borderBottom:

    "1px solid rgba(255,255,255,.09)",

  background:

    "rgba(0,0,0,.90)",

  backdropFilter:

    "blur(12px)",

};

const logoText = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  lineHeight: 1,
};

const headerLogoImage = {
  display: "block",
  width: "clamp(145px, 17vw, 220px)",
  height: "auto",
  maxHeight: 48,
  objectFit: "contain" as const,
};

const navLinks = {

  display: "flex",

  flexWrap: "wrap" as const,

  gap: "0 clamp(10px, 1.35vw, 20px)",

  alignItems: "center",

  justifyContent:

    "center",

};

const navLink = {

  minHeight: 42,

  display: "grid",

  placeItems: "center",

  color: "#ffffff",

  textDecoration: "none",

  fontWeight: 900,

  fontSize: "clamp(18px, 1.65vw, 20px)",

  letterSpacing: 0.6,

};

const rightNav = {

  display: "flex",

  gap: 14,

  alignItems: "center",

};

const floatingCart = {

  position:

    "sticky" as const,

  zIndex: 100001,

  top: 14,

  width: "max-content",

  maxWidth: "calc(100vw - 36px)",

  minWidth: 0,

  minHeight: 0,

  marginLeft: "auto",

  marginRight: 18,

  marginTop: 14,

  marginBottom: 10,

  placeItems: "center",

  padding: 0,

  border: "none",

  borderRadius: 0,

  background: "transparent",

  boxShadow: "none",

  backdropFilter: "none",

};

const mobileMenuButton = {

  background: "#111111",

  color: "#00d9ff",

  border:

    "1px solid #00d9ff",

  borderRadius: 8,

  padding: "8px 12px",

  fontSize: 22,

  lineHeight: 1,

  cursor: "pointer",

};

const mobileDropdown = {

  gap: 0,

  borderBottom:

    "1px solid rgba(255,45,210,.35)",

  background:

    "rgba(0,0,0,.98)",

  boxShadow:

    "0 12px 24px rgba(0,217,255,.14)",

};

const mobileNavLink = {

  color: "#ffffff",

  textDecoration: "none",

  fontWeight: 900,

  fontSize: 16,

  letterSpacing: 1,

  padding: "16px 20px",

  borderBottom:

    "1px solid #222222",

};

const topTicker = {

  position: "fixed" as const,
  zIndex: 100001,
  top: 0,
  left: 0,
  height: announcementHeight,
  boxSizing: "border-box" as const,
  width: "100%",

  overflow: "hidden",

  borderBottom:

    "1px solid rgba(41,168,242,.27)",

  background:

    "#080d16",

  color: "#ffffff",

  fontWeight: 900,

  fontSize: 14,

  lineHeight: "21px",
  letterSpacing: 1,

  whiteSpace:

    "nowrap" as const,

};

const tickerTrack = {

  display: "inline-flex",

  gap: 50,

  padding: "6px 0",

  animation:

    "tickerScroll 20s linear infinite",

  willChange:

    "transform",

};

const logoArea = {

  display: "flex",

  flexDirection:

    "column" as const,

  alignItems:

    "flex-start",

  gap: 2,

};

const emailText = {

  maxWidth: 180,

  color: "#00d9ff",

  fontSize: 11,

  opacity: 0.85,

  wordBreak:

    "break-all" as const,

};
