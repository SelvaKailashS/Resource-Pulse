/**
 * Google Analytics 4 (GA4) & Local Telemetry Integration for ResourcePulse
 * Configurable via VITE_GA_MEASUREMENT_ID in .env or Vercel Environment Variables.
 */

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const STORAGE_KEY = "resourcepulse-analytics-events";
const CONSENT_KEY = "resourcepulse-analytics-consent";

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

export const GA_MEASUREMENT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GA_MEASUREMENT_ID) ||
  (typeof window !== "undefined" && window.GA_MEASUREMENT_ID) ||
  "G-D9MYQRB4QR";

let isInitialized = false;

/**
 * Configure user analytics privacy consent
 */
export function setAnalyticsConsent(enabled: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, String(enabled));
  } catch {
    // Privacy controls should never block the product.
  }
}

/**
 * Check if analytics consent is granted
 */
export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Initialize Google Analytics 4
 */
export function initGA(id: string = GA_MEASUREMENT_ID): void {
  if (typeof window === "undefined") return;
  if (!id || id.trim() === "" || id === "G-XXXXXXXXXX") {
    // Graceful no-op when measurement ID is not configured yet
    return;
  }

  if (isInitialized) return;

  try {
    // 1. Initialize dataLayer & gtag
    window.dataLayer = window.dataLayer || [];
    const gtagFunc = (...args: any[]) => {
      window.dataLayer.push(args);
    };
    window.gtag = gtagFunc;

    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: true,
      page_path: window.location.pathname,
    });

    // 2. Load script asynchronously if not already present
    const existingScript = document.getElementById("ga4-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "ga4-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    }

    isInitialized = true;
    console.info(`[Analytics] Google Analytics 4 initialized (${id})`);
  } catch (err) {
    console.warn("[Analytics] Failed to initialize GA4:", err);
  }
}

/**
 * Track an analytics event (both local telemetry log and Google Analytics 4)
 */
export function track(event: string, properties: AnalyticsProperties = {}): void {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== "true") return;

    // 1. Store locally for offline / audit telemetry
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<{
      event: string;
      properties: AnalyticsProperties;
      at: string;
    }>;
    existing.push({ event, properties, at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-100)));

    // 2. Forward to GA4 if initialized
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", event, properties);
    }
  } catch {
    // Analytics must remain best-effort and non-blocking.
  }
}

/**
 * Track Page Views
 */
export function trackPageView(path: string = window.location.pathname, title?: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  try {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title || document.title,
    });
  } catch {
    // silent fallback
  }
}
