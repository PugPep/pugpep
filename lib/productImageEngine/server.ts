import { createClient } from "@supabase/supabase-js";

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireProductImageAdmin(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    throw new Response("Unauthorized", {
      status: 401,
    });
  }

  const admin = getAdminClient();

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    throw new Response("Unauthorized", {
      status: 401,
    });
  }

  const {
    data: adminRow,
    error: adminError,
  } = await admin
    .from("product_image_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error(
      "Product Image Engine admin lookup failed:",
      adminError
    );

    throw new Response("Unable to verify admin access.", {
      status: 500,
    });
  }

  if (!adminRow) {
    throw new Response("Forbidden", {
      status: 403,
    });
  }

  return {
    admin,
    user,
  };
}

export function categoryFiltersForFamily(
  family: string
): string[] {
  switch (family) {
    case "sprays":
      return [
        "spray",
        "nasal-spray",
      ];

    case "lab-materials":
      return [
        "lab-material",
      ];

    case "peptides":
    default:
      return [
        "peptide",
      ];
  }
}