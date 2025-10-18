const PAYOUT_API_URL = import.meta.env.VITE_PAYOUT_API_URL || "https://sandbox.fapshi.com";
const PAYOUT_API_KEY = import.meta.env.VITE_PAYOUT_API_KEY || "";
const PAYOUT_API_USER = import.meta.env.VITE_PAYOUT_API_USER || "";

export type PayoutMedium = "mobile money" | "orange money";

export interface PayoutRequest {
  amount: number;
  phone: string;
  medium: PayoutMedium;
  name: string;
  email: string;
  userId: string;
  externalId: string;
  message?: string;
}

export interface PayoutResponse {
  status: string;
  message?: string;
  data?: any;
}

export function getPayoutEnvInfo() {
  const env = PAYOUT_API_URL.includes("sandbox") ? "Sandbox" : "Production";
  return { env, url: PAYOUT_API_URL, hasCreds: Boolean(PAYOUT_API_KEY && PAYOUT_API_USER) };
}

export async function sendPayout(req: PayoutRequest): Promise<PayoutResponse> {
  if (!PAYOUT_API_KEY || !PAYOUT_API_USER) {
    throw new Error("Payout credentials are not configured");
  }
  const res = await fetch(`${PAYOUT_API_URL}/payout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PAYOUT_API_KEY,
      apiuser: PAYOUT_API_USER,
    } as Record<string, string>,
    body: JSON.stringify(req),
  });
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) {
    const message = json?.message || text || "Payout request failed";
    throw new Error(message);
  }
  return json as PayoutResponse;
}
