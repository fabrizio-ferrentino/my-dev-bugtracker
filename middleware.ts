import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Protect /admin* (except /admin/login): unauthenticated users are
 * redirected to /admin/login. Optionally restricts access to ADMIN_EMAIL.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  let res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: object }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const allowlist = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (allowlist && user.email?.toLowerCase() !== allowlist) {
    await supabase.auth.signOut();
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
