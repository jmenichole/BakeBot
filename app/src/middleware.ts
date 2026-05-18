import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/pricing",
  "/support",
  "/terms",
  "/privacy",
  "/refund",
  "/trial-expired",
  "/auth/callback",
]);

const PUBLIC_DYNAMIC_ROUTES = ["/quote/", "/order/"];

const PUBLIC_API_ROUTES = new Set([
  "/api/traction-report",
  "/api/track-referral",
  "/api/order-action",
  "/api/stripe/webhook",
  "/api/auth/grant-access",
]);

const PUBLIC_DYNAMIC_API_ROUTES = ["/api/order-tracking/"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Skip auth check for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle public accessibility
  const isPublic =
    PUBLIC_ROUTES.has(pathname) ||
    PUBLIC_DYNAMIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_API_ROUTES.has(pathname) ||
    PUBLIC_DYNAMIC_API_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users
  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Admin access: require role=admin AND IP allowlist (deny-by-default)
  if (pathname.startsWith("/admin")) {
    // Role check — only users with role='admin' in the bakers table may proceed
    if (user) {
      const { data: baker } = await supabase
        .from("bakers")
        .select("role")
        .eq("id", user.id)
        .single();
      if (baker?.role !== "admin") {
        return new NextResponse(
          JSON.stringify({ error: "Access Denied" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // IP Allowlist: deny-by-default when ALLOWED_ADMIN_IP is unset or empty
    const allowedIps = (process.env.ALLOWED_ADMIN_IP || "")
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (allowedIps.length === 0) {
      console.warn("ALLOWED_ADMIN_IP is not configured — blocking all admin access");
    }
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip");
    if (allowedIps.length === 0 || !clientIp || !allowedIps.includes(clientIp)) {
      console.warn(`Blocked unauthorized admin from IP: ${clientIp}`);
      return new NextResponse(
        JSON.stringify({ error: "Access Denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};
