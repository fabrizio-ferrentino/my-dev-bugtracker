import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { NavigatingLink } from "@/components/navigating-link";
import { siteName } from "@/lib/constants";
import { getLangAndDict } from "@/lib/i18n/server";

/**
 * Privacy policy placeholder. This is a template: replace the content
 * below with your own policy before going live.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { lang } = getLangAndDict();
  return {
    title: "Privacy Policy",
    description:
      lang === "it"
        ? `Informativa sul trattamento dei dati personali di ${siteName}.`
        : `Privacy policy of ${siteName}.`,
  };
}

export default function PrivacyPage() {
  const { lang, t } = getLangAndDict();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10">
      <NavigatingLink
        href="/"
        overlayText={t.dashboard.loading}
        className="mb-6 inline-flex items-center gap-1 self-start text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t.success.backHome}
      </NavigatingLink>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {siteName} · {t.home.privacy}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Privacy Policy</h1>

      {/* TODO: replace this placeholder with your privacy policy. */}
      <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-[15px] text-zinc-500 dark:border-zinc-700">
        {lang === "it"
          ? "Inserisci qui la tua privacy policy."
          : "Insert your privacy policy here."}
      </div>
    </main>
  );
}
