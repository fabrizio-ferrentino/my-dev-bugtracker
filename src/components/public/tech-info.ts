/** Best-effort technical context collected in the browser (spec §4). */
export interface TechInfo {
  browser: string;
  os: string;
  viewport: string;
  userAgent: string;
  language: string;
  sourceUrl: string;
}

export function collectTechInfo(): TechInfo {
  const ua =
    typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    browser: detectBrowser(ua),
    os: detectOs(ua),
    viewport:
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight}`
        : "",
    userAgent: ua.slice(0, 500),
    language: typeof navigator !== "undefined" ? navigator.language : "",
    sourceUrl:
      typeof document !== "undefined" ? document.referrer.slice(0, 500) : "",
  };
}

function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/opr|opera/i.test(ua)) return "Opera";
  if (/chrome|chromium|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Unknown";
}

function detectOs(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/mac/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}
