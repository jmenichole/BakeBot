import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createBakerPlanCheckout, type BakerPlan } from "@/lib/stripe-checkout";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const plan = searchParams.get("plan");

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: any }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Non-critical: Ignore if cookie setting fails in read-only route
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `/api/auth/grant-access?plan=${plan}`);
    return NextResponse.redirect(loginUrl);
  }

  if (plan === "monthly" || plan === "lifetime") {
    try {
      const session = await createBakerPlanCheckout(
        user.id,
        plan as BakerPlan,
        user.email
      );
      if (session.url) {
        return NextResponse.redirect(session.url);
      }
    } catch (err) {
      console.error("Stripe checkout redirect failed:", err);
    }
    return NextResponse.redirect(
      new URL("/pricing?error=checkout_unavailable", request.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
