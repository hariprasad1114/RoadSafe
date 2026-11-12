import { createClient } from "@insforge/sdk";

const baseUrl = import.meta.env.VITE_INSFORGE_URL;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

export const isInsForgeConfigured = Boolean(baseUrl && anonKey);

export const insforge = createClient({
  baseUrl: baseUrl || "http://localhost:7130",
  anonKey: anonKey || "missing-anon-key",
});

export async function getAccessToken(): Promise<string | null> {
  try {
    return await insforge.getHttpClient().getValidAccessToken();
  } catch {
    return null;
  }
}
