"use client";

import { useEffect, useState } from "react";
import emailjs from "emailjs-com";
type Order = {
  orderNumber: string;
  customer: {
    organization: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  items: {
    name: string;
    dosage: string;
    purchaseType: "single" | "kit";
    price: number;
    quantity?: number;
  }[];
  subtotal: number;
  shipping: number;
  promoCode?: string | null;
  promoDiscount?: number;
  total: number;
  createdAt: string;
};

const cryptoWallets = {
  btc: {
    label: "BTC",
    icon: "/btc.png",
    address: "bc1qrs3gx0fcznndd82skdkljlwrr8l6d5caep6gdq",
    qr: "/btc-qr.png",
  },
bch: {
    label: "BCH",
    icon: "/bch.png",
    address: "qzs2arl0g4hctr8cqu4nn8uhu0zvfn02dsgyrpwg8s",
    qr: "/bch-qr.png",
  },
  eth: {
    label: "ETH",
    icon: "/eth.png",
    address: "0xa5EcFDeC787723E1f796Bd21307cf9d3C0DaaA90",
    qr: "/eth-qr.png",
  },
ltc: {
    label: "LTC",
    icon: "/ltc.png",
    address: "ltc1q365pwejdrk3337efjyhtqt68gqg0qctz9mlhyc",
    qr: "/ltc-qr.png",
  },
xrp: {
    label: "XRP",
    icon: "/xrp.png",
    address: "rGzcDYUonSVFeoRYMA9ss5agHFQG3iZeJ",
    qr: "/xrp-qr.png",
  },

  xlm: {
    label: "XLM",
    icon: "/xlm.png",
    address: "GCXL6EPU2BAFLZ4SGSUKY5P6MAMNUBHGQBI66TNKFHS4O2IKGV3WNFU3",
    qr: "/xlm-qr.png",
  },
  sol: {
    label: "SOL",
    icon: "/sol.png",
    address: "Dj6xqJ45sHPDWXMWkJHbnCA47xToFLvuxy5EgaKoESsV",
    qr: "/sol-qr.png",
  },
  usdt: {
    label: "USDT (TRC20)",
    icon: "/usdt.png",
    address: "TEE64AK1BwXcnxRpoNQ87g5JNeTcTkfidg",
    qr: "/usdt-qr.png",
  },

  usdc: {
    label: "USDC (Base)",
    icon: "/usdc.png",
    address: "0xa5EcFDeC787723E1f796Bd21307cf9d3C0DaaA90",
    qr: "/usdc-qr.png",
  },

  

  
  

  doge: {
    label: "DOGE",
    icon: "/doge.png",
    address: "DGhvUT5vvBZiK5DTav68syN7ZhRV93uzno",
    qr: "/doge-qr.png",
  },

  shib: {
    label: "SHIB",
    icon: "/shib.png",
    address: "0xa5EcFDeC787723E1f796Bd21307cf9d3C0DaaA90",
    qr: "/shib-qr.png",
  },
};

const contactLinks = [
  { label: "Join Discord", href: "https://discord.gg/yas8DetFz" },
  { label: "Telegram", href: "https://t.me/PugPeps" },
  { label: "Email Us", href: "mailto:support@pugpep.com" },

];

export default function PaymentPage() {
  const [method, setMethod] = useState("venmo");
  const [selectedCrypto, setSelectedCrypto] = useState("btc");
  const [order, setOrder] = useState<Order | null>(null);
const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const savedOrder = localStorage.getItem("pugpep_order");
    if (savedOrder) setOrder(JSON.parse(savedOrder));
  }, []);
