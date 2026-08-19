import type { SupabaseErrorDetails } from "./types";

export function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred."
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const databaseError =
      error as SupabaseErrorDetails;

    const parts = [
      databaseError.message,
      databaseError.details,
      databaseError.hint,
      databaseError.code
        ? `Error code: ${databaseError.code}`
        : null,
    ].filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return fallback;
}