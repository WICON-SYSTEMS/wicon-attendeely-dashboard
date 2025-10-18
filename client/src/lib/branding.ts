import wiconlogo from "@/assets/wicon-logo.png";

export const BRAND_NAME = "WiCon";
export const BRAND_COMPANY = "WiCon Technologies";

// URL to the brand logo image (Vite will handle bundling)
export function getBrandLogoUrl(): string {
  return wiconlogo;
}

// Suggest a consistent filename for downloads, easy to swap later
export function getDownloadFileName(base: string): string {
  // Ensure no spaces and lowercase for consistency
  const prefix = BRAND_NAME.toLowerCase();
  return `${prefix}_${base}`;
}

// Optional: CSV helper to prepend a brand header row
export function brandCsvHeaderRow(): string[] {
  return ["brand", BRAND_NAME, "company", BRAND_COMPANY];
}
