"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CUSTOM_KIT_VIAL_COUNT, useCart } from "../cartContext";
import type { CustomKitCartLine } from "../cartContext";
import { quoteCustomKitMerchandise } from "../../lib/pricing/pricingEngine";
import { createClient } from "../../lib/supabaseClient";
import { calculateHeroSavingsCents, useHeroSavingsRate } from "../../lib/pricing/useHeroSavings";

type KitOption = {
  id: string;
  name: string;
  slug: string;
  image: string;
  dosage: string;
  price: number;
  stock: number;
  manualSalePercent: number;
};

type Selection = Record<string, number>;
type ProductDraft = { optionId: string; quantity: number };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const stockKey = (slug: string, dosage: string) => JSON.stringify([slug, dosage]);

async function loadKitOptions(supabase: ReturnType<typeof createClient>) {
  const { data: options, error } = await supabase.from("product_options")
    .select("id, product_slug, dosage, price, sale_active, sale_percent")
    .eq("custom_kit_eligible", true)
    .eq("purchase_type", "single")
    .eq("status", "in stock")
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) throw error;
  if (!options?.length) return [];

  const slugs = Array.from(new Set(options.map((option) => option.product_slug)));
  const [products, inventory] = await Promise.all([
    supabase.from("products")
      .select("slug, name, image, is_coming_soon")
      .in("slug", slugs).eq("is_active", true).is("deleted_at", null),
    supabase.from("inventory")
      .select("product_slug, dosage, quantity")
      .in("product_slug", slugs).eq("purchase_type", "single").eq("status", "in stock"),
  ]);

  if (products.error) throw products.error;
  if (inventory.error) throw inventory.error;

  const productBySlug = new Map((products.data ?? []).map((product) => [product.slug, product]));
  const stockByOption = new Map<string, number>();
  for (const row of inventory.data ?? []) {
    const key = stockKey(row.product_slug, row.dosage);
    // Ambiguous inventory rows are excluded, as in checkout pricing.
    stockByOption.set(key, stockByOption.has(key) ? 0 : Number(row.quantity));
  }

  return options.flatMap((option): KitOption[] => {
    const product = productBySlug.get(option.product_slug);
    const stock = stockByOption.get(stockKey(option.product_slug, option.dosage)) ?? 0;
    const price = Number(option.price);
    if (!product || product.is_coming_soon || !Number.isSafeInteger(stock) || stock < 1 ||
        option.price == null || !Number.isFinite(price) || price < 0) return [];

    return [{
      id: option.id,
      name: product.name,
      slug: product.slug,
      image: product.image ?? "",
      dosage: option.dosage,
      price,
      stock,
      manualSalePercent: option.sale_active ? Math.min(100, Math.max(0, Number(option.sale_percent) || 0)) : 0,
    }];
  }).sort((a, b) =>
    a.name.localeCompare(b.name) || a.dosage.localeCompare(b.dosage, undefined, { numeric: true })
  );
}

const saleBadgePercent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function higherSalePercent(regular: number, discount: number) {
  if (regular <= 0 || !Number.isFinite(discount) || discount > regular) return 0;
  return discount * 100 > regular * 15 ? discount / regular * 100 : 0;
}

function changeKitQuantity(
  selection: Selection,
  optionId: string,
  change: number,
  available: number
): Selection {
  const previous = selection[optionId] ?? 0;
  if (change > 0) {
    const count = Object.values(selection).reduce((total, quantity) => total + quantity, 0);
    change = Math.min(change, CUSTOM_KIT_VIAL_COUNT - count, available - previous);
    if (change <= 0) return selection;
  }

  const quantity = Math.max(0, previous + change);
  if (quantity === previous) return selection;
  const updated = { ...selection };
  if (quantity === 0) delete updated[optionId];
  else updated[optionId] = quantity;
  return updated;
}