async function confirmOrder() {
  if (!order) return;

  setConfirming(true);

  try {
    await emailjs.send(
      "service_quxnkin",
      "template_xz4gtk9",
      {
        organization: order.customer.organization,
        name: order.customer.name,
        email: order.customer.email,
        admin_email: "Support@PugPep.com",
        order_number: order.orderNumber,
        items: order.items.map((item) => ({
          name: `${item.name} (${item.dosage})`,
          quantity: item.quantity || 1,
          price: `$${(item.price * (item.quantity || 1)).toFixed(2)}`,
        })),
        shipping: order.shipping.toFixed(2),
        tax: "0.00",
        promo_code: order.promoCode || "",
        promo_discount: Number(order.promoDiscount || 0).toFixed(2),
        total: order.total.toFixed(2),
      },
      "yc_0cE0Mcl3tfzc11"
    );

    await fetch("/api/send-order-confirmation-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerPhone: order.customer.phone,
        orderNumber: order.orderNumber,
        orderTotal: order.total,
      }),
    });

    alert("Order confirmed. Confirmation email and text sent.");
  } catch (error) {
    console.error(error);
    alert("Order confirmation failed.");
  }

  setConfirming(false);
}
  if (!order) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Payment</h1>
        <p>No order found. Please return to checkout.</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Payment</h1>

      <div style={boxStyle}>
        <h2 style={{ color: "#00d9ff" }}>Order #{order.orderNumber}</h2>

        <p><strong>Organization:</strong> {order.customer.organization}</p>
        <p><strong>Name:</strong> {order.customer.name}</p>
        <p><strong>Email:</strong> {order.customer.email}</p>

        <p>
          <strong>Ship To:</strong> {order.customer.address}, {order.customer.city},{" "}
          {order.customer.state} {order.customer.zip}
        </p>

        <h3>Subtotal: ${order.subtotal.toFixed(2)}</h3>

        {Number(order.promoDiscount || 0) > 0 && (
          <h3 style={{ color: "#00ff99" }}>
            Promo Discount: -${Number(order.promoDiscount).toFixed(2)}
          </h3>
        )}

        <h3>
          Shipping:{" "}
          {order.shipping === 0 ? (
            <span style={{ color: "#00ff99" }}>FREE</span>
          ) : (
            `$${order.shipping.toFixed(2)}`
          )}
        </h3>

        <h2 style={{ color: "#00d9ff" }}>Total: ${order.total.toFixed(2)}</h2>
        <button
  onClick={confirmOrder}
  disabled={confirming}
  style={{
    marginTop: 20,
    padding: "14px 22px",
    width: "100%",
    background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 18,
  }}
>
  {confirming ? "Confirming..." : "Confirm Order"}
