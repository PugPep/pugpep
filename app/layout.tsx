"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabaseClient";

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

export default function RootLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  const [

    menuOpen,

    setMenuOpen,

  ] = useState(false);

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

          @media (max-width: 800px) {

            .topActivationStrip {

              display: none !important;

            }

            .siteHeaderShell {

              position: sticky !important;

              transform: none !important;

              transition: none !important;

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

            .siteNav {

              padding: 12px 14px !important;

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

            className={`siteHeaderShell${

              desktopHeaderOpen

                ? " open"

                : ""

            }`}

            style={headerShell}

            onMouseEnter={

              openDesktopHeader

            }

            onMouseLeave={

              scheduleDesktopHeaderClose

            }

          >

            <div style={topTicker}>

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

            <nav

              className="siteNav"

              style={navStyle}

              aria-label="Primary navigation"

            >

              <div style={logoArea}>

                <Link

                  href="/"

                  style={logoText}

                  onClick={() => {

                    setMenuOpen(false);

                    closeDesktopHeaderImmediately();

                  }}

                >

                  <span

                    style={logoGradient}

                  >

                    PUGPEP

                  </span>

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

              <div style={rightNav}>

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

          <FloatingCart

            headerOpen={

              desktopHeaderOpen

            }

          />

          {children}

        </CartProvider>

      </body>

    </html>

  );

}

function FloatingCart({ headerOpen }: { headerOpen: boolean }) {
  const { cart, total, updateQuantity, removeFromCart, setPurchaseType } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      .pugpep-cart-panel button:focus-visible, .pugpep-cart-panel a:focus-visible, .pugpep-cart-trigger:focus-visible { outline:3px solid #ff75df; outline-offset:3px; }
      @media(max-width:800px) { .pugpep-cart-trigger { display:none !important; } }
      .pugpep-cart-step { width:28px; height:30px; border:1px solid #454956; background:#242733; color:#fff; border-radius:6px; cursor:pointer; font-size:16px; }
      .pugpep-cart-step:disabled { opacity:.4; cursor:default; }
    `}</style>
    {!headerOpen && <button ref={triggerRef} type="button" className="pugpep-cart-trigger" aria-expanded={open} aria-controls="pugpep-cart-panel"
      aria-label={`Open cart: ${count} items, $${total.toFixed(2)}`}
      onClick={() => { returnFocusRef.current = triggerRef.current; setOpen(true); }}
      style={{ position:"fixed", right:24, top:18, zIndex:100001, padding:"8px 12px", borderRadius:10,
        border:0, background:"linear-gradient(90deg, #00b7ff, #ff2fd0)", color:"#fff", fontWeight:"bold", cursor:"pointer",
        whiteSpace:"nowrap", boxShadow:"0 5px 20px #0006" }}>
      🛒 {count} | ${total.toFixed(2)}
    </button>}
    {open && <div style={{ position:"fixed", inset:0, zIndex:100010, background:"rgba(0,0,0,.65)" }}
      onClick={(event) => { if (event.target === event.currentTarget) closeCart(); }}>
      <section id="pugpep-cart-panel" ref={panelRef} tabIndex={-1} className="pugpep-cart-panel" role="dialog" aria-modal="true" aria-labelledby="pugpep-cart-title"
        style={{ position:"absolute", right:0, top:0, bottom:0, width:"min(420px, 100%)", display:"flex", flexDirection:"column",
          background:"#14161e", color:"#fff", boxShadow:"-12px 0 35px #0005", boxSizing:"border-box" }}>
        <div style={{ padding:16, display:"flex", alignItems:"center", gap:8 }}>
          <h2 id="pugpep-cart-title" style={{ margin:0, fontSize:18, flexShrink:0, whiteSpace:"nowrap" }}>Your Cart ({count})</h2>
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
              style={{ width:"100%", boxSizing:"border-box", minWidth:0, height:32, border:"1px solid #454956", borderRadius:7,
                padding:"0 8px", background:"#20232e", color:"#fff", fontSize:11 }} />
            {showSearchResults && <div id="cart-product-results" role="listbox" aria-label="Matching products"
              style={{ position:"absolute", right:0, top:"calc(100% + 6px)", width:"min(300px, calc(100vw - 40px))", maxHeight:300,
                overflowY:"auto", zIndex:2, background:"#20232e", border:"1px solid #454956", borderRadius:8, boxShadow:"0 8px 24px #0006" }}>
              {searchMatches.length > 0 ? searchMatches.map((item, index) => <button key={item.id} id={`cart-product-result-${index}`}
                type="button" role="option" aria-selected={activeResult === index} onClick={() => openSearchProduct(item.slug)}
                style={{ display:"flex", width:"100%", alignItems:"center", gap:8, padding:10, border:0, borderBottom:"1px solid #363b48",
                  background:activeResult === index ? "#344252" : "transparent", color:"#fff", textAlign:"left", fontSize:13, cursor:"pointer" }}>
                <img src={item.image || "/pugpep-logo.png"} alt="" style={{ width:32, height:38, objectFit:"contain", background:"#fff", borderRadius:4 }} />
                <span>{item.name}</span>
              </button>) : <p role="status" style={{ margin:0, padding:12, color:"#b7bed0", fontSize:12 }}>
                {searchLoading ? "Loading products…" : searchError ? "Product search is temporarily unavailable." : "No matching products."}
              </p>}
            </div>}
          </div>
          <button type="button" onClick={closeCart} aria-label="Close cart" style={{ flexShrink:0, background:"transparent", color:"#fff", border:0, padding:0, fontSize:28, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>
          {cart.length === 0 ? <p style={{ color:"#b7bed0" }}>Your cart is empty.</p> : cart.map((item, index) => { const quote = getCartItemTotals(item); return <article key={`${item.productOptionId || item.slug}-${item.dosage}-${item.purchaseType}-${index}`}
            style={{ display:"flex", gap:12, padding:"16px 0", borderTop:"1px solid #303440" }}>
            <Link href={`/products/${item.slug}`} onClick={closeCart} aria-label={`View ${item.name}`} style={{ flexShrink:0 }}>
              <img src={item.image || "/pugpep-logo.png"} alt={item.name} style={{ width:65, height:75, objectFit:"contain", borderRadius:8, background:"#fff" }} />
            </Link>
            <div style={{ flex:1, minWidth:0 }}>
              <Link href={`/products/${item.slug}`} onClick={closeCart} style={{ color:"#fff", textDecoration:"none", fontWeight:800 }}>{item.name}</Link>
              <p style={{ color:"#b7bed0", fontSize:12, margin:"5px 0" }}>{item.dosage} · {item.purchaseType === "kit" ? "Kit (10 vials)" : "Single"}</p>
              <div aria-live="polite" aria-atomic="true" style={{ margin:"7px 0" }}>
                <div style={{ display:"flex", alignItems:"baseline", flexWrap:"wrap", gap:8 }}>
                  <strong style={{ fontSize:19 }}>${quote.total.toFixed(2)}</strong>
                  {quote.savings > 0 && <>
                    <del style={{ color:"#9da6ba", fontSize:14 }}>${quote.originalTotal.toFixed(2)}</del>
                    <span style={{ color:"#b5ff85", fontWeight:800, fontSize:13 }}>Save ${quote.savings.toFixed(2)}</span>
                  </>}
                </div>
                {quote.savings > 0 && <p style={{ color:"#b5ff85", fontSize:12, margin:"4px 0" }}>
                  {quote.percent}% {quote.compareWithSingles ? "saved vs singles" : "OFF"}
                </p>}
                {item.purchaseType === "kit" && !quote.compareWithSingles && quote.kitSavings > quote.savings &&
                  <p style={{ color:"#b7bed0", fontSize:12, margin:"4px 0" }}>Save ${quote.kitSavings.toFixed(2)} compared with {quote.vialQuantity} singles</p>}
              </div>
              {item.kitOption && <label style={{ display:"flex", alignItems:"center", gap:7, margin:"7px 0", fontSize:13 }}>
                <input type="checkbox" checked={item.purchaseType === "kit"} disabled={item.purchaseType === "kit" ? !item.singleOption : item.kitOption.status === "out of stock"
                  || (item.kitOption.maxAvailable != null && item.kitOption.maxAvailable < 10 && item.kitOption.status !== "pre-sale")}
                  onChange={(event) => setPurchaseType(index, event.target.checked ? "kit" : "single")} />
                Kit (10 vials)
              </label>}
              <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                <button className="pugpep-cart-step" type="button" disabled={item.quantity <= 1 && (item.purchaseType !== "kit" || !item.singleOption)} aria-label={`Decrease ${item.name} ${item.dosage} ${item.purchaseType} quantity`}
                  onClick={() => updateQuantity(index, item.quantity - 1)}>−</button>
                <span aria-live="polite" style={{ minWidth:22, textAlign:"center" }}>{quote.vialQuantity}</span>
                <button className="pugpep-cart-step" type="button" aria-label={`Increase ${item.name} ${item.dosage} ${item.purchaseType} quantity`}
                  onClick={() => updateQuantity(index, item.quantity + 1)}>+</button>
                <button type="button" onClick={() => removeFromCart(index)} aria-label={`Remove ${item.name} ${item.dosage} ${item.purchaseType} from cart`}
                  style={{ marginLeft:"auto", padding:"5px 0", border:0, background:"transparent", color:"#ffadb9", cursor:"pointer", fontSize:12, textDecoration:"underline" }}>Remove</button>
              </div>
              <p style={{ margin:"8px 0 0", fontSize:12, color:"#b7bed0" }}>Total for {quote.vialQuantity} {quote.vialQuantity === 1 ? "vial" : "vials"}</p>
            </div>
          </article>; })}
        </div>
        <div style={{ padding:20, borderTop:"1px solid #303440" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:18, fontWeight:800 }}><span>Subtotal</span><span aria-live="polite">${total.toFixed(2)}</span></div>
          <p style={{ color:"#a7b0c3", fontSize:12, lineHeight:1.5 }}>Final pricing, availability, discounts, and shipping are confirmed at checkout.</p>
          <div style={{ display:"flex", gap:10 }}>
            <Link href="/cart" onClick={closeCart} style={{ flex:1, textAlign:"center", padding:12, border:"1px solid #454956", borderRadius:8, color:"#fff", textDecoration:"none", fontWeight:800 }}>View Cart</Link>
            {cart.length > 0 && <Link href="/checkout" onClick={(event) => { void handleCheckout(event); }} style={{ flex:1, textAlign:"center", padding:12, borderRadius:8, background:"#7df9ff", color:"#062027", textDecoration:"none", fontWeight:800 }}>Checkout</Link>}
          </div>
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

const activationStrip = {

  position:

    "fixed" as const,

  zIndex: 100000,

  top: 0,

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

  top: 0,

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

  fontSize: 28,

  fontWeight: 900,

  letterSpacing: 2,

};

const logoGradient = {

  background:

    "linear-gradient(90deg, #00d9ff, #ff45d8, #7cff00)",

  WebkitBackgroundClip:

    "text",

  color: "transparent",

  fontWeight: 900,

  letterSpacing: 2,

  textShadow:

    "0 0 18px rgba(255,45,210,.35)",

};

const navLinks = {

  display: "flex",

  gap: 22,

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

  fontSize: 15,

  letterSpacing: 1,

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

  width: "100%",

  overflow: "hidden",

  borderBottom:

    "1px solid rgba(255,255,255,.25)",

  background:

    "linear-gradient(90deg, #ff2fd0, #00d9ff, #7cff00, #ff2fd0)",

  color: "#000000",

  fontWeight: 900,

  fontSize: 13,

  letterSpacing: 1,

  whiteSpace:

    "nowrap" as const,

};

const tickerTrack = {

  display: "inline-flex",

  gap: 50,

  padding: "8px 0",

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