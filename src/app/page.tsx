"use client";

import { useState, useRef } from "react";

const BG_COLORS = ["#f0ede8", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#1a1a2e", "#2d1b4e", "#0f2027"];
const STAMPS = ["🌿", "🌸", "🏔️", "🌊", "🌙", "☀️", "🦋", "🍂", "✨", "🌺", "🎋", "🗺️"];

type Step = "compose" | "address" | "sent";
type Orientation = "portrait" | "landscape";
type Side = "front" | "back";

interface PostcardState {
  message: string;
  imageUrl: string | null;
  imageFile: File | null;
  bgColor: string;
  stampEmoji: string;
  orientation: Orientation;
}

export default function Home() {
  const [step, setStep] = useState<Step>("compose");
  const [side, setSide] = useState<Side>("front");
  const [postcard, setPostcard] = useState<PostcardState>({
    message: "",
    imageUrl: null,
    imageFile: null,
    bgColor: "#f0ede8",
    stampEmoji: "🌿",
    orientation: "landscape",
  });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showStamps, setShowStamps] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPortrait = postcard.orientation === "portrait";

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPostcard((p) => ({ ...p, imageUrl: url, imageFile: file }));
  }

  async function uploadImage(file: File): Promise<string | null> {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("postcard-images").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("postcard-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSend() {
    if (!recipientEmail || !senderEmail) {
      setError("Please fill in both email addresses.");
      return;
    }
    setError("");
    setSending(true);
    try {
      let imageUrl = postcard.imageUrl;
      if (postcard.imageFile) {
        imageUrl = await uploadImage(postcard.imageFile);
      }
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          senderEmail,
          message: postcard.message,
          imageUrl,
          orientation: postcard.orientation,
          bgColor: postcard.bgColor,
          stampEmoji: postcard.stampEmoji,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setStep("sent");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setPostcard({ message: "", imageUrl: null, imageFile: null, bgColor: "#f0ede8", stampEmoji: "🌿", orientation: "landscape" });
    setRecipientEmail("");
    setSenderEmail("");
    setSide("front");
    setStep("compose");
    setError("");
    setShowStamps(false);
    setShowColors(false);
  }

  if (step === "sent") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0ede8" }}>
        <div className="text-center">
          <div className="text-5xl mb-6">{postcard.stampEmoji}</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#333", marginBottom: 8 }}>Postcard sent.</h2>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 32 }}>On its way to {recipientEmail}</p>
          <button onClick={handleReset} style={{ fontSize: 13, color: "#666", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  if (step === "address") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0ede8" }}>
        <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 20 }}>
          <button onClick={() => setStep("compose")} style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 4 }}>
            ← back
          </button>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#333", margin: 0 }}>Who's it going to?</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Recipient's email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="their@email.com"
                style={{ width: "100%", border: "1px solid #ddd", borderRadius: 6, padding: "10px 12px", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Your email</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@email.com"
                style={{ width: "100%", border: "1px solid #ddd", borderRadius: 6, padding: "10px 12px", fontSize: 14, background: "#fff", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
          {error && <p style={{ color: "#e55", fontSize: 13, margin: 0 }}>{error}</p>}
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              width: "100%", padding: "13px", background: sending ? "#999" : "#1a1a1a", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 14, cursor: sending ? "default" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {sending ? "Sending..." : "Send postcard ✈"}
          </button>
          <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", margin: 0 }}>
            Delivered to their inbox right away.
          </p>
        </div>
      </div>
    );
  }

  const cardW = isPortrait ? 480 : 680;
  const cardH = isPortrait ? 640 : 460;

  return (
    <div style={{ minHeight: "100vh", background: "#f0ede8", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}>
        <div style={{ fontSize: 13, color: "#555" }}>
          <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 15 }}>Postcards</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleReset}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #ddd", borderRadius: 20, background: "#fff", fontSize: 13, color: "#555", cursor: "pointer" }}
          >
            ↺ Reset
          </button>
          <button
            onClick={() => setStep("address")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 18px", border: "none", borderRadius: 20, background: "#1a1a1a", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 500 }}
          >
            Send ✈
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Left sidebar */}
        <div style={{ width: 72, padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderRight: "1px solid rgba(0,0,0,0.07)" }}>
          {/* Orientation */}
          <button
            onClick={() => setPostcard((p) => ({ ...p, orientation: p.orientation === "portrait" ? "landscape" : "portrait" }))}
            style={{
              width: 48, height: 48, borderRadius: 10, border: "1px solid #ddd", background: "#fff",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 2, cursor: "pointer", marginBottom: 4,
            }}
            title="Toggle orientation"
          >
            <div style={{
              width: isPortrait ? 14 : 20, height: isPortrait ? 20 : 14,
              border: "1.5px solid #555", borderRadius: 2,
            }} />
            <span style={{ fontSize: 9, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>orient</span>
          </button>

          {/* Front side */}
          <button
            onClick={() => setSide("front")}
            style={{
              width: 48, padding: "6px 4px 4px", borderRadius: 10,
              border: side === "front" ? "1.5px solid #333" : "1px solid #ddd",
              background: side === "front" ? "#fff" : "transparent",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <div style={{
              width: 32, height: isPortrait ? 42 : 28, borderRadius: 3,
              backgroundImage: postcard.imageUrl ? `url(${postcard.imageUrl})` : `linear-gradient(${postcard.bgColor}, ${postcard.bgColor})`,
              backgroundSize: "cover", backgroundPosition: "center",
              border: "1px solid rgba(0,0,0,0.08)",
            }} />
            <span style={{ fontSize: 9, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase" }}>front</span>
          </button>

          {/* Back side */}
          <button
            onClick={() => setSide("back")}
            style={{
              width: 48, padding: "6px 4px 4px", borderRadius: 10,
              border: side === "back" ? "1.5px solid #333" : "1px solid #ddd",
              background: side === "back" ? "#fff" : "transparent",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <div style={{
              width: 32, height: isPortrait ? 42 : 28, borderRadius: 3, background: "#fff9f0",
              border: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column",
              justifyContent: "flex-end", padding: 3, boxSizing: "border-box", gap: 2,
            }}>
              <div style={{ height: 2, background: "#ddd", borderRadius: 1 }} />
              <div style={{ height: 2, background: "#ddd", borderRadius: 1 }} />
              <div style={{ height: 2, background: "#eee", borderRadius: 1, width: "60%" }} />
            </div>
            <span style={{ fontSize: 9, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase" }}>back</span>
          </button>

          {/* Stamp / color picker at bottom */}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", paddingBottom: 16 }}>
            {/* Color */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setShowColors((v) => !v); setShowStamps(false); }}
                style={{
                  width: 36, height: 36, borderRadius: "50%", background: postcard.bgColor,
                  border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", cursor: "pointer",
                }}
                title="Background color"
              />
              {showColors && (
                <div style={{
                  position: "absolute", left: 44, bottom: 0,
                  background: "#fff", borderRadius: 12, padding: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 6, zIndex: 10,
                }}>
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setPostcard((p) => ({ ...p, bgColor: c })); setShowColors(false); }}
                      style={{
                        width: 24, height: 24, borderRadius: "50%", background: c,
                        border: postcard.bgColor === c ? "2px solid #333" : "2px solid transparent",
                        cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Stamp */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setShowStamps((v) => !v); setShowColors(false); }}
                style={{
                  width: 36, height: 36, borderRadius: "50%", background: "#1a1a1a",
                  border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}
                title="Pick stamp"
              >
                {postcard.stampEmoji}
              </button>
              {showStamps && (
                <div style={{
                  position: "absolute", left: 44, bottom: 0,
                  background: "#fff", borderRadius: 12, padding: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, zIndex: 10,
                }}>
                  {STAMPS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setPostcard((p) => ({ ...p, stampEmoji: s })); setShowStamps(false); }}
                      style={{
                        width: 32, height: 32, borderRadius: 6, fontSize: 16, cursor: "pointer",
                        background: postcard.stampEmoji === s ? "#f0ede8" : "transparent",
                        border: postcard.stampEmoji === s ? "1px solid #ccc" : "1px solid transparent",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          {side === "front" ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: cardW, height: cardH,
                background: postcard.bgColor,
                borderRadius: 8,
                boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
                position: "relative",
                cursor: "pointer",
                overflow: "hidden",
                border: postcard.imageUrl ? "none" : "2px dashed rgba(0,0,0,0.12)",
                boxSizing: "border-box",
              }}
            >
              {postcard.imageUrl ? (
                <img src={postcard.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "rgba(0,0,0,0.3)" }}>+</div>
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.3)", fontFamily: "sans-serif" }}>Add image</span>
                </div>
              )}
              {/* Stamp */}
              <div style={{
                position: "absolute", top: 14, right: 14,
                fontSize: 22, background: "rgba(255,255,255,0.9)", borderRadius: 5,
                padding: "4px 7px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", lineHeight: 1,
              }}>
                {postcard.stampEmoji}
              </div>
              {postcard.imageUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPostcard((p) => ({ ...p, imageUrl: null, imageFile: null })); }}
                  style={{
                    position: "absolute", top: 14, left: 14,
                    background: "rgba(0,0,0,0.5)", color: "#fff", border: "none",
                    borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div style={{
              width: cardW, height: cardH,
              background: "#fff9f0",
              borderRadius: 8,
              boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
            }}>
              {/* Divider */}
              <div style={{
                position: "absolute",
                [isPortrait ? "top" : "left"]: "50%",
                [isPortrait ? "left" : "top"]: 0,
                [isPortrait ? "width" : "height"]: "100%",
                [isPortrait ? "height" : "width"]: 1,
                background: "#e0d9ce",
              }} />

              {/* Message */}
              <textarea
                value={postcard.message}
                onChange={(e) => setPostcard((p) => ({ ...p, message: e.target.value }))}
                placeholder="Write something..."
                maxLength={300}
                style={{
                  position: "absolute",
                  top: 24, left: 24,
                  width: isPortrait ? "calc(100% - 48px)" : "calc(50% - 36px)",
                  height: isPortrait ? "calc(50% - 36px)" : "calc(100% - 48px)",
                  background: "transparent", border: "none", outline: "none",
                  resize: "none", fontFamily: "Georgia, serif", fontSize: 14,
                  lineHeight: 1.75, color: "#333",
                }}
              />

              {/* Address area */}
              <div style={{
                position: "absolute",
                bottom: isPortrait ? 24 : undefined,
                top: isPortrait ? undefined : 24,
                right: 24,
                left: isPortrait ? 24 : undefined,
                width: isPortrait ? "calc(100% - 48px)" : "calc(50% - 36px)",
                height: isPortrait ? "calc(50% - 36px)" : "calc(100% - 48px)",
                display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6,
              }}>
                <div style={{ fontSize: 10, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>To</div>
                <div style={{ fontSize: 14, color: "#555", fontFamily: "Georgia, serif", borderBottom: "1px solid #e0d9ce", paddingBottom: 4, minHeight: 22 }}>
                  {recipientEmail || <span style={{ color: "#ccc" }}>recipient@email.com</span>}
                </div>
                <div style={{ fontSize: 10, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 8 }}>From</div>
                <div style={{ fontSize: 14, color: "#555", fontFamily: "Georgia, serif", borderBottom: "1px solid #e0d9ce", paddingBottom: 4, minHeight: 22 }}>
                  {senderEmail || <span style={{ color: "#ccc" }}>your@email.com</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
}
