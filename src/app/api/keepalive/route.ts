import { createClient } from "@supabase/supabase-js";

// Called once a day by a Vercel scheduled job (see vercel.json) so the free
// Supabase project never sits idle long enough to be paused. It makes one tiny
// read from the database and nothing else.
//
// If CRON_SECRET is set in Vercel, only Vercel's scheduler (which sends it as a
// Bearer token) can call this.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url.startsWith("http") || !key) {
    return Response.json({ ok: false, error: "Supabase isn't configured here." }, { status: 503 });
  }

  const { error } = await createClient(url, key)
    .from("postcards")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("Keep-alive query failed:", error);
    return Response.json({ ok: false }, { status: 502 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
