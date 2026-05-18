"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
export default function AdminOrdersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/admin");
  }, [router]);

  return (
    <main style={{ padding: 30, background: "#000", color: "#fff", minHeight: "100vh" }}>
      Redirecting to admin dashboard...
    </main>
  );
}