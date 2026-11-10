"use client";

import { useState, useRef } from "react";

const STAMPS = ["🌿", "🌸", "🏔️", "🌊", "🌙", "☀️", "🦋", "🍂", "✨", "🌺", "🎋", "🗺️"];

type Orientation = "portrait" | "landscape";
type Side = "front" | "back";

export default function Home() {
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [side, setSide] = useState<Side>("front");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showStampModal, setShowStampModal] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isPortrait = orientation === "portrait";
  const cardW = isPortrait ? 432 : 672;
  const cardH = isPortrait ? 600 : 432;

  function handleReset() {
    setMessage(""); setImageUrl(null); setImageFile(null);
    setSelectedStamp(null); setSide("front"); setShowSent(false);
    setRecipientEmail(""); setSenderEmail(""); setSendError("");
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
  }

  async function uploadImage(file: File): Promise<string | null> {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const path = `${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await sb.storage.from("postcard-images").upload(path, file);
    if (error) return null;
    return sb.storage.from("postcard-images").getPublicUrl(path).data.publicUrl;
  }

  async function handleSend() {
    if (!recipientEmail || !senderEmail) { setSendError("Please fill in both email addresses."); return; }
    setSendError(""); setSending(true);
    try {
      let url = imageUrl;
      if (imageFile) url = await uploadImage(imageFile);
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail, senderEmail, message, imageUrl: url, orientation, bgColor: "#ffffff", stampEmoji: selectedStamp || "🌿" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setShowSendModal(false);
      setShowSent(true);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  // Ruled lines for card back
  const ruledLines = Array.from({ length: isPortrait ? 10 : 11 });

  if (showSent) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 44 }}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, fontFamily: "sans-serif" }}>Posted.</h2>
          <p style={{ fontSize: 13, color: "#888", maxWidth: 260, lineHeight: 1.6, fontFamily: "sans-serif" }}>On its way to {recipientEmail}</p>
          <button onClick={handleReset} style={{ border: "1px solid #bbb", background: "#fff", borderRadius: 8, padding: "9px 22px", fontSize: 13, cursor: "pointer", color: "#333", marginTop: 4 }}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f3", position: "relative", overflow: "hidden" }}>

      {/* ── Top-left: Received button ── */}
      <button
        onClick={() => {}}
        style={{
          position: "fixed", top: 18, left: 16, zIndex: 50,
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 500, color: "#555",
          background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
        </svg>
        Received
        <span style={{ background: "#111", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", lineHeight: 1.5 }}>3</span>
      </button>

      {/* ── Top-right: Reset + Send ── */}
      <button
        onClick={handleReset}
        style={{
          position: "fixed", top: 18, right: 120, zIndex: 50,
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: 500, color: "#888",
          background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
        </svg>
        Reset
      </button>
      <button
        onClick={() => setShowSendModal(true)}
        style={{
          position: "fixed", top: 18, right: 24, zIndex: 50,
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 13, fontWeight: 600, color: "#fff",
          background: "#111", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer",
        }}
      >
        Send
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>

      {/* ── Left Sidebar ── */}
      <div style={{ position: "fixed", left: 16, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 10, zIndex: 50 }}>
        {/* Orientation */}
        <div
          onClick={() => setOrientation((o) => o === "landscape" ? "portrait" : "landscape")}
          style={{
            width: 72, height: 82, border: "1px solid #e2e2e0", background: "#fff", borderRadius: 12,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
            cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {isPortrait
              ? <rect x="6" y="2" width="13" height="20" rx="2"/>
              : <rect x="2" y="6" width="20" height="13" rx="2"/>
            }
          </svg>
          <span style={{ fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "#999", fontWeight: 500 }}>Orient</span>
        </div>

        <div style={{ height: 1, background: "#e8e8e6", margin: "2px 8px" }} />

        {/* Front tile */}
        <div
          onClick={() => setSide("front")}
          style={{
            width: 72, height: 82, background: "#fff", borderRadius: 12,
            border: side === "front" ? "2px solid #555" : "1px solid #e2e2e0",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
            cursor: "pointer", boxShadow: side === "front" ? "0 1px 4px rgba(0,0,0,0.10)" : "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{
            width: isPortrait ? 26 : 44, height: isPortrait ? 38 : 28, borderRadius: 3,
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
            background: imageUrl ? undefined : "#e8e8e6",
            border: "1px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
          }} />
          <span style={{ fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: side === "front" ? "#222" : "#999", fontWeight: 500 }}>Front</span>
        </div>

        {/* Back tile */}
        <div
          onClick={() => setSide("back")}
          style={{
            width: 72, height: 82, background: "#fff", borderRadius: 12,
            border: side === "back" ? "2px solid #555" : "1px solid #e2e2e0",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
            cursor: "pointer", boxShadow: side === "back" ? "0 1px 4px rgba(0,0,0,0.10)" : "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ width: isPortrait ? 26 : 44, height: isPortrait ? 38 : 28, borderRadius: 3, background: "#f8f8f6", border: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", justifyContent: "space-evenly", padding: "3px 4px" }}>
            {[0,1,2].map(i => <div key={i} style={{ height: 1, background: "#c8c8c8", borderRadius: 1 }} />)}
          </div>
          <span style={{ fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: side === "back" ? "#222" : "#999", fontWeight: 500 }}>Back</span>
        </div>
      </div>

      {/* ── Main Canvas ── */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 100px" }}>

        {side === "front" ? (
          /* ── FRONT FACE ── */
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: cardW, height: cardH,
              background: "#fff",
              border: imageUrl ? "1.5px solid #ccc" : "1.5px dashed #c8c8c8",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
              position: "relative", cursor: "pointer", overflow: "hidden",
              boxShadow: imageUrl ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 9 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); setImageUrl(null); setImageFile(null); }}
                  style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}
                >
                  Change
                </button>
                {selectedStamp && (
                  <div style={{ position: "absolute", top: 14, right: 14, fontSize: 22, background: "rgba(255,255,255,0.9)", borderRadius: 5, padding: "4px 7px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", lineHeight: 1 }}>
                    {selectedStamp}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ width: 28, height: 28, border: "1.5px solid #c0c0c0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#b0b0b0", fontSize: 18 }}>+</div>
                <div style={{ fontSize: 13, color: "#b0b0b0" }}>Add image</div>
              </>
            )}
          </div>
        ) : (
          /* ── BACK FACE ── */
          isPortrait ? (
            /* Portrait back */
            <div style={{
              width: cardW, height: cardH, background: "#fff",
              border: "1px solid #ddd", borderRadius: 10,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
            }}>
              {/* Header */}
              <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#1a1a1a" }}>Postcard</div>
                  <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#b0a0a0", marginTop: 2 }}>with love</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 12 }}>
                    {["Name", "Address", "City, Country"].map((p) => (
                      <input key={p} type="text" placeholder={p} style={{ border: "none", borderBottom: "1px solid #ece8e0", height: 34, width: 180, background: "transparent", fontFamily: "Georgia, serif", fontSize: 12, color: "#333", padding: "14px 4px 2px", outline: "none" }} />
                    ))}
                  </div>
                </div>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 58, height: 72, background: "#f0eeea", borderRadius: 3, position: "absolute", top: -6, right: -6 }} />
                  <div style={{ width: 58, height: 72, border: "1.5px dashed #d8b8b8", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#c8a8a8", letterSpacing: "0.06em", textTransform: "uppercase", position: "relative" }}>Stamp</div>
                </div>
              </div>
              {/* Message area with ruled lines */}
              <div style={{ flex: 1, position: "relative", padding: "16px 24px", marginTop: 10 }}>
                <div style={{ position: "absolute", inset: "16px 0", display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "0" }}>
                  {ruledLines.map((_, i) => <div key={i} style={{ height: 1, background: "#ece8e0", margin: "0 24px" }} />)}
                </div>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message…" maxLength={280}
                  style={{ position: "absolute", inset: "16px 24px", border: "none", background: "transparent", resize: "none", fontFamily: "Georgia, serif", fontSize: 13, color: "#333", lineHeight: "36px", outline: "none", zIndex: 1 }}
                />
              </div>
            </div>
          ) : (
            /* Landscape back */
            <div style={{
              width: cardW, height: cardH, background: "#fff",
              border: "1px solid #ddd", borderRadius: 10,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              display: "flex", overflow: "hidden", position: "relative",
            }}>
              {/* Left: message */}
              <div style={{ width: "58%", borderRight: "1px solid #e8e4dc", position: "relative", padding: "28px 24px", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "absolute", inset: "28px 0", display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
                  {ruledLines.map((_, i) => <div key={i} style={{ height: 1, background: "#ece8e0", margin: "0 24px" }} />)}
                </div>
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message…" maxLength={280}
                  style={{ position: "absolute", inset: "28px 24px", border: "none", background: "transparent", resize: "none", fontFamily: "Georgia, serif", fontSize: 13, color: "#333", lineHeight: "36px", outline: "none", zIndex: 1 }}
                />
              </div>
              {/* Right panel */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#1a1a1a" }}>Postcard</div>
                    <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#b0a0a0", marginTop: 2 }}>with love</div>
                  </div>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 58, height: 72, background: "#f0eeea", borderRadius: 3, position: "absolute", top: -6, right: -6 }} />
                    <div style={{ width: 58, height: 72, border: "1.5px dashed #d8b8b8", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#c8a8a8", letterSpacing: "0.06em", textTransform: "uppercase", position: "relative", zIndex: 1 }}>Stamp</div>
                    {/* Postmark SVG */}
                    <div style={{ position: "absolute", bottom: -30, left: -30, opacity: 0.8, pointerEvents: "none", zIndex: 2 }}>
                      <svg width="80" height="80" viewBox="0 0 90 90" fill="none">
                        <circle cx="45" cy="45" r="40" stroke="#c8b8b8" strokeWidth="1.2"/>
                        <circle cx="45" cy="45" r="34" stroke="#c8b8b8" strokeWidth="0.7"/>
                        <path d="M13 45 Q20 38 27 45 Q34 52 41 45 Q48 38 55 45 Q62 52 69 45 Q76 38 83 45" stroke="#c8b8b8" strokeWidth="1" fill="none"/>
                        <text fontFamily="Georgia, serif" fontSize="7.5" fill="#b8a8a8" letterSpacing="2.5" textAnchor="middle">
                          <textPath href="#pm-top" startOffset="50%">YOUR LOCATION</textPath>
                        </text>
                        <text fontFamily="Georgia, serif" fontSize="7" fill="#b8a8a8" letterSpacing="1.5" textAnchor="middle">
                          <textPath href="#pm-bot" startOffset="50%">NOV 2026</textPath>
                        </text>
                        <defs>
                          <path id="pm-top" d="M 9,45 A 36,36 0 0,1 81,45"/>
                          <path id="pm-bot" d="M 15,51 A 32,32 0 0,0 75,51"/>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Address lines */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 20px 24px" }}>
                  {["Name", "Address", "City, Country", "Postal code"].map((p) => (
                    <input key={p} type="text" placeholder={p} style={{ border: "none", borderBottom: "1px solid #ece8e0", height: 34, width: "100%", background: "transparent", fontFamily: "Georgia, serif", fontSize: 12, color: "#333", padding: "14px 4px 2px", outline: "none" }} />
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Bottom toolbar (back only) ── */}
      {side === "back" && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, zIndex: 50 }}>
          <div
            onClick={() => setShowStampModal(true)}
            style={{ width: 36, height: 36, border: "1.5px solid #c0c0c0", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, color: "#666" }}
            title="Add stamp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 .88-.28 1.7-.77 2.36L17 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2l-1.77 1.64A4 4 0 1 1 8 15.08V10H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2l1.77-1.64A4 4 0 0 1 12 2z"/>
            </svg>
          </div>
        </div>
      )}

      {/* ── Jazz record bottom-left ── */}
      <div style={{ position: "fixed", bottom: 22, left: 22, width: 56, height: 56, cursor: "pointer", zIndex: 50, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }}>
        <svg viewBox="0 0 56 56" width="56" height="56">
          <circle cx="28" cy="28" r="27" fill="#1a1a1a"/>
          <circle cx="28" cy="28" r="20" fill="#2a2a2a"/>
          <circle cx="28" cy="28" r="13" fill="#1a1a1a"/>
          <circle cx="28" cy="28" r="6" fill="#333"/>
          <circle cx="28" cy="28" r="2.5" fill="#555"/>
          {[0,45,90,135,180,225,270,315].map((deg, i) => (
            <line key={i} x1="28" y1="28" x2={28 + 10 * Math.cos(deg * Math.PI / 180)} y2={28 + 10 * Math.sin(deg * Math.PI / 180)} stroke="#333" strokeWidth="1.5"/>
          ))}
          <circle cx="34" cy="22" r="3" fill="#c0392b" opacity="0.9"/>
        </svg>
      </div>

      {/* ── Stamp picker modal ── */}
      {showStampModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 80 }} onClick={() => setShowStampModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Pick a stamp</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {STAMPS.map((s) => (
                <button key={s} onClick={() => { setSelectedStamp(s); setShowStampModal(false); }} style={{ height: 44, border: "none", background: selectedStamp === s ? "#f0ede8" : "transparent", borderRadius: 8, fontSize: 20, cursor: "pointer" }}>{s}</button>
              ))}
            </div>
            <button onClick={() => setShowStampModal(false)} style={{ border: "1px solid #ddd", background: "#f5f5f3", borderRadius: 8, padding: 9, fontSize: 13, cursor: "pointer", color: "#555" }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Send modal ── */}
      {showSendModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSendModal(false)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 20 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 600, fontFamily: "sans-serif", margin: 0 }}>Who's it going to?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6, fontWeight: 600 }}>Recipient's email</label>
                <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="their@email.com"
                  style={{ width: "100%", border: "1px solid #d0d0d0", borderRadius: 10, padding: "11px 16px", fontSize: 14, background: "#fff", color: "#333", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 6, fontWeight: 600 }}>Your email</label>
                <input type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="you@email.com"
                  style={{ width: "100%", border: "1px solid #d0d0d0", borderRadius: 10, padding: "11px 16px", fontSize: 14, background: "#fff", color: "#333", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            {sendError && <p style={{ color: "#e55", fontSize: 13, margin: 0 }}>{sendError}</p>}
            <button onClick={handleSend} disabled={sending}
              style={{ width: "100%", padding: 13, background: sending ? "#999" : "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: sending ? "default" : "pointer", fontWeight: 600 }}>
              {sending ? "Sending…" : "Send postcard ✈"}
            </button>
            <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", margin: 0 }}>Delivered to their inbox right away.</p>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
    </div>
  );
}
