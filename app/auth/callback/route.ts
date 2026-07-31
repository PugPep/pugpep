import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  let next =
    requestUrl.searchParams.get("next") ||
    "/update-password";

  // Only allow redirects within this app
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/update-password";
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/update-password?error=missing_recovery_code",
        requestUrl.origin
      )
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(error);

    return NextResponse.redirect(
      new URL(
        "/update-password?error=invalid_or_expired_link",
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(next, requestUrl.origin)
  );
}