export default function CreateCustomKitPage() {
  const router = useRouter();
  const { cart, addCustomKit } = useCart();
  const supabase = useMemo(() => createClient(), []);
  const heroRate = useHeroSavingsRate(supabase);
  const submitting = useRef(false);
  const [options, setOptions] = useState<KitOption[]>([]);
  const [selection, setSelection] = useState<Selection>({});
  const [quote, setQuote] = useState<{
    items: Record<string, number>;
    subtotalCents: number;
    regularCents: number;
    saleByOption: Record<string, number>;
  } | null>(null);
  const [failedQuote, setFailedQuote] = useState<Record<string, number> | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [catalogSales, setCatalogSales] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    loadKitOptions(supabase)
      .then((next) => { if (active) setOptions(next); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [supabase, loadAttempt]);

  useEffect(() => {
    if (!options.length) return;
    let active = true;
    let cursor = 0;
    const controller = new AbortController();
    const sales: Record<string, number> = {};

    async function loadSales() {
      while (active && cursor < options.length) {
        const option = options[cursor++];
        const manualDiscount = option.price * option.manualSalePercent / 100;
        let discount = manualDiscount;

        try {
          const { data, error } = await supabase.rpc("get_product_option_campaign_price", {
            p_product_option_id: option.id,
          }).abortSignal(controller.signal);
          const campaign = Array.isArray(data) ? data[0] : data;
          const salePrice = campaign?.sale_unit_price;
          if (!error && campaign?.has_campaign && salePrice != null &&
              Number.isFinite(Number(salePrice)) && Number(salePrice) >= 0) {
            discount = Math.max(discount, option.price - Number(salePrice));
          }
        } catch {
          // A catalog offer lookup must not prevent kit selection.
        }
        sales[option.id] = higherSalePercent(option.price, discount);
      }
    }

    void Promise.all(Array.from({ length: Math.min(options.length, 6) }, loadSales)).then(() => {
      if (active) setCatalogSales(sales);
    });
    return () => { active = false; controller.abort(); };
  }, [options, supabase]);

  const cartStock = new Map<string, number>();
  for (const item of cart) {
    const key = stockKey(item.slug, item.dosage);
    cartStock.set(key, (cartStock.get(key) ?? 0) + item.quantity * (item.purchaseType === "kit" ? 10 : 1));
  }
  const remainingStock = (option: KitOption) =>
    Math.max(0, option.stock - (cartStock.get(stockKey(option.slug, option.dosage)) ?? 0));

  const searchText = search.trim().toLowerCase();
  const products = new Map<string, KitOption[]>();
  for (const option of options) {
    if (!option.name.toLowerCase().includes(searchText)) continue;
    const strengths = products.get(option.slug) ?? [];
    strengths.push(option);
    products.set(option.slug, strengths);
  }
  const count = Object.values(selection).reduce((sum, value) => sum + value, 0);
  const remaining = CUSTOM_KIT_VIAL_COUNT - count;
  const lines = options.filter((option) => selection[option.id] > 0);
  const regularEstimate = lines.reduce((sum, line) =>
    sum + Math.round(line.price * selection[line.id] * 100), 0);
  const currentQuote = quote?.items === selection ? quote : null;
  const quoteFailed = failedQuote === selection;
  const regularCents = currentQuote?.regularCents ?? regularEstimate;
  const savingsCents = currentQuote ? Math.max(0, regularCents - currentQuote.subtotalCents) : 0;
  const kitSubtotalCents = currentQuote?.subtotalCents ?? regularCents;
  const heroSavingsCents = currentQuote ? calculateHeroSavingsCents(kitSubtotalCents, heroRate) : 0;
  const savingsPercent = regularCents > 0
    ? saleBadgePercent.format(savingsCents / regularCents * 100)
    : "0";
  const selectionAvailable = lines.every((line) => selection[line.id] <= remainingStock(line)) &&
    lines.reduce((sum, line) => sum + selection[line.id], 0) === count;

  useEffect(() => {
    const items = Object.entries(selection).map(([productOptionId, quantity]) => ({ productOptionId, quantity }));
    if (!items.length) return;
    let active = true;
    const timer = setTimeout(() => {
      void quoteCustomKitMerchandise(supabase, items).then((result) => {
        if (!active) return;
        setFailedQuote(null);
        setQuote({
          items: selection,
          saleByOption: Object.fromEntries(result.items.map((line) => [
            line.productOptionId,
            higherSalePercent(line.regularLineValue, line.saleDiscountAmount),
          ])),
          regularCents: Math.round(result.regularMerchandiseValue * 100),
          subtotalCents: Math.round(result.campaignMerchandiseRevenue * 100),
        });
      }).catch(() => {
        if (active) setFailedQuote(selection);
      });
    }, 150);
    return () => { active = false; clearTimeout(timer); };
  }, [selection, supabase, quoteAttempt]);

  function editSelection(option: KitOption, change: number) {
    if (submitting.current) return;
    const available = remainingStock(option);
    setSelection((current) => changeKitQuantity(current, option.id, change, available));
    setNotice("");
  }

  function addSelection(option: KitOption, quantity: number) {
    if (submitting.current || quantity < 1) return;
    editSelection(option, quantity);
    setDrafts((current) => ({
      ...current,
      [option.slug]: { optionId: option.id, quantity: 0 },
    }));
  }

  async function addKitToCart() {
    if (remaining !== 0 || !selectionAvailable || submitting.current) return;
    submitting.current = true;
    setAdding(true);
    setNotice("");

    let freshOptions: KitOption[] | undefined;
    try {
      freshOptions = await loadKitOptions(supabase);
      const freshById = new Map(freshOptions.map((option) => [option.id, option]));
      const kitLines: CustomKitCartLine[] = lines.map((line) => {
        const fresh = freshById.get(line.id);
        if (!fresh || selection[line.id] > remainingStock(fresh)) {
          throw new Error(`${line.name} ${line.dosage} no longer has enough stock. Edit your kit and try again.`);
        }
        if (fresh.price !== line.price) {
          throw new Error("A price changed. Review the updated kit subtotal before adding it to your cart.");
        }
        return {
          productOptionId: fresh.id,
          name: fresh.name,
          slug: fresh.slug,
          image: fresh.image,
          dosage: fresh.dosage,
          quantity: selection[line.id],
          status: "in stock",
          maxAvailable: fresh.stock,
          price: fresh.price,
          regularPrice: fresh.price,
          salePrice: fresh.price,
          wasOnSale: false,
          salePercent: 0,
        };
      });
      addCustomKit(kitLines);
      router.push("/cart");
      return;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add your kit. Please try again.");
      // Keep selections visible so the shopper can remove an unavailable vial.
      if (freshOptions) {
        const current = new Map(freshOptions.map((option) => [option.id, option]));
        for (const line of lines) {
          if (!current.has(line.id)) current.set(line.id, { ...line, stock: 0 });
        }
        setOptions(Array.from(current.values()));
      }
      submitting.current = false;
      setAdding(false);
    }
  }

  return (
    <main className="kit-page">
      <h1 className="kit-banner">
        <img src="/create-a-kit-banner.png" width={2172} height={724} alt="Create a Kit" />
      </h1>
      <Link href="/">Back to catalog</Link>
      <p>Choose {CUSTOM_KIT_VIAL_COUNT} eligible vials. Eligible sales above 15% apply to those vials. Once the kit is complete, the remaining vials get 15% off.</p>

      {loading && <p role="status">Loading eligible vials…</p>}
      {loadError && <p role="alert">
        Unable to load eligible vials.{" "}
        <button type="button" onClick={() => {
          setLoadError(false);
          setLoading(true);
          setLoadAttempt((attempt) => attempt + 1);
        }}>Try again</button>
      </p>}
      {!loading && !loadError && options.length === 0 && <p>No custom-kit options are currently in stock.</p>}

      {!loading && !loadError && options.length > 0 && <div className="kit-grid">
        <section className="kit-panel" aria-labelledby="kit-select-heading">
          <h2 id="kit-select-heading">Select vials</h2>
          <label htmlFor="kit-search">Search products</label>
          <input id="kit-search" type="search" value={search}
            onChange={(event) => setSearch(event.target.value)} />
          {products.size === 0 && <p>No matching products.</p>}
          <p className="kit-stock-note kit-offer-note">Yellow badges indicate sale offers. Bundle &amp; Save quantity discounts do not apply to custom kits.</p>
          <div className="kit-products">
            {Array.from(products, ([slug, strengths]) => {
              const product = strengths[0];
              const draft = drafts[slug];
              const selected = strengths.find((option) => option.id === draft?.optionId) ?? product;
              const max = Math.max(0, Math.min(remaining, remainingStock(selected) - (selection[selected.id] ?? 0)));
              const quantity = Math.min(draft?.optionId === selected.id ? draft.quantity : 0, max);
              const label = `${product.name} ${selected.dosage}`;
              const selectedQuantity = selection[selected.id] ?? 0;
              const offerPercent = selectedQuantity > 0
                ? currentQuote?.saleByOption[selected.id] ?? 0
                : quantity > 1 ? 0 : catalogSales[selected.id] ?? 0;

              return <article key={slug} className="kit-product">
                <div className="kit-product-media" aria-hidden="true">
                  {product.image && <img src={product.image} alt="" loading="lazy" />}
                </div>
                <div className="kit-product-body">
                  <div className="kit-product-header">
                    <h3>{product.name}</h3>
                    <div className="kit-product-price">
                      <span className="kit-vial-price">{money.format(selected.price)} / vial</span>
                      {offerPercent > 0 && <span className="kit-sale-badge"
                        title={selectedQuantity > 0 ? "Sale applied to your selection" : "Catalog offer. Campaign minimums and eligibility may apply."}>
                        {Math.round(offerPercent) === 15 ? ">15% OFF" : `${saleBadgePercent.format(offerPercent)}% OFF`}
                      </span>}
                    </div>
                  </div>
                  <div className="kit-product-controls">
                    <div className="kit-strengths" role="group" aria-label={`${product.name} strengths`}>
                      {strengths.map((option) => (
                        <button type="button" key={option.id} aria-pressed={selected.id === option.id}
                          disabled={adding} onClick={() => {
                            if (selected.id === option.id) return;
                            setDrafts((current) => ({
                              ...current,
                              [slug]: { optionId: option.id, quantity: 0 },
                            }));
                          }}>
                          {option.dosage}
                        </button>
                      ))}
                    </div>
                    <div className="kit-quantity-actions">
                      <div className="kit-stepper" role="group" aria-label={`Quantity for ${label}`}>
                        <button type="button" aria-label={`Decrease ${label} quantity`} disabled={adding || quantity === 0}
                          onClick={() => setDrafts((current) => ({
                            ...current,
                            [slug]: { optionId: selected.id, quantity: quantity - 1 },
                          }))}>−</button>
                        <output aria-label={`${label} quantity`}>{quantity}</output>
                        <button type="button" aria-label={`Increase ${label} quantity`} disabled={adding || quantity >= max}
                          onClick={() => setDrafts((current) => ({
                            ...current,
                            [slug]: { optionId: selected.id, quantity: quantity + 1 },
                          }))}>+</button>
                      </div>
                      <button type="button" className="kit-add" aria-label={`Add ${label} to kit`}
                        disabled={adding || quantity === 0} onClick={() => addSelection(selected, quantity)}>Add</button>
                    </div>
                  </div>
                  {remaining > 0 && max === 0 && <p className="kit-stock-note">No more vials available at this strength.</p>}
                </div>
              </article>;
            })}
          </div>
        </section>

        <section className="kit-panel kit-summary" aria-labelledby="kit-summary-heading">
          <h2 id="kit-summary-heading">Your custom kit</h2>
          <p role="status">{count} of {CUSTOM_KIT_VIAL_COUNT} vials selected</p>
          <progress max={CUSTOM_KIT_VIAL_COUNT} value={count} aria-label="Vials selected" />
          {lines.length === 0 && <p>No vials added yet.</p>}
          {lines.length > 0 && <ul>
            {lines.map((line) => {
              const quantity = selection[line.id];
              const available = remainingStock(line);
              const label = `${line.name} ${line.dosage}`;
              const appliedSale = currentQuote?.saleByOption[line.id] ?? 0;
              return <li key={line.id} className="kit-review-line">
                <div className="kit-review-details">
                  <strong>{line.name} · {line.dosage}</strong>
                  {appliedSale > 0 && <span className="kit-sale-badge kit-review-sale">
                    {Math.round(appliedSale) === 15 ? ">15% OFF" : `${saleBadgePercent.format(appliedSale)}% OFF`}
                  </span>}
                  <div>{money.format(line.price)} / vial</div>
                  {quantity > available && <div className="kit-stock-note">Insufficient stock</div>}
                </div>
                <strong className="kit-line-total">{money.format(line.price * quantity)}</strong>
                <div className="kit-review-controls">
                  <div className="kit-stepper" role="group" aria-label={`Kit quantity for ${label}`}>
                    <button type="button" disabled={adding}
                      aria-label={`Decrease ${label} in kit`} onClick={() => editSelection(line, -1)}>−</button>
                    <output aria-label={`Vials of ${label} in kit`}>{quantity}</output>
                    <button type="button" disabled={adding || remaining === 0 || quantity >= available}
                      aria-label={`Increase ${label} in kit`} onClick={() => editSelection(line, 1)}>+</button>
                  </div>
                  <button type="button" disabled={adding} aria-label={`Remove all ${label} from kit`}
                    onClick={() => editSelection(line, -quantity)}>Remove</button>
                </div>
              </li>;
            })}
          </ul>}
          <dl>
            <div><dt>Regular subtotal</dt><dd>{money.format(regularCents / 100)}</dd></div>
            <div>
              <dt>Kit and sale savings{currentQuote ? ` (${savingsPercent}%)` : ""}</dt>
              <dd>{currentQuote || !count ? money.format(savingsCents / 100) : "—"}</dd>
            </div>
            {heroSavingsCents > 0 && (
              <div>
                <dt>Hero Savings ({heroRate}%)</dt>
                <dd>−{money.format(heroSavingsCents / 100)}</dd>
              </div>
            )}
            <div className="kit-estimated-total">
              <dt>Estimated kit subtotal</dt>
              <dd>{currentQuote || !count ? money.format((kitSubtotalCents - heroSavingsCents) / 100) : "—"}</dd>
            </div>
          </dl>
          {count > 0 && !currentQuote && !quoteFailed && <p role="status">Checking sale prices…</p>}
          {quoteFailed && <p role="status">
            Unable to check sale prices.{" "}
            <button type="button" onClick={() => {
              setFailedQuote(null);
              setQuoteAttempt((attempt) => attempt + 1);
            }}>Retry pricing</button>
          </p>}
          {remaining > 0 && <p className="kit-stock-note">
            Add {remaining} more {remaining === 1 ? "vial" : "vials"} to qualify for kit savings.
          </p>}
          {notice && <p role="alert">{notice}</p>}
          <button className="kit-primary" type="button" disabled={remaining !== 0 || !selectionAvailable || adding}
            onClick={() => { void addKitToCart(); }}>
            {adding ? "Adding kit…" : "Add custom kit to cart"}
          </button>
        </section>
      </div>}

      <style jsx>{`
        .kit-page {
          --kit-cyan: #00d9ff;
          --kit-text: #f0f2f4;
          --kit-muted: #b4b4bc;
          --kit-divider: rgba(255, 255, 255, .12);
          box-sizing: border-box; width: 100%; max-width: 1660px; margin: 0 auto;
          padding: 72px clamp(14px, 2.5vw, 40px) 48px; color: var(--kit-text);
          font-size: clamp(16px, 1.3vw, 19px); line-height: 1.45;
        }
        .kit-page > :global(a) { color: var(--kit-cyan); }
        .kit-banner {
          box-sizing: border-box;
          width: 100%;
          margin: 0 0 16px;
          overflow: hidden;
          border: 1px solid var(--kit-divider);
          border-radius: 14px;
          background: #0d0d10;
        }
        .kit-banner img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 1; object-fit: cover; }
        .kit-page > p { max-width: 68ch; color: var(--kit-muted); }
        .kit-grid {
          display: grid; grid-template-columns: minmax(0, 2.15fr) minmax(290px, 1fr);
          gap: clamp(14px, 2vw, 28px); margin-top: 24px; align-items: start;
        }
        .kit-panel {
          min-width: 0; background: #0d0d10; border: 1px solid var(--kit-divider);
          border-radius: 14px; padding: clamp(14px, 1.7vw, 26px);
        }
        .kit-summary {
          border-color: rgba(255, 47, 208, .52);
          background: linear-gradient(145deg, rgba(16, 7, 18, .96), rgba(5, 12, 16, .96));
          box-shadow: 0 0 24px rgba(255, 47, 208, .11);
        }
        h2 { margin-top: 0; font-size: clamp(22px, 2.25vw, 32px); line-height: 1.2; }
        .kit-products { display: grid; gap: 12px; }
        .kit-product {
          display: grid; grid-template-columns: clamp(96px, 9vw, 142px) minmax(0, 1fr);
          gap: clamp(10px, 1.35vw, 20px); border: 1px solid var(--kit-divider); border-radius: 12px; padding: 12px; background: #141418;
        }
        .kit-product-media { position: relative; min-height: clamp(96px, 9vw, 142px); }
        .kit-product-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; border-radius: 8px; }
        .kit-product-body { display: grid; align-content: center; gap: 10px; min-width: 0; }
        .kit-product-header, .kit-product-controls, .kit-strengths, .kit-quantity-actions, .kit-stepper {
          display: flex; align-items: center; gap: 8px;
        }
        .kit-product-header { flex-wrap: wrap; }
        .kit-product-header h3 {
          flex: 1 1 12ch; min-width: 0; margin: 0; font-size: clamp(19px, 1.7vw, 25px);
          line-height: 1.2; overflow-wrap: anywhere;
        }
        .kit-product-price { display: flex; align-items: center; flex-wrap: wrap; gap: 5px 8px; }
        .kit-sale-badge {
          display: inline-block; border-radius: 7px; padding: 5px 8px;
          background: #d3ff69; color: #182000; font-size: 13px;
          font-weight: 850; line-height: 1.2; white-space: nowrap;
          box-shadow: 0 2px 8px #0002;
        }
        .kit-review-sale { margin-inline-start: 8px; }
        .kit-offer-note { margin-bottom: 12px; }
        .kit-vial-price { white-space: nowrap; font-size: clamp(16px, 1.45vw, 21px); font-weight: 700; }
        .kit-product-controls { flex-wrap: wrap; justify-content: space-between; }
        .kit-strengths { flex: 1 1 auto; min-width: 0; flex-wrap: wrap; }
        .kit-strengths button { white-space: nowrap; }
        .kit-strengths button[aria-pressed="true"] {
          background: rgba(0, 217, 255, .12); border-color: var(--kit-cyan); color: #7df9ff;
        }
        .kit-quantity-actions { flex-wrap: wrap; max-width: 100%; }
        .kit-stepper { flex: none; gap: 4px; }
        .kit-stepper output { min-width: 2ch; text-align: center; font-variant-numeric: tabular-nums; }
        .kit-stepper button {
          min-width: 44px; padding-inline: 6px;
          border-color: var(--kit-cyan); background: rgba(0, 217, 255, .06); color: #7df9ff;
        }
        .kit-product-controls .kit-add { background: var(--kit-cyan); border-color: var(--kit-cyan); color: #081219; font-weight: 700; }
        .kit-stock-note { margin: 0; font-size: .9em; color: var(--kit-muted); }
        label { display: block; margin-bottom: 6px; font-weight: 600; }
        input { display: block; box-sizing: border-box; width: 100%; margin-bottom: 16px; }
        input, button { background: #111; color: var(--kit-text); border: 1px solid #66666e; border-radius: 8px; padding: 8px 12px; min-height: 44px; font: inherit; }
        button { cursor: pointer; }
        button:disabled { opacity: .55; cursor: default; }
        .kit-page > :global(a:focus-visible), input:focus-visible, button:focus-visible {
          outline: 2px solid var(--kit-cyan); outline-offset: 2px;
        }
        progress { width: 100%; accent-color: var(--kit-cyan); }
        ul { list-style: none; margin: 14px 0; padding: 0; }
        dl > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; }
        .kit-review-line {
          display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start;
          gap: 8px 12px; padding: 12px 0; border-bottom: 1px solid var(--kit-divider);
        }
        .kit-review-details { overflow-wrap: anywhere; }
        .kit-line-total { white-space: nowrap; }
        .kit-review-controls { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px 12px; }
        .kit-estimated-total { border-top: 1px solid var(--kit-divider); font-weight: 700; }
        dd { margin: 0; white-space: nowrap; }
        .kit-primary {
          width: 100%; font-weight: 700; border-color: transparent;
          background: linear-gradient(90deg, #00b7ff, #ff2fd0); color: #0b0b0d;
        }
        @media (max-width: 900px) {
          .kit-grid { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 520px) {
          .kit-page { padding-inline: 12px; }
          .kit-panel { padding: 12px; }
          .kit-product { grid-template-columns: clamp(62px, 19vw, 94px) minmax(0, 1fr); padding: 9px; }
          .kit-product-media { min-height: 94px; }
          .kit-product-header { gap: 4px 8px; }
          .kit-product-header h3 { flex-basis: 100%; }
          .kit-product-body { gap: 8px; }
          .kit-strengths button { padding-inline: 8px; }
          .kit-quantity-actions { gap: 6px; }
          .kit-quantity-actions .kit-add { padding-inline: 8px; }
        }
      `}</style>
    </main>
  );
}
