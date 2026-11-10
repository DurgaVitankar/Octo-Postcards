"use client";

import { useState, useRef } from "react";

const BG_COLORS = ["#f5f5f3", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#1a1a2e", "#2d1b4e", "#0f2027"];
const STAMPS = ["🌿", "🌸", "🏔️", "🌊", "🌙", "☀️", "🦋", "🍂", "✨", "🌺", "🎋", "🗺️"];

type Step = "compose" | "address" | "sent";
type Orientation = "portrait" | "landscape";

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
  const [postcard, setPostcard] = useState<PostcardState>({
    message: "",
    imageUrl: null,
    imageFile: null,
    bgColor: "#f5f5f3",
    stampEmoji: "🌿",
    orientation: "portrait",
  });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPortrait = postcard.orientation === "portrait";
  const cardW = isPortrait ? 300 : 450;
  const cardH = isPortrait ? 450 : 300;

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

  if (step === "sent") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#e8e4dc" }}>
        <div className="text-center">
          <div className="text-5xl mb-6">{postcard.stampEmoji}</div>
          <h1 className="text-2xl font-serif text-gray-800 mb-2">Postcard sent.</h1>
          <p className="text-gray-500 mb-8">On its way to {recipientEmail}</p>
          <button
            onClick={() => {
              setStep("compose");
              setPostcard({ message: "", imageUrl: null, imageFile: null, bgColor: "#f5f5f3", stampEmoji: "🌿", orientation: "portrait" });
              setRecipientEmail("");
              setSenderEmail("");
              setFlipped(false);
            }}
            className="text-sm text-gray-500 underline underline-offset-4"
          >
            Send another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-4" style={{ background: "#e8e4dc" }}>
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl text-gray-800">Postcards</h1>
        <p className="text-sm text-gray-500 mt-1">something personal</p>
      </div>

      {step === "compose" && (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
          {/* Card preview with 3D flip */}
          <div
            className="cursor-pointer select-none"
            style={{ perspective: 1000, width: cardW, height: cardH }}
            onClick={() => setFlipped((f) => !f)}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                transformStyle: "preserve-3d",
                transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  borderRadius: 6,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  background: postcard.bgColor,
                  cursor: "pointer",
                }}
              >
                {postcard.imageUrl ? (
                  <img src={postcard.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div
                    style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  >
                    <div className="text-center opacity-40">
                      <div className="text-4xl mb-2">+</div>
                      <div className="text-sm font-sans">add photo</div>
                    </div>
                  </div>
                )}
                {/* Stamp */}
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  fontSize: 24,
                  background: "white",
                  borderRadius: 4,
                  padding: "4px 6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  lineHeight: 1,
                }}>
                  {postcard.stampEmoji}
                </div>
                {/* Flip hint */}
                <div style={{
                  position: "absolute",
                  bottom: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "sans-serif",
                  letterSpacing: "0.05em",
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  pointerEvents: "none",
                }}>
                  tap to flip
                </div>
              </div>

              {/* Back */}
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: 6,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  background: "#fff9f0",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Divider line */}
                <div style={{
                  position: "absolute",
                  [isPortrait ? "top" : "left"]: "50%",
                  [isPortrait ? "left" : "top"]: 0,
                  [isPortrait ? "width" : "height"]: "100%",
                  [isPortrait ? "height" : "width"]: 1,
                  background: "#ddd",
                }} />
                {/* Message area */}
                <textarea
                  value={postcard.message}
                  onChange={(e) => setPostcard((p) => ({ ...p, message: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Write something..."
                  maxLength={300}
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    width: isPortrait ? "calc(100% - 32px)" : "calc(50% - 24px)",
                    height: isPortrait ? "calc(50% - 24px)" : "calc(100% - 32px)",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontFamily: "Georgia, serif",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#333",
                  }}
                />
                {/* Address area */}
                <div style={{
                  position: "absolute",
                  bottom: isPortrait ? 16 : undefined,
                  top: isPortrait ? undefined : 16,
                  right: 16,
                  left: isPortrait ? 16 : undefined,
                  width: isPortrait ? "calc(100% - 32px)" : "calc(50% - 24px)",
                  height: isPortrait ? "calc(50% - 24px)" : "calc(100% - 32px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  gap: 4,
                }}>
                  <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>To</div>
                  <div style={{ fontSize: 13, color: "#555", fontFamily: "Georgia, serif", minHeight: 20, borderBottom: "1px solid #e0d9ce", paddingBottom: 4 }}>
                    {recipientEmail || <span style={{ color: "#ccc" }}>recipient@email.com</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif", marginTop: 8 }}>From</div>
                  <div style={{ fontSize: 13, color: "#555", fontFamily: "Georgia, serif", minHeight: 20, borderBottom: "1px solid #e0d9ce", paddingBottom: 4 }}>
                    {senderEmail || <span style={{ color: "#ccc" }}>your@email.com</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full flex flex-col gap-5">
            {/* Orientation */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Format</span>
              <div className="flex gap-2">
                {(["portrait", "landscape"] as Orientation[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setPostcard((p) => ({ ...p, orientation: o }))}
                    className={`px-3 py-1 text-xs rounded border transition-all ${
                      postcard.orientation === o
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Color</span>
              <div className="flex gap-2 flex-wrap">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPostcard((p) => ({ ...p, bgColor: c }))}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: c,
                      border: postcard.bgColor === c ? "2px solid #333" : "2px solid transparent",
                      outline: postcard.bgColor === c ? "2px solid #fff" : "none",
                      outlineOffset: -1,
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Stamp */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Stamp</span>
              <div className="flex gap-2 flex-wrap">
                {STAMPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPostcard((p) => ({ ...p, stampEmoji: s }))}
                    className={`w-8 h-8 text-base rounded transition-all ${
                      postcard.stampEmoji === s ? "bg-white shadow-md scale-110" : "hover:bg-white/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider w-20">Photo</span>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-gray-500 border border-gray-300 rounded px-3 py-1 hover:border-gray-500 transition-colors bg-white"
              >
                {postcard.imageUrl ? "Change photo" : "Upload photo"}
              </button>
              {postcard.imageUrl && (
                <button
                  onClick={() => setPostcard((p) => ({ ...p, imageUrl: null, imageFile: null }))}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            <button
              onClick={() => setStep("address")}
              className="mt-2 w-full py-3 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors font-sans tracking-wide"
            >
              Address & Send →
            </button>
          </div>
        </div>
      )}

      {step === "address" && (
        <div className="w-full max-w-sm flex flex-col gap-5">
          <button onClick={() => setStep("compose")} className="text-sm text-gray-400 hover:text-gray-600 self-start">
            ← back
          </button>
          <h2 className="font-serif text-xl text-gray-800">Who's it going to?</h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Recipient's email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="their@email.com"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Your email</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 transition-colors font-sans tracking-wide"
          >
            {sending ? "Sending..." : "Send postcard"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            The postcard will be delivered to their inbox right away.
          </p>
        </div>
      )}
    </main>
  );
}
