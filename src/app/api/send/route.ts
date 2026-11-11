import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY || "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
  try {
    const body = await req.json();
    const { recipientEmail, senderEmail, message, imageUrl, orientation, bgColor, stampEmoji } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
    }
    const from = senderEmail || "someone";

    // Save to database (best-effort — skip if permission denied)
    let postcardId = crypto.randomUUID();
    try {
      const { data: postcard, error: dbError } = await supabase
        .from("postcards")
        .insert({
          sender_email: from,
          recipient_email: recipientEmail,
          message,
          image_url: imageUrl,
          orientation: orientation || "portrait",
          bg_color: bgColor || "#f5f5f3",
          stamp_emoji: stampEmoji || "leaf",
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.warn("DB error (continuing anyway):", dbError.message);
      } else if (postcard) {
        postcardId = postcard.id;
      }
    } catch (dbErr) {
      console.warn("DB exception (continuing anyway):", dbErr);
    }

    const isPortrait = (orientation || "portrait") === "portrait";
    const cardW = isPortrait ? 480 : 720;
    const cardH = isPortrait ? 720 : 480;

    const htmlEmail = buildPostcardEmail({
      message,
      imageUrl,
      bgColor: bgColor || "#f5f5f3",
      stampEmoji: stampEmoji || "leaf",
      senderEmail: from,
      cardW,
      cardH,
      isPortrait,
      postcardId,
    });

    const { error: emailError } = await resend.emails.send({
      from: "Postcards <onboarding@resend.dev>",
      to: recipientEmail,
      subject: `You received a postcard from ${from}`,
      html: htmlEmail,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: String(emailError) }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: postcardId });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function buildPostcardEmail({
  message,
  imageUrl,
  bgColor,
  stampEmoji,
  senderEmail,
  cardW,
  cardH,
  isPortrait,
  postcardId,
}: {
  message?: string;
  imageUrl?: string;
  bgColor: string;
  stampEmoji: string;
  senderEmail: string;
  cardW: number;
  cardH: number;
  isPortrait: boolean;
  postcardId: string;
}) {
  const dividerX = isPortrait ? cardH * 0.55 : cardW * 0.55;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A postcard for you</title>
</head>
<body style="margin:0;padding:40px 20px;background:#e8e4dc;font-family:Georgia,serif;">
  <div style="max-width:${cardW}px;margin:0 auto;">
    <p style="text-align:center;color:#666;font-size:13px;margin-bottom:16px;letter-spacing:0.05em;text-transform:uppercase;">You received a postcard</p>

    <div style="width:${cardW}px;height:${isPortrait ? dividerX : cardH}px;background:${bgColor};border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.15);margin-bottom:4px;">
      ${imageUrl
        ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;" alt="Postcard image">`
        : `<div style="width:100%;height:100%;background:${bgColor};"></div>`
      }
    </div>

    <div style="width:${cardW}px;background:#fff9f0;border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,0.15);padding:24px 28px;box-sizing:border-box;">
      <div style="display:flex;gap:20px;">
        <div style="flex:1;border-right:1px solid #ddd;padding-right:20px;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;">${message || ""}</p>
        </div>
        <div style="width:140px;text-align:right;">
          <p style="margin:0 0 8px;font-size:11px;color:#999;letter-spacing:0.08em;text-transform:uppercase;">From</p>
          <p style="margin:0;font-size:13px;color:#555;">${senderEmail}</p>
        </div>
      </div>
    </div>

    <p style="text-align:center;color:#999;font-size:11px;margin-top:24px;">Sent with Postcards</p>
  </div>
</body>
</html>`;
}
