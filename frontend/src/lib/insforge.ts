import { createClient } from "@insforge/sdk";

const DEFAULT_INSFORGE_URL = "https://ybxnq7bx.us-east.insforge.app";
const DEFAULT_INSFORGE_ANON_KEY =
  "anon_3278f70aacd89b9e5edcb9ba43b25f77ff9a85628482fdf66dc7c740aa3068f1";

const baseUrl = (import.meta.env.VITE_INSFORGE_URL || DEFAULT_INSFORGE_URL).trim();
const anonKey = (import.meta.env.VITE_INSFORGE_ANON_KEY || DEFAULT_INSFORGE_ANON_KEY).trim();

export const isInsForgeConfigured = Boolean(baseUrl && anonKey);

export const insforge = createClient({
  baseUrl,
  anonKey,
});

export async function getAccessToken(): Promise<string | null> {
  try {
    return await insforge.getHttpClient().getValidAccessToken();
  } catch {
    return null;
  }
}
