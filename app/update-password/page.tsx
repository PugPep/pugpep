"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function verifyRecoverySession() {
      setVerifying(true);
      setErrorMessage("");

      try {
        const url = new URL(window.location.href);
        const callbackError = url.searchParams.get("error");

        if (callbackError) {
          if (mounted) {
            setReady(false);

            setErrorMessage(
              callbackError === "missing_recovery_code"
                ? "The reset link did not contain a recovery code."
                : "This password reset link is invalid, expired, or has already been used."
            );
          }

          return;
        }

        /*
         * The server callback already exchanged the reset code.
         * This page only checks that the recovery session exists.
         */
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user) {
          throw new Error(
            "This password reset link is invalid or has expired."
          );
        }

        if (mounted) {
          setReady(true);
        }
      } catch (error) {
        console.error(
          "Password recovery verification error:",
          error
        );

        if (mounted) {
          setReady(false);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "This password reset link is invalid or has expired."
          );
        }
      } finally {
        if (mounted) {
          setVerifying(false);
        }
      }
    }

    void verifyRecoverySession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function updatePassword() {
    const newPassword = password.trim();
    const confirmedPassword =
      confirmPassword.trim();

    setMessage("");
    setErrorMessage("");

    if (!newPassword) {
      setErrorMessage("Enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(
        "Your new password must contain at least 8 characters."
      );

      return;
    }

    if (newPassword !== confirmedPassword) {
      setErrorMessage(
        "The passwords do not match."
      );

      return;
    }

    setUpdating(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      setPassword("");
      setConfirmPassword("");
      setReady(false);

      setMessage(
        "Password updated successfully. You can now log in with your new password."
      );
    } catch (error) {
      console.error(
        "Password update error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password."
      );
    } finally {
      setUpdating(false);
    }
  }

  if (verifying) {
    return (
      <main style={page}>
        <section style={box}>
          <h1 style={{ color: "#ff45d8" }}>
            Verifying Reset Link...
          </h1>

          <p style={{ color: "#aaa" }}>
            Please wait while we verify your
            password reset request.
          </p>
        </section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main style={page}>
        <section style={box}>
          {message ? (
            <>
              <h1 style={{ color: "#00ff99" }}>
                Password Updated
              </h1>

              <p style={{ color: "#00ff99" }}>
                {message}
              </p>

              <a
                href="/login"
                style={linkButton}
              >
                Go to Login
              </a>
            </>
          ) : (
            <>
              <h1 style={{ color: "#ff45d8" }}>
                Reset Link Invalid
              </h1>

              <p style={{ color: "#ff6666" }}>
                {errorMessage ||
                  "This password reset link is invalid or has expired."}
              </p>

              <a
                href="/forgot-password"
                style={linkButton}
              >
                Request a New Reset Link
              </a>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      <section style={box}>
        <h1 style={{ color: "#ff45d8" }}>
          Create New Password
        </h1>

        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          style={input}
        />

        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !updating
            ) {
              void updatePassword();
            }
          }}
          style={input}
        />

        <button
          type="button"
          onClick={() =>
            void updatePassword()
          }
          disabled={updating}
          style={{
            ...button,
            opacity: updating ? 0.65 : 1,
            cursor: updating
              ? "not-allowed"
              : "pointer",
          }}
        >
          {updating
            ? "Updating Password..."
            : "Update Password"}
        </button>

        {errorMessage && (
          <p style={{ color: "#ff6666" }}>
            {errorMessage}
          </p>
        )}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const box = {
  maxWidth: 500,
  margin: "60px auto",
  padding: 25,
  border: "1px solid #333",
  borderRadius: 14,
  background: "#080808",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  marginBottom: 14,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const button = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
};

const linkButton = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 20,
  padding: 14,
  borderRadius: 10,
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  textAlign: "center" as const,
  textDecoration: "none",
};