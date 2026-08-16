import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    await supabase.auth.getClaims();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const isInvalidRefreshToken =
      message.includes("Invalid Refresh Token") ||
      message.includes("refresh_token_not_found");

    if (!isInvalidRefreshToken) {
      throw error;
    }

    /*
     * The browser sent a stale Supabase session.
     * Clear only Supabase auth cookies and continue
     * as a signed-out user.
     */
    request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith("sb-"))
      .forEach(({ name }) => {
        request.cookies.delete(name);
        response.cookies.delete(name);
      });
  }

  return response;
}