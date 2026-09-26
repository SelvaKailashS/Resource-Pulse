type AnalyticsProperties = Record<string, string | number | boolean | null>;

const STORAGE_KEY = "resourcepulse-analytics-events";

export function setAnalyticsConsent(enabled: boolean) {
  try {
    localStorage.setItem("resourcepulse-analytics-consent", String(enabled));
  } catch {
    // Privacy controls should never block the product.
  }
}

export function track(event: string, properties: AnalyticsProperties = {}) {
  try {
    if (localStorage.getItem("resourcepulse-analytics-consent") !== "true") return;
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<{ event: string; properties: AnalyticsProperties; at: string }>;
    existing.push({ event, properties, at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-100)));
  } catch {
    // Analytics must remain best-effort and non-blocking.
  }
}
