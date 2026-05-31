"use client";

import { useEffect, useState } from "react";

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

const contactLinks = [
  
  
  {
    label: "Telegram",
    href: "https://t.me/PugPeps",
  },
  {
    label: "Email Us",
    href: "mailto:https://www.support@pugpep.com",
  },
];

export default function PaymentPage() {
  const [method, setMethod] = useState("venmo");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const savedOrder = localStorage.getItem("pugpep_order");
    if (savedOrder) {
      setOrder(JSON.parse(savedOrder));
    }
  }, []);

  if (!order) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Payment</h1>
        <p>No order found. Please return to checkout.</p>
      </main>
    );
  }

  const orderSummary = `
  
Order: ${order.orderNumber}
Name: ${order.customer.name}
Email: ${order.customer.email}
Organization: ${order.customer.organization}
Total: $${order.total.toFixed(2)}

Items:
${order.items
  .map((item) => {
    const qty = item.quantity || 1;
    return `- ${item.name} ${item.dosage} ${
     item.name.toLowerCase().includes("microscope")
  ? item.purchaseType === "single"
    ? "Single Item"
    : "10 Pack"
  : item.purchaseType === "single"
  ? "Single Vial"
  : "Full Kit of 10"
    } x${qty} - $${(item.price * qty).toFixed(2)}`;
  })
  .join("\n")}
`;

 

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Payment</h1>

      <div style={boxStyle}>
        <h2 style={{ color: "#00d9ff" }}>Order #{order.orderNumber}</h2>
<p>
  <strong>Organization:</strong>{" "}
  {order.customer.organization}
</p>
        <p>
          <strong>Name:</strong> {order.customer.name}
        </p>

        <p>
          <strong>Email:</strong> {order.customer.email}
        </p>

        <p>
          <strong>Ship To:</strong> {order.customer.address},{" "}
          {order.customer.city}, {order.customer.state} {order.customer.zip}
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

        
      </div>

      <section style={methodGrid}>
        {[
  ["cashapp", "Cash App"],
  ["venmo", "Venmo"],
  ["applepay", "Apple Pay"],
  ["crypto", "Crypto"],
].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMethod(value)}
            style={{
              ...methodButton,
              border:
                method === value ? "2px solid #ff45d8" : "1px solid #333",
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
  paymentInfo="$EllieRobins22"
  message="Include ONLY YOUR NAME in the memo/note section"
/>
            
             

)}
        
        
        
        {method === "venmo" && (
          <PaymentInstructions
  title="Venmo"
  accent="#00d9ff"
  amount={order.total}
  paymentInfo="@OMiller1111"
  message="Friends & Family preferred. Include ONLY YOUR NAME in the note section."
/>
            
            
          
        )}

{method === "applepay" && (
       <PaymentInstructions
  title="Apple Cash"
  accent="#cfd3d8"
  amount={order.total}
  paymentInfo="Message us on Telegram or Email to receive payment instructions."
  message="Include ONLY YOUR NAME in the note section."
/>
)}
        {method === "crypto" && (
  <>
    <img
      src="/crypto-banner.png"
      alt="We Accept Crypto"
      style={{
        width: "100%",
        borderRadius: 14,
        border: "1px solid #7d2cff",
        boxShadow: "0 0 25px rgba(255,45,210,.35)",
        marginBottom: 20,
      }}
    />

    <PaymentInstructions
      title="Crypto Payment"
      accent="#ff45d8"
      amount={order.total}
      
      message="Message us on Telegram or Email to receive payment instructions."
    />
  </>
)}
          
      </div>
    </main>
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
  <div
    style={{
      marginTop: 20,
      padding: 18,
      borderRadius: 12,
      border: `2px solid ${accent}`,
      background: "rgba(255,255,255,.05)",
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: 14,
        color: "#aaa",
        marginBottom: 8,
      }}
    >
      SEND PAYMENT TO
    </div>

    <div
      style={{
        fontSize: 28,
        fontWeight: "bold",
        color: accent,
      }}
    >
      {paymentInfo}
    </div>
  </div>
)}
      <p>
        Amount due:{" "}
        <strong style={{ color: "#00d9ff" }}>${amount.toFixed(2)}</strong>
      </p>

     

      

      <div style={contactGrid}>
        {contactLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={contactButton}
          >
           {link.label}
          </a>
        ))}
      </div>
    </>
  );
}

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

const smallButton = {
  marginTop: 10,
  padding: "10px 14px",
  background: "#111",
  color: "#fff",
  border: "1px solid #00d9ff",
  borderRadius: 8,
  cursor: "pointer",
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