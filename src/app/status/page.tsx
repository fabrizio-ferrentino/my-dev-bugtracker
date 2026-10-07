import { StatusContent } from "@/components/public/status-content";
import { getLangAndDict } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = getLangAndDict();
  return { title: t.meta.statusTitle };
}

export default function StatusPage() {
  const { lang, t } = getLangAndDict();
  const locale = lang === "it" ? "it-IT" : "en-US";
  return <StatusContent t={t} locale={locale} />;
}
