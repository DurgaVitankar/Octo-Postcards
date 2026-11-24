import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Sends a postcard by email. The card's images travel inside the email as
// inline attachments (cid:), so no file hosting is needed.
//
// Mail goes out through Gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set,
// otherwise through Resend (RESEND_API_KEY). Only signed-in people can send,
// and each person can send DAILY_LIMIT postcards in any 24 hours.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAMPS = new Set(["yarrow", "peppermint", "rosemary", "anemone", "lotus", "laurel"]);
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const DAILY_LIMIT = Number(process.env.POSTCARDS_DAILY_LIMIT) || 10;
// Where "Send a postcard back" leads. Always the live site: preview links are
// private to the Vercel account, so a friend couldn't open them.
const APP_URL = (process.env.APP_URL || "https://octo-postcards.vercel.app").replace(/\/+$/, "");

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
  const gmailUser = process.env.GMAIL_USER || "";
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  const useGmail = !!(gmailUser && gmailPass);
  if (!useGmail && !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Sending isn't set up on this site yet." }, { status: 503 });
  }

  // Who it's from: only signed-in people can send
  let sender = "";
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (body.accessToken && sbUrl.startsWith("http") && sbAnon) {
    try {
      const { data } = await createClient(sbUrl, sbAnon).auth.getUser(body.accessToken);
      sender = data.user?.email ?? "";
    } catch {
      /* not signed in */
    }
  }
  if (!sender) {
    return NextResponse.json({ error: "Please sign in again to send postcards." }, { status: 401 });
  }

  // Daily cap, counted from the postcards already sent (needs the service role key)
  const sbService = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const db = sbUrl.startsWith("http") && sbService ? createClient(sbUrl, sbService) : null;
  if (db) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await db
      .from("postcards")
      .select("*", { count: "exact", head: true })
      .eq("sender_email", sender.toLowerCase())
      .gte("sent_at", since);
    if (countErr) {
      // Without the count there's no cap, so don't send
      console.error("Daily limit check failed:", countErr);
      return NextResponse.json({ error: "Sending is paused for a moment. Please try again later." }, { status: 503 });
    }
    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `You've sent ${DAILY_LIMIT} postcards today. Try again tomorrow.` },
        { status: 429 },
      );
    }
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY isn't set here, so the daily limit isn't enforced.");
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

  const intro = `${esc(sender)} sent you a postcard`;
  const replyUrl = `${APP_URL}/login.html?reply=${encodeURIComponent(sender)}`;
  const html = front && back ? buildSnapshotEmail(intro, portrait, body.message ?? "", replyUrl) : buildPostcardEmail({
    message: body.message ?? "",
    to: body.to ?? {},
    sender,
    portrait,
    hasPhoto: !!photo,
    stampUrl: stamp ? `${origin}/stamps/stamp-${stamp}.webp` : null,
    typewriter: body.font === "type",
    replyUrl,
  });

  const subject = `You received a postcard from ${sender}`;
  const text = `${sender} sent you a postcard.\n\n${String(body.message ?? "").slice(0, 2000)}\n\nSend a postcard back: ${replyUrl}\n\nSent with Postcards`;
  const attachments = front && back
    ? [
        { filename: "postcard-front.jpg", content: front.content, contentType: front.type, cid: "postcard-front" },
        { filename: "postcard-back.jpg", content: back.content, contentType: back.type, cid: "postcard-back" },
      ]
    : photo
      ? [{ filename: `postcard.${photo.type.split("/")[1]}`, content: photo.content, contentType: photo.type, cid: "postcard-photo" }]
      : [];

  if (useGmail) {
    try {
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transport.sendMail({
        from: { name: "Postcards", address: gmailUser },
        replyTo: sender,
        to: recipient,
        subject,
        html,
        text,
        attachments,
      });
    } catch (err) {
      console.error("Gmail error:", err);
      return NextResponse.json({ error: "The postcard couldn't be sent. Please try again." }, { status: 502 });
    }
  } else {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "Postcards <onboarding@resend.dev>",
      replyTo: sender,
      to: recipient,
      subject,
      html,
      text,
      attachments: attachments.length
        ? attachments.map(({ cid, ...a }) => ({ ...a, contentId: cid }))
        : undefined,
    });
    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "The postcard couldn't be sent. Please try again." }, { status: 502 });
    }
  }

  // Keep a record (this is also what the daily limit counts), with the card's
  // pictures in private storage so it shows up in the recipient's gallery
  if (db) {
    const imageKey = await storeImages(db, postcardId, front, back, photo);
    const row = {
      sender_email: sender.toLowerCase(),
      recipient_email: recipient.toLowerCase(),
      message: String(body.message ?? "").slice(0, 2000),
      orientation: portrait ? "portrait" : "landscape",
      stamp_emoji: stamp ?? "",
      status: "sent",
      sent_at: new Date().toISOString(),
    };
    let { error: dbErr } = await db.from("postcards").insert({ ...row, image_key: imageKey });
    // Older table without the image_key column: still keep the record
    if (dbErr && /image_key/.test(dbErr.message || "")) ({ error: dbErr } = await db.from("postcards").insert(row));
    if (dbErr) console.error("Postcard sent but not recorded:", dbErr);
  }

  return NextResponse.json({ success: true, id: postcardId });
}

const BUCKET = "postcards";

// Upload the card's pictures to private storage as <key>/front.jpg and
// <key>/back.jpg (or just front, when only the photo came). Returns the key,
// or null if storage isn't available; the email has already gone out.
async function storeImages(
  db: SupabaseClient,
  key: string,
  front: Img | null,
  back: Img | null,
  photo: Img | null,
): Promise<string | null> {
  const files: [string, Img][] = front && back ? [["front", front], ["back", back]] : photo ? [["front", photo]] : [];
  if (!files.length) return null;
  const upload = () =>
    Promise.all(
      files.map(([name, img]) =>
        db.storage.from(BUCKET).upload(`${key}/${name}.jpg`, img.content, { contentType: img.type, upsert: true }),
      ),
    );
  try {
    let results = await upload();
    if (results.some((r) => r.error && /bucket not found/i.test(r.error.message))) {
      await db.storage.createBucket(BUCKET, { public: false });
      results = await upload();
    }
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error("Couldn't store the postcard's pictures:", failed.error);
      return null;
    }
    return key;
  } catch (err) {
    console.error("Couldn't store the postcard's pictures:", err);
    return null;
  }
}

// "Send a postcard back": a button that works in every email app
function replyButton(url: string) {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:26px auto 0;border-collapse:separate;">
      <tr><td align="center" bgcolor="#a3402f" style="border-radius:999px;">
        <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:12px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Send a postcard back</a>
      </td></tr>
    </table>
    <p style="margin:10px 0 0;text-align:center;font-size:12px;color:#8a8a8a;">Sign in with your email, design a card, and drop it in the mailbox.</p>`;
}

// The card's two faces as pictures, so every email app shows them exactly as designed
function buildSnapshotEmail(intro: string, portrait: boolean, message: string, replyUrl: string) {
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
    ${replyButton(replyUrl)}
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
  replyUrl: string;
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

    ${replyButton(o.replyUrl)}
    <p style="margin:22px 0 0;text-align:center;font-size:11px;color:#9a9a9a;">Sent with Postcards</p>
  </div>
</body>
</html>`;
}
