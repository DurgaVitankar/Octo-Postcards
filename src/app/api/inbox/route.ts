import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// The signed-in person's received postcards, newest first, with short-lived
// links to the card's pictures (the storage bucket is private).

const BUCKET = "postcards";
const LINK_SECONDS = 60 * 60;

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sbService = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!sbUrl.startsWith("http") || !sbAnon || !sbService) {
    return NextResponse.json({ postcards: [], note: "Received postcards aren't available here." });
  }

  let email = "";
  if (token) {
    try {
      const { data } = await createClient(sbUrl, sbAnon).auth.getUser(token);
      email = (data.user?.email ?? "").toLowerCase();
    } catch {
      /* not signed in */
    }
  }
  if (!email) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const db = createClient(sbUrl, sbService);
  const { data: rows, error } = await db
    .from("postcards")
    .select("image_key, sender_email, message, orientation, sent_at")
    .eq("recipient_email", email)
    .not("image_key", "is", null)
    .order("sent_at", { ascending: false })
    .limit(60);
  if (error) {
    console.error("Inbox query failed:", error);
    return NextResponse.json({ error: "Couldn't load your postcards." }, { status: 500 });
  }
  if (!rows?.length) return NextResponse.json({ postcards: [] });

  // One batch of signed links for every picture
  const paths = rows.flatMap((r) => [`${r.image_key}/front.jpg`, `${r.image_key}/back.jpg`]);
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(paths, LINK_SECONDS);
  const link = new Map((signed ?? []).filter((s) => s.signedUrl && !s.error).map((s) => [s.path, s.signedUrl]));

  const postcards = rows
    .map((r) => ({
      id: r.image_key as string,
      from: r.sender_email as string,
      message: (r.message as string) || "",
      landscape: r.orientation === "landscape",
      sentAt: r.sent_at as string,
      front: link.get(`${r.image_key}/front.jpg`) || null,
      back: link.get(`${r.image_key}/back.jpg`) || null,
    }))
    .filter((p) => p.front);

  return NextResponse.json({ postcards }, { headers: { "Cache-Control": "no-store" } });
}
