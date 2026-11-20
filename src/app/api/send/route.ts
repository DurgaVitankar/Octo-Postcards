import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// Sends a postcard by email. The card's photo travels inside the email as an
// inline image (cid:), so no file hosting is needed.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAMPS = new Set(["yarrow", "peppermint", "rosemary", "anemone", "lotus", "laurel"]);
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

type Img = { content: Buffer; type: string };

// A data: URL image, or null. Throws "too large" past the size limit.
function dataImage(url?: string): Img | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url ?? "");
  if (!m) return null;
  const content = Buffer.from(m[2], "base64");
  if (content.length > MAX_PHOTO_BYTES) throw new Error("too large");
  return { content, type: m[1] };
}

type Body = {
  recipientEmail?: string;
  message?: string;
  to?: { name?: string; address?: string; city?: string; postal?: string };
  photo?: string; // data:image/jpeg;base64,... (fallback when no snapshots)
  front?: string; // snapshot of the card's front, as designed
  back?: string; // snapshot of the card's back, as designed
  orientation?: "portrait" | "landscape";
  stamp?: string | null;
  font?: "hand" | "type";
  accessToken?: string;
};

const esc = (s: unknown) =>
  String(s ?? "")
    .slice(0, 2000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That request couldn't be read." }, { status: 400 });
  }

  const recipient = String(body.recipientEmail ?? "").trim();
  if (!EMAIL_RE.test(recipient) || recipient.length > 254) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Sending isn't set up on this site yet." }, { status: 503 });
  }

  // Who it's from: the signed-in user, if the request carries their session
  let sender = "";
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (body.accessToken && sbUrl.startsWith("http") && sbAnon) {
    try {
      const { data } = await createClient(sbUrl, sbAnon).auth.getUser(body.accessToken);
      sender = data.user?.email ?? "";
    } catch {
      /* treat as a guest */
    }
  }

  // Images, as inline attachments: snapshots of both faces when the browser
  // could make them, otherwise just the photo
  let photo: Img | null = null, front: Img | null = null, back: Img | null = null;
  try {
    front = dataImage(body.front);
    back = dataImage(body.back);
    if (!front || !back) { front = back = null; photo = dataImage(body.photo); }
  } catch {
    return NextResponse.json({ error: "That postcard is too large to send." }, { status: 413 });
  }

  const portrait = body.orientation !== "landscape";
  const stamp = body.stamp && STAMPS.has(body.stamp) ? body.stamp : null;
  const origin = req.nextUrl.origin;
  const postcardId = crypto.randomUUID();

  const intro = sender ? `${esc(sender)} sent you a postcard` : "Someone sent you a postcard";
  const html = front && back ? buildSnapshotEmail(intro, body.orientation !== "landscape", body.message ?? "") : buildPostcardEmail({
    message: body.message ?? "",
    to: body.to ?? {},
    sender,
    portrait,
    hasPhoto: !!photo,
    stampUrl: stamp ? `${origin}/stamps/stamp-${stamp}.webp` : null,
    typewriter: body.font === "type",
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "Postcards <onboarding@resend.dev>",
    to: recipient,
    subject: sender ? `You received a postcard from ${sender}` : "You received a postcard",
    html,
    text: `${sender ? `${sender} sent you a postcard` : "Someone sent you a postcard"}.\n\n${String(body.message ?? "").slice(0, 2000)}\n\nSent with Postcards`,
    attachments: front && back
      ? [
          { filename: "postcard-front.jpg", content: front.content, contentType: front.type, contentId: "postcard-front" },
          { filename: "postcard-back.jpg", content: back.content, contentType: back.type, contentId: "postcard-back" },
        ]
      : photo
        ? [{ filename: `postcard.${photo.type.split("/")[1]}`, content: photo.content, contentType: photo.type, contentId: "postcard-photo" }]
        : undefined,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message || "The email couldn't be sent." }, { status: 502 });
  }

  // Keep a record (best effort; needs the service role key)
  try {
    const sbService = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (sbUrl.startsWith("http") && sbService) {
      await createClient(sbUrl, sbService).from("postcards").insert({
        sender_email: sender || "guest",
        recipient_email: recipient,
        message: String(body.message ?? "").slice(0, 2000),
        orientation: portrait ? "portrait" : "landscape",
        stamp_emoji: stamp ?? "",
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }
  } catch (dbErr) {
    console.warn("Postcard saved to email only (database insert failed):", dbErr);
  }

  return NextResponse.json({ success: true, id: postcardId });
}

// The card's two faces as pictures, so every email app shows them exactly as designed
function buildSnapshotEmail(intro: string, portrait: boolean, message: string) {
  const w = portrait ? 420 : 600;
  const img = (cid: string, alt: string) =>
    `<img src="cid:${cid}" width="${w}" alt="${alt}" style="display:block;width:100%;max-width:${w}px;height:auto;border-radius:8px;box-shadow:0 2px 18px rgba(0,0,0,0.08);">`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A postcard for you</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1d;">
  <div style="max-width:${w}px;margin:0 auto;">
    <p style="margin:0 0 14px;text-align:center;font-size:13px;color:#6b6b6b;">${intro}</p>
    ${img("postcard-front", "The front of the postcard")}
    <div style="height:16px;line-height:16px;">&nbsp;</div>
    ${img("postcard-back", `The back of the postcard. Message: ${esc(message)}`)}
    <p style="margin:22px 0 0;text-align:center;font-size:11px;color:#9a9a9a;">Sent with Postcards</p>
  </div>
</body>
</html>`;
}

function buildPostcardEmail(o: {
  message: string;
  to: Body["to"] & object;
  sender: string;
  portrait: boolean;
  hasPhoto: boolean;
  stampUrl: string | null;
  typewriter: boolean;
}) {
  const w = o.portrait ? 420 : 600;
  const h = o.portrait ? 588 : 400;
  const write = o.typewriter
    ? "'Courier New', Courier, monospace"
    : "'Tangerine', 'Snell Roundhand', 'Apple Chancery', 'Segoe Script', cursive";
  const writeSize = o.typewriter ? "14px" : "26px";
  const lines = [o.to.name, o.to.address, o.to.city, o.to.postal].filter((l) => l && String(l).trim());
  const front = o.hasPhoto
    ? `<img src="cid:postcard-photo" width="${w - 28}" height="${h - 28}" alt="Postcard photo" style="display:block;width:${w - 28}px;height:${h - 28}px;object-fit:cover;border-radius:2px;">`
    : `<div style="width:${w - 28}px;height:${h - 28}px;background:#f4f1ec;border-radius:2px;"></div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">
<title>A postcard for you</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1d;">
  <div style="max-width:${w}px;margin:0 auto;">
    <p style="margin:0 0 14px;text-align:center;font-size:13px;color:#6b6b6b;">${o.sender ? `${esc(o.sender)} sent you a postcard` : "Someone sent you a postcard"}</p>

    <!-- Front -->
    <div style="background:#fff;padding:14px;border-radius:8px;box-shadow:0 2px 18px rgba(0,0,0,0.08);">${front}</div>

    <!-- Back -->
    <div style="margin-top:16px;background:#fff;padding:24px 26px;border-radius:8px;box-shadow:0 2px 18px rgba(0,0,0,0.08);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-family:'Libre Baskerville',Georgia,serif;font-weight:700;font-size:14px;letter-spacing:0.22em;">POSTCARD</div>
            <div style="font-family:'Tangerine','Snell Roundhand',cursive;font-size:18px;line-height:1;color:#a8979e;">with love</div>
          </td>
          <td style="vertical-align:top;text-align:right;width:70px;">
            ${o.stampUrl ? `<img src="${o.stampUrl}" width="56" alt="Stamp" style="display:inline-block;width:56px;height:auto;">` : `<div style="display:inline-block;width:52px;height:72px;border:1px dashed #c9a6ad;"></div>`}
          </td>
        </tr>
      </table>
      ${lines.length ? `<div style="margin-top:14px;">${lines.map((l) => `<div style="border-bottom:1px solid #e6e3df;padding:6px 2px 2px;font-family:${write};font-size:${writeSize};color:#3a3a3a;">${esc(l)}</div>`).join("")}</div>` : ""}
      <div style="margin-top:22px;font-family:${write};font-size:${writeSize};line-height:1.5;color:#3a3a3a;white-space:pre-wrap;">${esc(o.message) || "&nbsp;"}</div>
    </div>

    <p style="margin:22px 0 0;text-align:center;font-size:11px;color:#9a9a9a;">Sent with Postcards</p>
  </div>
</body>
</html>`;
}