</button>
      </div>

      <section style={methodGrid}>
        {[
          ["cashapp", "Cash App"],
          ["venmo", "Venmo"],
         ["applecash", "Apple Cash"],
          ["crypto", "Crypto"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMethod(value)}
            style={{
              ...methodButton,
              border: method === value ? "2px solid #ff45d8" : "1px solid #333",
              background: method === value ? "#1b0016" : "#111",
            }}
          >
            {label}
          </button>
        ))}
      </section>

      <div style={paymentBox}>
        {method === "cashapp" && (
          <PaymentInstructions
            title="Cash App"
            accent="#1eff00"
            amount={order.total}
            paymentInfo="$PugPep1111"
            message="Include ONLY YOUR NAME in the memo/note section. Message us on Discord, Telegram or Email for assistance"
          />
        )}

        {method === "venmo" && (
          <PaymentInstructions
            title="Venmo"
            accent="#00d9ff"
            amount={order.total}
            paymentInfo="@PugPep1111"
            message="Friends & Family preferred. Include ONLY YOUR NAME in the note section.Message us on Discord, Telegram or Email for assistance"
          />
        )}

        {method === "applecash" && (
          <PaymentInstructions
            title="Apple Cash"
            accent="#cfd3d8"
            amount={order.total}
            message="Message us on Discord, Telegram or Email to receive Apple Cash payment instructions."
          />
        )}

        {method === "crypto" && (
  <>
    <AurpayButton
      orderNumber={order.orderNumber}
      total={order.total}
    />

    <img
      src="/crypto-banner.png"
      alt="We Accept Crypto"
      style={cryptoBanner}
    />
  </>
)}
      </div>
    </main>
  );
}
function AurpayButton({
  orderNumber,
  total,
}: {
  orderNumber: string;
  total: number;
}) {
  const [loading, setLoading] = useState(false);

  async function startAurpayPayment() {
  setLoading(true);

  try {
    const response = await fetch("/api/aurpay/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderNumber,
        total,
      }),
    });

    const result = await response.json();

    console.log("Frontend received:", result);

    if (!response.ok || result.error) {
      throw new Error(result.error || "Payment generation failed");
    }

    const checkoutUrl =
      result.data?.pay_url ||
      result.pay_url ||
      result.payUrl ||
      result.url;

    if (!checkoutUrl) {
      console.error("No AURPAY URL found:", result);
      alert("Unable to find the AURPAY payment link.");
      return;
    }

    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error(error);
    alert("Unable to create AURPAY payment.");
  } finally {
    setLoading(false);
  }
}
 return (
  <div
    style={{
      textAlign: "center",
      marginBottom: 25,
    }}
  >
      <h2 style={{ color: "#ff45d8" }}>Crypto Payment</h2>

      <p style={{ color: "#ddd", lineHeight: 1.6 }}>
        Click below to open secure AURPAY checkout for this order total.
      </p>

      <button
  type="button"
  onClick={startAurpayPayment}
  disabled={loading}
  style={{
    ...contactButton,
    maxWidth: 320,
    margin: "0 auto",
  }}
>
        {loading ? "Opening AURPAY..." : "Secure Crypto Checkout"}
      </button>
    </div>
  );
}
function PaymentInstructions({
  title,
  accent,
  amount,
  message,
  paymentInfo,
}: {
  title: string;
  accent: string;
  amount: number;
  message: string;
  paymentInfo?: string;
}) {
  return (
    <>
      <h2 style={{ color: accent }}>{title}</h2>

      <p style={{ color: "#ddd", lineHeight: 1.6 }}>{message}</p>

      {paymentInfo && (
        <div style={{ ...paymentInfoBox, border: `2px solid ${accent}` }}>
          <div style={paymentInfoLabel}>SEND PAYMENT TO</div>
          <div style={{ ...paymentInfoText, color: accent }}>{paymentInfo}</div>
        </div>
      )}

      <p>
        Amount due: <strong style={{ color: "#00d9ff" }}>${amount.toFixed(2)}</strong>
      </p>

      <div style={contactGrid}>
        {contactLinks.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" style={contactButton}>
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}


const coinBackgrounds: Record<string, string> = {
  btc: "#f7931a",
  eth: "#ffffff",
  usdt: "#26a17b",
  usdc: "#2775ca",
  xrp: "#ffffff",
  xlm: "#ffffff",
  ltc: "#345d9d",
  bch: "#8dc351",
  doge: "#c2a633",
  shib: "#f04f23",
};
const page = {
  padding: 30,
  color: "#fff",
  background: "#000",
  minHeight: "100vh",
};

const boxStyle = {
  padding: 20,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
  marginBottom: 25,
  maxWidth: 800,
};

const methodGrid = {
  display: "grid",
  gap: 12,
  maxWidth: 700,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const methodButton = {
  padding: 14,
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  textAlign: "left" as const,
  fontSize: 16,
  fontWeight: "bold",
};

const paymentBox = {
  marginTop: 30,
  padding: 25,
  border: "1px solid #7d2cff",
  borderRadius: 12,
  background: "#080808",
  maxWidth: 700,
};

const cryptoBanner = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #7d2cff",
  boxShadow: "0 0 25px rgba(255,45,210,.35)",
  marginTop: 20,
  marginBottom: 20,
};

const paymentInfoBox = {
  marginTop: 20,
  padding: 18,
  borderRadius: 12,
  background: "rgba(255,255,255,.05)",
  textAlign: "center" as const,
};

const paymentInfoLabel = {
  fontSize: 14,
  color: "#aaa",
  marginBottom: 8,
};

const paymentInfoText = {
  fontSize: 28,
  fontWeight: "bold",
  wordBreak: "break-all" as const,
};

const cryptoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
  gap: 12,
  marginBottom: 20,
};

const cryptoButton = {
  borderRadius: 12,
  padding: 12,
  cursor: "pointer",
  color: "#fff",
};



const cryptoLabel = {
  fontSize: 11,
  fontWeight: "bold",
  lineHeight: 1.2,
};

const walletBox = {
  marginTop: 20,
  textAlign: "center" as const,
};

const qrImage = {
  width: 240,
  maxWidth: "100%",
  borderRadius: 14,
  border: "1px solid #333",
  background: "#fff",
  padding: 10,
};

const qrPlaceholder = {
  width: 240,
  height: 240,
  maxWidth: "100%",
  margin: "0 auto",
  borderRadius: 14,
  border: "1px dashed #555",
  background: "#111",
  color: "#888",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
  lineHeight: 1.5,
};

const walletAddress = {
  color: "#00ff99",
  wordBreak: "break-all" as const,
  fontWeight: "bold",
};

const contactGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginTop: 20,
};

const contactButton = {
  display: "block",
  padding: "13px 14px",
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center" as const,
};