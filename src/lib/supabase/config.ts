export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Values copied straight from .env.local.example look configured but fail at
 * DNS, surfacing as an opaque "Failed to fetch" in the browser. Catch them here
 * so the setup screen explains the problem instead.
 */
function describeConfigProblem(): string | null {
  if (!SUPABASE_URL) return "NEXT_PUBLIC_SUPABASE_URL is not set.";
  if (!SUPABASE_ANON_KEY) return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.";

  let parsed: URL;
  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL is not a valid URL ("${SUPABASE_URL}"). It should look like https://abcdefghijklmnop.supabase.co.`;
  }

  if (parsed.hostname.includes("your-project") || parsed.hostname === "your_supabase_url") {
    return "NEXT_PUBLIC_SUPABASE_URL is still the placeholder from .env.local.example. Copy the Project URL from Supabase → Project Settings → API.";
  }

  if (SUPABASE_ANON_KEY.startsWith("your_") || SUPABASE_ANON_KEY.length < 20) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a real key. Copy the publishable (anon) key from Supabase → Project Settings → API.";
  }

  // Secret keys must never reach the browser bundle.
  if (SUPABASE_ANON_KEY.startsWith("sb_secret_") || SUPABASE_ANON_KEY.startsWith("service_role")) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY holds a secret key. Use the publishable (anon) key here — the secret one belongs in SUPABASE_SERVICE_ROLE_KEY.";
  }

  return null;
}

export const configProblem = describeConfigProblem();
export const isSupabaseConfigured = configProblem === null;
