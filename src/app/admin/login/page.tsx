import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { createServerSupabase } from "@/lib/supabase/server";
import { getLangAndDict } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = getLangAndDict();
  return { title: t.meta.loginTitle, robots: "noindex, nofollow" };
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const { t } = getLangAndDict();
  // Already signed in? Skip the form and go straight to the dashboard
  // (or to the originally requested admin page).
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const allowlist = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!allowlist || user.email?.toLowerCase() === allowlist) {
      const next = searchParams.next;
      redirect(next && /^\/admin(\/|\?|$)/.test(next) ? next : "/admin");
    }
  }

  return (
    <Suspense>
      <LoginForm t={t} />
    </Suspense>
  );
}
