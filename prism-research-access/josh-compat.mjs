// Native presentation based on Josh's October 19 2026 0.1.8.0 layout.
// Upstream ZIP SHA256 d627287d20b77f3c2b32c200b4f7de4a9158f8199ad189939c97bd40944e3211.
// Reference layout and styling are preserved; shopper-facing help uses site-specific wording.
export const JOSH_PROFILE = 'josh-20261019';
export const JOSH_SOURCE_SHA256 = 'd627287d20b77f3c2b32c200b4f7de4a9158f8199ad189939c97bd40944e3211';
const MAX_DOC = 262144;
const TEXT = { legal_name: [120, false], headline: [90, false], description: [700, true], address: [200, false], email: [120, false], phone: [40, false], hours: [60, false], fact1_title: [40, false], fact1_text: [80, false], fact2_title: [40, false], fact2_text: [80, false], fact3_title: [40, false], fact3_text: [80, false], refund_days: [3, false], processing_days: [40, false], carriers: [80, false], governing_law: [60, false] };
export const JOSH_LINKS = { url_policy: 'Research Access Policy', url_terms: 'Terms of Sale', url_privacy: 'Privacy', url_refunds: 'Refunds & Returns', url_shipping: 'Shipping' };
const scalar = value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
const cut = (value, max) => [...value].slice(0, max).join('');
const cleanText = (value, max, multiline = false) => cut(scalar(value).replace(/<[^>]*>/g, '').replace(/%[a-f0-9]{2}/gi, '').replace(multiline ? /[\t ]+/g : /[\r\n\t ]+/g, ' ').trim(), max);
// WordPress esc_html/esc_attr preserve already encoded entities; always escape literal delimiters.
export const escapeHtml = value => scalar(value).replace(/&(?!(?:#[0-9]+|#x[a-f0-9]+|[a-z][a-z0-9]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const hex = value => { const v = scalar(value).trim().toLowerCase(); return /^#[a-f0-9]{6}$/.test(v) ? v : /^#[a-f0-9]{3}$/.test(v) ? '#' + [...v.slice(1)].map(c => c + c).join('') : ''; };
const cleanCss = value => cut(scalar(value).replace(/[<\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').replace(/@import\b[^;]*;?/gi, '').trim(), 20000);
const originOf = value => { try { const u = new URL(value); return u.protocol === 'https:' && u.origin === value ? u.origin : ''; } catch { return ''; } };
export function joshSiteLink(value, origin) {
  const v = scalar(value).trim();
  if (!v || v.length > 512 || /[\s\\\x00-\x1f\x7f]/.test(v)) return '';
  if (v.startsWith('/')) return v.startsWith('//') ? '' : v;
  return v.startsWith(origin + '/') ? v : '';
}
export const absoluteSiteLink = (value, settings) => value?.startsWith('/') ? settings.publicOrigin + value : value || '';
/** Only public, bounded settings are retained. Original defaults are presentation defaults, never evidence of merchant facts. */
export function normalizeJoshSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !originOf(input.publicOrigin) || !['light', 'dark'].includes(input.theme) || typeof input.siteName !== 'string' || !input.siteName.trim()) throw new TypeError('pra_josh_settings_invalid');
  const name = cleanText(input.siteName, 200);
  const defaults = { enabled: 1, legal_name: name, headline: 'Research materials for qualified laboratories.', description: name + ' supplies research-use-only reagents to laboratories, universities and independent researchers. Products are for in-vitro research only and are not for human or veterinary use.', address: '', email: '', phone: '', hours: '', fact1_title: 'Research use only', fact1_text: 'No medical, cosmetic or consumption claims', fact2_title: 'Verified researchers', fact2_text: 'Eligibility is confirmed before the catalog opens', fact3_title: 'US & Canada', fact3_text: 'Ships to verified research addresses only', refund_days: '14', processing_days: '1–2 business days', carriers: 'USPS and UPS', governing_law: '', url_policy: '/policies/research-access/', url_terms: '/policies/terms-of-sale/', url_privacy: '/policies/privacy/', url_refunds: '/policies/refunds-and-returns/', url_shipping: '/policies/shipping/', accent: '', bg: '', card: '', ink: '', bg_image: '', bg_dim: '70', css: '' };
  const raw = { ...defaults, ...input }, out = { publicOrigin: input.publicOrigin, siteName: name, theme: input.theme, enabled: raw.enabled && raw.enabled !== '0' ? 1 : 0 };
  for (const [key, [max, multiline]] of Object.entries(TEXT)) out[key] = cleanText(raw[key], max, multiline);
  if (out.email && !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(out.email)) out.email = '';
  const days = Number(out.refund_days.replace(/\D/g, ''));
  out.refund_days = days >= 1 && days <= 365 ? String(days) : '14';
  for (const key of Object.keys(JOSH_LINKS)) out[key] = joshSiteLink(raw[key], out.publicOrigin);
  for (const key of ['accent', 'bg', 'card', 'ink']) out[key] = hex(raw[key]);
  out.bg_image = joshSiteLink(raw.bg_image, out.publicOrigin);
  out.bg_dim = String(Math.max(0, Math.min(100, scalar(raw.bg_dim).trim() === '' ? 70 : Number(scalar(raw.bg_dim).replace(/\D/g, '')))));
  out.css = cleanCss(raw.css);
  for (const key of ['logo_light_url', 'logo_dark_url', 'og_image_url', 'site_icon_url']) out[key] = scalar(raw[key]).startsWith(out.publicOrigin + '/') ? joshSiteLink(raw[key], out.publicOrigin) : '';
  out.requestPath = typeof raw.requestPath === 'string' ? raw.requestPath : '/';
  return out;
}
/** Native opt-in only; no secret is needed to render a public policy. */
export function joshSettings(config, request) {
  if (!config?.frontDoor) return null;
  if (config.frontDoor.profile !== JOSH_PROFILE) throw new TypeError('pra_josh_profile_invalid');
  const s = normalizeJoshSettings(config.frontDoor.settings);
  if (s.publicOrigin !== config.publicOrigin || s.theme !== config.theme) throw new TypeError('pra_josh_site_mismatch');
  if (request) { const url = new URL(request.url); s.requestPath = url.pathname + url.search; }
  return s;
}
export const joshActive = s => !!s.enabled && !!s.legal_name && !!s.description;
export const joshLogo = s => s.theme === 'dark' ? s.logo_dark_url : s.logo_light_url;
export const joshDescription = s => { const text = s.description.replace(/\s+/g, ' '); return joshActive(s) ? cut(text.match(/^(.*?[.!?])(?:\s|$)/u)?.[1] || text, 160) : ''; };
function onColor(hexValue) {
  const c = [1, 3, 5].map(i => { const v = parseInt(hexValue.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] > .4 ? '#101418' : '#ffffff';
}
export function joshLookStyle(s) {
  let vars = '';
  if (s.accent) vars += '--accent:' + s.accent + ';--on-accent:' + onColor(s.accent) + ';';
  if (s.bg) vars += '--bg:' + s.bg + ';';
  if (s.ink) vars += '--ink:' + s.ink + ';--body:color-mix(in srgb,' + s.ink + ' 80%,var(--bg));--muted:color-mix(in srgb,' + s.ink + ' 62%,var(--bg));';
  if (s.card) vars += '--card:' + s.card + ';--surface:color-mix(in srgb,' + s.card + ' 88%,var(--ink));--line:color-mix(in srgb,var(--ink) 16%,' + s.card + ');--disabled:color-mix(in srgb,var(--ink) 12%,' + s.card + ');';
  let css = vars ? ':root{' + vars + '}' : '';
  if (s.bg_image) { const veil = 'color-mix(in srgb,var(--bg) ' + s.bg_dim + '%,transparent)'; css += 'body{background:linear-gradient(' + veil + ',' + veil + '),url("' + escapeHtml(absoluteSiteLink(s.bg_image, s)) + '") center/cover no-repeat var(--bg)}'; }
  return (css ? '<style id="pfd-look">' + css + '</style>' : '') + (s.css ? '<style id="pfd-custom">\n' + s.css + '\n</style>' : '');
}

// Literal source blocks copied from the pinned PHP, without restyling.
const FRONT_STYLE = "<style id=\"pfd-style\">body{display:block;padding:0}.pfd-shell{min-height:100vh;min-height:100svh;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}.pfd-brand{position:relative;overflow:hidden;padding:48px 44px;display:grid;align-content:space-between;gap:32px;border-right:1px solid var(--line);color:var(--body);min-width:0}.pfd-brand::before{content:\"\";position:absolute;inset:-40% -30% auto auto;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 22%,transparent),transparent 70%);pointer-events:none}.pfd-brand::after{content:\"\";position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;opacity:.18;pointer-events:none;-webkit-mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent)}.pfd-brand>*{position:relative}.pfd-logo img{display:block;max-width:260px;max-height:72px;width:auto;height:auto;object-fit:contain}.pfd-wordmark{font-size:24px;font-weight:650;color:var(--ink);letter-spacing:-.02em}.pfd-hero h2{margin:0 0 14px;font-size:clamp(26px,3.2vw,36px);line-height:1.12;font-weight:700;color:var(--ink);letter-spacing:-.01em;max-width:16ch}.pfd-hero p{margin:0;max-width:46ch;font-size:15px;line-height:1.6}.pfd-hero p+p{margin-top:10px}.pfd-hero a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}.pfd-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pfd-fact{background:color-mix(in srgb,var(--card) 70%,transparent);border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0}.pfd-fact b{display:block;font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px}.pfd-fact span{font-size:12px;color:var(--muted);line-height:1.45}.pfd-foot{display:grid;gap:8px;font-size:12.5px;color:var(--muted);line-height:1.5}.pfd-co{color:var(--body)}.pfd-links{display:flex;flex-wrap:wrap;gap:6px 16px}.pfd-links a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}.pfd-links a:focus-visible,.pfd-hero a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.pfd-shell>.pra-wrap{max-width:none;margin:0;padding:48px 44px;display:grid;align-content:center;min-width:0}.pfd-shell>.pra-wrap>.pra-card{max-width:460px;width:100%;margin:0 auto}@media (max-width:820px){.pfd-shell{grid-template-columns:1fr}.pfd-shell>.pra-wrap{order:0;padding:28px 18px 32px}.pfd-brand{order:1;border-right:0;border-top:1px solid var(--line);padding:32px 22px;gap:24px}.pfd-facts{grid-template-columns:1fr 1fr}}@media (max-width:520px){.pfd-facts{grid-template-columns:1fr}}@media print{.pfd-brand::before,.pfd-brand::after{display:none}}</style>";
const HELP_STYLE = "<style id=\"prh-style\">.prh-help-link{display:block;width:fit-content;margin:18px auto 0;padding:5px;color:var(--muted);font-size:13px;text-underline-offset:3px}.prh-help{display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:16px}.prh-help:target{display:flex}.prh-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.6)}.prh-box{position:relative;width:100%;max-width:440px;max-height:90vh;overflow:auto;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:28px 24px 24px;text-align:left;box-shadow:0 20px 60px rgba(0,0,0,.35)}.prh-x{position:absolute;top:8px;right:10px;width:36px;height:36px;line-height:36px;text-align:center;font-size:24px;color:var(--muted);text-decoration:none}.prh-title{margin:0 28px 14px 0;font-size:20px;font-weight:600;line-height:1.3;letter-spacing:-.01em}.prh-access{margin:0 0 16px;padding:14px 16px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font-size:14px;line-height:1.55}.prh-access strong{display:block;margin-bottom:4px;font-size:15px}.prh-more{margin:0 0 8px;font-size:13px;color:var(--body)}.prh-list{margin:0;padding:0;list-style:none}.prh-list li{padding:12px 0;border-top:1px solid var(--line);font-size:14px;line-height:1.55;color:var(--body)}.prh-list strong{display:block;color:var(--ink)}.prh-close{display:block;margin-top:16px;min-height:44px;line-height:44px;border-radius:8px;background:var(--accent);color:var(--on-accent);font-size:15px;font-weight:600;text-align:center;text-decoration:none}.prh-x:focus-visible,.prh-close:focus-visible,.prh-help-link:focus-visible{outline:2px solid var(--accent);outline-offset:3px}</style>";
const HELP_LINK = "<a class=\"prh-help-link\" href=\"#prh-help\">Need help logging in?</a>";
const HELP_PANEL = "<div id=\"prh-help\" class=\"prh-help\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"prh-help-title\"><a class=\"prh-backdrop\" href=\"#pra-agree\" tabindex=\"-1\" aria-hidden=\"true\"></a><div class=\"prh-box\"><a class=\"prh-x\" href=\"#pra-agree\" aria-label=\"Close help\">&times;</a><h2 class=\"prh-title\" id=\"prh-help-title\">Need help logging in?</h2><p class=\"prh-access\"><strong>Can&rsquo;t access the website?</strong>Refresh this page and try again. If you still need help, use the support contact listed on this website.</p><p class=\"prh-more\">Other things to try, one at a time:</p><ul class=\"prh-list\"><li><strong>The page will not load</strong>Check your internet connection, then refresh this page.</li><li><strong>Saw an error after pressing Enter Now</strong>Do not press it again. Refresh this page.</li><li><strong>The verify button does nothing</strong>Refresh this page and allow it to finish loading before trying again.</li></ul><a class=\"prh-close\" href=\"#pra-agree\">Close</a></div></div>";
const NOTICE_CSS = "/* Catalog Shield entrance — flat, themeless, no JavaScript. */\n:root{color-scheme:light;--cs-ink:#14141f;--cs-body:#4a4a5e;--cs-line:#e3e3ec;--cs-bg:#f6f6f9;--cs-card:#fff;--cs-accent:#2c2584}\nbody.cs-entrance[data-pra-theme=\"dark\"]{color-scheme:dark;--cs-ink:#f4f5f7;--cs-body:#bdc1cb;--cs-line:#303641;--cs-bg:#101216;--cs-card:#191d24;--cs-accent:#adc5ff}\n*{box-sizing:border-box}\nbody.cs-entrance{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;\n  background:var(--cs-bg);color:var(--cs-body);\n  font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"SF Pro Display\",system-ui,sans-serif;line-height:1.55}\n.cs-card{width:100%;max-width:420px;background:var(--cs-card);border:1px solid var(--cs-line);border-radius:14px;\n  padding:40px 32px;text-align:center;box-shadow:0 18px 48px rgba(20,20,31,.08)}\n.cs-logo{display:block;margin:0 auto 18px;max-height:64px;max-width:70%;height:auto;width:auto}\n.cs-name{margin:0 0 8px;font-size:22px;line-height:1.25;color:var(--cs-ink)}\n.cs-lede{margin:0 0 26px;font-size:15px}\n.cs-actions{display:flex;flex-direction:column;gap:10px}\n.cs-btn{display:block;padding:13px 18px;border:1px solid var(--cs-line);border-radius:8px;background:#fff;\n  color:var(--cs-ink);font-size:15px;font-weight:600;text-decoration:none}\n.cs-btn:hover,.cs-btn:focus{border-color:var(--cs-accent);color:var(--cs-accent)}\n.cs-btn:focus-visible{outline:2px solid var(--cs-accent);outline-offset:2px}\n.cs-hint{margin:-12px 0 22px;font-size:15px;font-weight:600;color:var(--cs-ink)}\n.cs-btn-primary,.cs-btn-primary:hover,.cs-btn-primary:focus{background:var(--cs-accent);border-color:var(--cs-accent);color:var(--cs-card)}\n.cs-btn-primary:hover,.cs-btn-primary:focus{opacity:.9}\n.cs-foot{margin:26px 0 0;font-size:13px;color:#7a7a8e}\n.cs-foot a{color:inherit}\n@media (max-width:480px){.cs-card{padding:32px 22px}}\n";

const count = (html, anchor) => html.split(anchor).length - 1;
function insert(html, edits) {
  if (edits.some(([anchor]) => count(html, anchor) !== 1)) return html;
  let out = html;
  for (const [anchor, text, before] of edits) { const at = out.indexOf(anchor) + (before ? 0 : anchor.length); out = out.slice(0, at) + text + out.slice(at); }
  return out;
}
function helpTransform(html) {
  if (html.includes('prh-help') || html.includes('prc-help')) return html;
  return insert(html, [['</head>', HELP_STYLE, true], ['<button class="pra-leave"', HELP_LINK, true], ['</main>', HELP_PANEL, false]]);
}
function panel(s) {
  const h = escapeHtml, logo = joshLogo(s);
  let out = '<aside class="pfd-brand" aria-label="About ' + h(s.legal_name) + '"><div class="pfd-logo">' + (logo ? '<img src="' + h(logo) + '" alt="' + h(s.siteName) + '">' : '<span class="pfd-wordmark">' + h(s.siteName) + '</span>') + '</div><div class="pfd-hero">';
  if (s.headline) out += '<h2>' + h(s.headline) + '</h2>';
  for (const para of s.description.split(/\r\n|\r|\n/)) if (para.trim()) out += '<p>' + h(para.trim()) + '</p>';
  const policy = absoluteSiteLink(s.url_policy, s);
  out += '<p>Access to the catalog is restricted to qualified researchers under our ' + (policy ? '<a href="' + h(policy) + '">Research Access Policy</a>' : 'Research Access Policy') + '. This is an eligibility check, not a customer login.</p></div>';
  let facts = '';
  for (const i of [1, 2, 3]) if (s['fact' + i + '_title']) facts += '<div class="pfd-fact"><b>' + h(s['fact' + i + '_title']) + '</b>' + (s['fact' + i + '_text'] ? '<span>' + h(s['fact' + i + '_text']) + '</span>' : '') + '</div>';
  if (facts) out += '<div class="pfd-facts">' + facts + '</div>';
  out += '<div class="pfd-foot"><div class="pfd-co">' + h(s.legal_name + (s.address ? ' · ' + s.address : '')) + '</div>';
  const contact = [s.email, s.phone, s.hours].filter(Boolean);
  if (contact.length) out += '<div>' + h(contact.join(' · ')) + '</div>';
  const links = Object.entries(JOSH_LINKS).filter(([key]) => s[key]).map(([key, label]) => '<a href="' + h(absoluteSiteLink(s[key], s)) + '">' + h(label) + '</a>').join('');
  if (links) out += '<div class="pfd-links">' + links + '</div>';
  return out + '</div></aside>';
}
function headBlock(s, nonce, html) {
  const description = joshDescription(s);
  let out = description && !html.includes('name="description"') ? '\n<meta name="description" content="' + escapeHtml(description) + '">' : '';
  const org = { '@context': 'https://schema.org', '@type': 'Organization', name: s.legal_name, url: s.publicOrigin + '/', description: s.description };
  if (s.logo_light_url) org.logo = s.logo_light_url;
  if (s.address) org.address = s.address;
  const contact = Object.fromEntries(Object.entries({ '@type': 'ContactPoint', contactType: 'customer support', email: s.email, telephone: s.phone, hoursAvailable: s.hours }).filter(([, value]) => value));
  if (Object.keys(contact).length > 2) org.contactPoint = contact;
  out += '\n<script type="application/ld+json"' + (nonce ? ' nonce="' + escapeHtml(nonce) + '"' : '') + '>' + JSON.stringify(org).replace(/<\//g, '<\\/') + '</script>';
  return out;
}
/** Only decorate the original agreement screen. Missing/repeated anchors never change its admission markup. */
export function decorateJoshEntrance(html, settings) {
  if (typeof html !== 'string' || !html || new TextEncoder().encode(html).length > MAX_DOC || !html.includes('id="pra-agree"') || !html.includes('class="pra-wrap"')) return html;
  const s = normalizeJoshSettings(settings);
  const helped = helpTransform(html);
  if (helped.includes('pfd-') || helped.includes('prc-gate-skin')) return helped;
  const look = joshLookStyle(s);
  if (!joshActive(s)) return look ? insert(helped, [['</head>', look, true]]) : helped;
  const nonce = helped.match(/<script nonce="([A-Za-z0-9_-]{8,128})"/)?.[1] || '';
  return insert(helped, [['</title>', headBlock(s, nonce, helped), false], ['</head>', FRONT_STYLE + look, true], ['<div class="pra-wrap">', '<div class="pfd-shell">' + panel(s), true], ['</body>', '</div>', true]]);
}
const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
function retryPath(s) {
  try {
    const raw = s.requestPath || '/';
    if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(raw)) return '/';
    const url = new URL(raw, s.publicOrigin);
    if (url.origin !== s.publicOrigin || /%2f|%5c|%00/i.test(url.pathname) || ['/research-entry', '/research-return', '/research-forget', '/privacy-policy-terms-of-use'].includes(url.pathname.replace(/\/+$/, '')) || url.pathname.includes('/wp-json/') || url.pathname.includes('/wp-admin/') || ['rest_route', 'wc-api', 'wc-ajax'].some(key => url.searchParams.has(key))) return '/';
    url.searchParams.delete('_pra_action'); url.searchParams.delete('agreement');
    return url.pathname + url.search;
  } catch { return '/'; }
}
function previewMeta(s) {
  const title = s.siteName + ' — Research Access', description = joshDescription(s) || 'Access auto blocked for non researchers';
  let path; try { path = new URL(s.requestPath || '/', s.publicOrigin).pathname; } catch { path = '/'; }
  const tags = [['name', 'description', description], ['property', 'og:type', 'website'], ['property', 'og:site_name', s.siteName], ['property', 'og:title', title], ['property', 'og:description', description], ['property', 'og:url', s.publicOrigin + path], ['name', 'twitter:card', 'summary'], ['name', 'twitter:title', title], ['name', 'twitter:description', description]];
  const image = s.og_image_url || s.site_icon_url || s.logo_light_url;
  if (image) tags.push(['property', 'og:image', image], ['property', 'og:image:alt', s.siteName], ['name', 'twitter:image', image]);
  return tags.map(([attr, key, value]) => '<meta ' + attr + '="' + key + '" content="' + escapeHtml(value) + '" />\n').join('');
}
/** Original branded availability notice. A temporary failure retries the current safe local address. */
export function joshNotice(status, text, settings, extraHeaders = {}) {
  const s = normalizeJoshSettings(settings), h = escapeHtml, logo = joshLogo(s);
  const body = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<meta name="robots" content="noindex,nofollow" />\n<title>' + h(s.siteName + ' — Research Access') + '</title>\n' + previewMeta(s) + '<style>' + NOTICE_CSS + '</style>\n</head>\n<body class="cs-entrance" data-pra-theme="' + s.theme + '">\n<main class="cs-card">\n' + (logo ? '<img class="cs-logo" src="' + h(logo) + '" alt="' + h(s.siteName) + '" />\n' : '') + '<h1 class="cs-name">' + h(s.siteName) + '</h1>\n<p class="cs-lede">' + h(text) + '</p>\n' + (status === 503 ? '<p class="cs-hint">On Wi-Fi? Please turn off Wi-Fi and try again.</p>\n<div class="cs-actions"><a class="cs-btn cs-btn-primary" href="' + h(s.publicOrigin + retryPath(s)) + '">Try again</a></div>\n' : '') + '</main>\n</body>\n</html>';
  return new Response(body, { status, headers: { ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; frame-ancestors 'none'", ...(status === 503 ? { 'Retry-After': '30' } : {}), ...extraHeaders } });
}
