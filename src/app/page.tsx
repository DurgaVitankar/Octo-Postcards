"use client";
import { useState, useRef } from "react";

type Screen = "login" | "desk" | "send" | "inbox" | "sent";
type Orientation = "portrait" | "landscape";
type Side = "front" | "back";

const STAMP_OPTS = ["🌿","🌸","🏔️","🌊","🌙","☀️","🦋","🍂","✨","🌺"];
const STARTER_PILLS = [
  { text: "Wish you were here", r: "-1deg" },
  { text: "Thinking of you",    r: "0.5deg" },
  { text: "Until next time",    r: "-0.5deg" },
];
const INBOX_ITEMS = [
  { id:1, from:"alex@email.com",  date:"Nov 8", bg:"#e8d5c4", emoji:"🏔️", unread:true },
  { id:2, from:"jamie@email.com", date:"Nov 6", bg:"#c4d5e8", emoji:"🌊", unread:true },
  { id:3, from:"sam@email.com",   date:"Nov 2", bg:"#d5e8c4", emoji:"🌸", unread:false },
];

function PostmarkSVG({ uid }: { uid: string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="45" r="40" stroke="#c8b8b8" strokeWidth="1.2"/>
      <circle cx="45" cy="45" r="34" stroke="#c8b8b8" strokeWidth="0.7"/>
      <path d="M13 45 Q20 38 27 45 Q34 52 41 45 Q48 38 55 45 Q62 52 69 45 Q76 38 83 45" stroke="#c8b8b8" strokeWidth="1" fill="none"/>
      <text fontFamily="Georgia, serif" fontSize="7.5" fill="#b8a8a8" letterSpacing="2.5" textAnchor="middle">
        <textPath href={`#${uid}-top`} startOffset="50%">YOUR LOCATION</textPath>
      </text>
      <text fontFamily="Georgia, serif" fontSize="7" fill="#b8a8a8" letterSpacing="1.5" textAnchor="middle">
        <textPath href={`#${uid}-bot`} startOffset="50%">NOV 2026</textPath>
      </text>
      <defs>
        <path id={`${uid}-top`} d="M 9,45 A 36,36 0 0,1 81,45"/>
        <path id={`${uid}-bot`} d="M 15,51 A 32,32 0 0,0 75,51"/>
      </defs>
    </svg>
  );
}

export default function Home() {
  const [screen, setScreen]           = useState<Screen>("login");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [side, setSide]               = useState<Side>("front");
  const [message, setMessage]         = useState("");
  const [imageUrl, setImageUrl]       = useState<string | null>(null);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [stamp, setStamp]             = useState<string | null>(null);
  const [showStampModal, setShowStampModal] = useState(false);
  const [jazzOn, setJazzOn]           = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [slideX, setSlideX]           = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const SLIDE_MAX = 268;

  const isPortrait = orientation === "portrait";
  const cardW = isPortrait ? 432 : 672;
  const cardH = isPortrait ? 600 : 432;
  const ruledLines = Array.from({ length: isPortrait ? 10 : 11 });

  function handleReset() {
    setMessage(""); setImageUrl(null); setImageFile(null);
    setStamp(null); setSide("front"); setSendError(""); setSlideX(0);
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
        body: JSON.stringify({ recipientEmail, senderEmail, message, imageUrl: url, orientation, bgColor: "#ffffff", stampEmoji: stamp || "🌿" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setScreen("sent");
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  // slider events
  function onSliderDown(e: React.PointerEvent<HTMLDivElement>) {
    isDragging.current = true;
    dragStartX.current = e.clientX - slideX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onSliderMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return;
    const nx = Math.max(0, Math.min(SLIDE_MAX, e.clientX - dragStartX.current));
    setSlideX(nx);
    if (nx >= SLIDE_MAX * 0.88) { isDragging.current = false; handleSend(); }
  }
  function onSliderUp() {
    if (isDragging.current) { isDragging.current = false; setSlideX(0); }
  }

  // ── SHARED STYLES ──
  const topBtn = (extra?: object) => ({
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 500, border: "1px solid #ddd",
    background: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
    color: "#555", ...extra,
  });

  // ══════════════════════════════════════════════
  // SCREEN: LOGIN
  // ══════════════════════════════════════════════
  if (screen === "login") return (
    <div style={{ minHeight:"100vh", background:"#f5f5f3", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{fonts}</style>
      <div style={{ background:"#fff", border:"1px solid #ddd", borderRadius:12, padding:"40px 36px", width:360, display:"flex", flexDirection:"column", gap:18, boxSizing:"border-box" }}>
        <h1 style={{ fontSize:20, fontWeight:700, textAlign:"center", fontFamily:"'Playfair Display',Georgia,serif", margin:0 }}>Postcards</h1>
        <p style={{ fontSize:12, color:"#999", textAlign:"center", lineHeight:1.6, margin:0 }}>A deliberate way to share a moment with someone you care about.</p>
        <input type="email" placeholder="your@email.com" style={{ border:"1px solid #d0d0d0", borderRadius:8, padding:"10px 14px", fontSize:14, background:"#fafafa", outline:"none", width:"100%", boxSizing:"border-box" }} />
        <button onClick={() => setScreen("desk")} style={{ width:"100%", background:"#333", color:"#fff", border:"none", borderRadius:8, padding:11, fontSize:14, cursor:"pointer" }}>
          Send magic link →
        </button>
        <div style={{ fontSize:11, color:"#bbb", textAlign:"center" }}>No password. We&apos;ll email you a link to sign in.</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: SENT
  // ══════════════════════════════════════════════
  if (screen === "sent") return (
    <div style={{ minHeight:"100vh", background:"#f5f5f3", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{fonts}</style>
      <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ fontSize:44 }}>✉️</div>
        <h2 style={{ fontSize:20, fontWeight:600, margin:0 }}>Posted.</h2>
        <p style={{ fontSize:13, color:"#888", maxWidth:260, lineHeight:1.6, margin:0 }}>On its way to {recipientEmail}</p>
        <div style={{ fontSize:12, color:"#aaa", border:"1px solid #ddd", borderRadius:20, padding:"4px 14px" }}>Arrives in a few minutes</div>
        <button onClick={() => { handleReset(); setScreen("desk"); }} style={{ border:"1px solid #bbb", background:"#fff", borderRadius:8, padding:"9px 22px", fontSize:13, cursor:"pointer", color:"#333", marginTop:4 }}>
          Send another
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: INBOX
  // ══════════════════════════════════════════════
  if (screen === "inbox") return (
    <div style={{ minHeight:"100vh", background:"#f5f5f3", display:"flex", flexDirection:"column", fontFamily:"sans-serif" }}>
      <style>{fonts}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"28px 48px 0", maxWidth:1200, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
        <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:28, fontWeight:700, color:"#111", letterSpacing:"-0.02em" }}>Received</div>
        <button onClick={() => setScreen("desk")} style={{ fontSize:13, color:"#777", cursor:"pointer", background:"none", border:"none", display:"flex", alignItems:"center", gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
      </div>
      <div style={{ display:"flex", gap:8, padding:"20px 48px 0", maxWidth:1200, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
        {["All","Unread","Sent"].map((f,i) => (
          <button key={f} style={{ fontSize:12, fontWeight:600, letterSpacing:"0.04em", color: i===0?"#fff":"#888", background: i===0?"#111":"none", border:`1px solid ${i===0?"#111":"#ddd"}`, borderRadius:20, padding:"5px 14px", cursor:"pointer", textTransform:"uppercase" }}>{f}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 0 80px", flex:1, overflowY:"auto" }}>
        {INBOX_ITEMS.map((item, i) => (
          <div key={item.id} style={{ marginBottom:-28, position:"relative", cursor:"pointer", zIndex:i, transition:"transform 0.2s" }}>
            <div style={{ width:490, height:314, background:item.bg, borderRadius:7, border:"1.5px solid rgba(0,0,0,0.12)", boxShadow:"0 4px 16px rgba(0,0,0,0.13)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:80, position:"relative", overflow:"hidden" }}>
              {item.emoji}
              {item.unread && <div style={{ position:"absolute", top:10, left:10, width:9, height:9, borderRadius:"50%", background:"#111", border:"2px solid #fff", zIndex:2 }}/>}
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, padding:"8px 2px 0" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#333" }}>From {item.from}</span>
              <span style={{ fontSize:11, color:"#bbb" }}>{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: SEND
  // ══════════════════════════════════════════════
  if (screen === "send") return (
    <div style={{ minHeight:"100vh", background:"#f5f5f3", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, fontFamily:"sans-serif", position:"relative" }}>
      <style>{fonts}</style>
      <button onClick={() => setScreen("desk")} style={{ position:"fixed", top:18, left:16, ...topBtn(), color:"#777" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      <h2 style={{ fontSize:20, fontWeight:700, fontFamily:"'Playfair Display',Georgia,serif", margin:0 }}>Send your postcard</h2>

      <div style={{ width:340, display:"flex", flexDirection:"column", gap:22 }}>
        {[
          { label:"To", val:recipientEmail, set:setRecipientEmail, ph:"their@email.com" },
          { label:"From", val:senderEmail, set:setSenderEmail, ph:"you@email.com" },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize:11, color:"#aaa", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>{f.label}</div>
            <input type="email" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
              style={{ width:"100%", border:"none", borderBottom:"1px solid #ddd", padding:"8px 0", fontSize:15, fontFamily:"Georgia,serif", color:"#333", background:"transparent", outline:"none", boxSizing:"border-box" }}/>
          </div>
        ))}
      </div>

      {sendError && <p style={{ color:"#e55", fontSize:13, margin:0 }}>{sendError}</p>}

      {/* Slide to send */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
          <div style={{ width:340, height:56, border:"1.5px solid #ddd", borderRadius:14, background:"#f0ede8", position:"relative", overflow:"visible", display:"flex", alignItems:"center" }}>
            <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", fontSize:12, color:"#ccc", pointerEvents:"none", whiteSpace:"nowrap" }}>slide to send ›</div>
            <div
              onPointerDown={onSliderDown}
              onPointerMove={onSliderMove}
              onPointerUp={onSliderUp}
              style={{ position:"absolute", left:4+slideX, top:"50%", transform:"translateY(-50%)", width:72, height:46, background:"#fff", border:"1px solid #ddd", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"grab", userSelect:"none", touchAction:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", zIndex:5, flexDirection:"column", gap:2 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <div style={{ fontSize:10, color:"#ccc", letterSpacing:"0.3px" }}>send</div>
            </div>
          </div>
          <div style={{ position:"absolute", right:-52, top:"50%", transform:"translateY(-50%)", fontSize:40, pointerEvents:"none", transition:"filter 0.2s", filter: slideX > SLIDE_MAX*0.5 ? "none" : "grayscale(1) opacity(0.4)" }}>
            {slideX > SLIDE_MAX*0.6 ? "📬" : "📪"}
          </div>
        </div>
        <div style={{ fontSize:12, color:"#bbb" }}>or tap below</div>
        <button onClick={handleSend} disabled={sending} style={{ background: sending?"#999":"#111", color:"#fff", border:"none", borderRadius:10, padding:"11px 36px", fontSize:14, cursor: sending?"default":"pointer", fontWeight:600 }}>
          {sending ? "Sending…" : "Send now ✈"}
        </button>
      </div>

      <p style={{ fontSize:12, color:"#aaa", textAlign:"center", margin:0 }}>Delivered to their inbox right away.</p>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: DESK (main)
  // ══════════════════════════════════════════════
  const flipped = side === "back";

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f3", position:"relative", overflow:"hidden" }}>
      <style>{fonts + keyframes}</style>

      {/* ── top-left: Received ── */}
      <button onClick={() => setScreen("inbox")} style={{ position:"fixed", top:18, left:16, zIndex:50, ...topBtn() }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
        </svg>
        Received
        <span style={{ background:"#111", color:"#fff", fontSize:10, fontWeight:700, borderRadius:10, padding:"1px 6px", lineHeight:1.5 }}>3</span>
      </button>

      {/* ── top-right: Reset + Send ── */}
      <button onClick={handleReset} style={{ position:"fixed", top:18, right:120, zIndex:50, ...topBtn({ color:"#888" }) }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
        </svg>
        Reset
      </button>
      <button onClick={() => setScreen("send")} style={{ position:"fixed", top:18, right:24, zIndex:50, display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:600, color:"#fff", background:"#111", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer" }}>
        Send
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>

      {/* ── Left sidebar ── */}
      <div style={{ position:"fixed", left:16, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column", gap:10, zIndex:50 }}>
        <SbTile active={false} onClick={() => setOrientation(o => o === "landscape" ? "portrait" : "landscape")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {isPortrait ? <rect x="6" y="2" width="13" height="20" rx="2"/> : <rect x="2" y="6" width="20" height="13" rx="2"/>}
          </svg>
          <span style={tileLabel(false)}>Orient</span>
        </SbTile>

        <div style={{ height:1, background:"#e8e8e6", margin:"2px 8px" }}/>

        <SbTile active={side==="front"} onClick={() => setSide("front")}>
          <div style={{ width: isPortrait?26:44, height: isPortrait?38:28, borderRadius:3, backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, backgroundSize:"cover", backgroundPosition:"center", background: imageUrl ? undefined : "#e8e8e6", border:"1px solid rgba(0,0,0,0.08)", overflow:"hidden", flexShrink:0 }}/>
          <span style={tileLabel(side==="front")}>Front</span>
        </SbTile>

        <SbTile active={side==="back"} onClick={() => setSide("back")}>
          <div style={{ width: isPortrait?26:44, height: isPortrait?38:28, borderRadius:3, background:"#f8f8f6", border:"1px solid rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", justifyContent:"space-evenly", padding:"3px 4px", flexShrink:0 }}>
            {[0,1,2].map(i => <div key={i} style={{ height:1, background:"#c8c8c8", borderRadius:1 }}/>)}
          </div>
          <span style={tileLabel(side==="back")}>Back</span>
        </SbTile>
      </div>

      {/* ── 3-D flip card ── */}
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 100px" }}>
        <div style={{ perspective:"1200px" }}>
          <div style={{
            position:"relative", width:cardW, height:cardH,
            transformStyle:"preserve-3d",
            transition:"transform 0.55s cubic-bezier(0.45,0.05,0.55,0.95)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            {/* FRONT face */}
            <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden" } as React.CSSProperties}>
              <div onClick={() => fileRef.current?.click()} style={{ width:"100%", height:"100%", background:"#fff", border: imageUrl?"1.5px solid #ccc":"1.5px dashed #c8c8c8", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10, position:"relative", cursor:"pointer", overflow:"hidden", boxShadow: imageUrl?"0 2px 12px rgba(0,0,0,0.08)":"none" }}>
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", borderRadius:9 }}/>
                    <button onClick={e => { e.stopPropagation(); setImageUrl(null); setImageFile(null); }} style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>Change</button>
                    {stamp && <div style={{ position:"absolute", top:14, right:14, fontSize:22, background:"rgba(255,255,255,0.9)", borderRadius:5, padding:"4px 7px", boxShadow:"0 2px 8px rgba(0,0,0,0.12)", lineHeight:1 }}>{stamp}</div>}
                  </>
                ) : (
                  <>
                    <div style={{ width:28, height:28, border:"1.5px solid #c0c0c0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#b0b0b0", fontSize:18 }}>+</div>
                    <div style={{ fontSize:13, color:"#b0b0b0" }}>Add image</div>
                  </>
                )}
              </div>
            </div>

            {/* BACK face */}
            <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)" } as React.CSSProperties}>
              {isPortrait ? (
                <div style={{ width:"100%", height:"100%", background:"#fff", border:"1px solid #ddd", borderRadius:10, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
                  <div style={{ padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
                    <div>
                      <div style={pcTitle}>Postcard</div>
                      <div style={pcSub}>with love</div>
                      <div style={{ display:"flex", flexDirection:"column", marginTop:12 }}>
                        {["Name","Address","City, Country"].map(p => (
                          <input key={p} type="text" placeholder={p} style={addrInput(180)}/>
                        ))}
                      </div>
                    </div>
                    <StampZone stamp={stamp} uid="pm-p"/>
                  </div>
                  <RuledTextarea value={message} onChange={setMessage} lines={ruledLines} padTop={16} padH={24}/>
                </div>
              ) : (
                <div style={{ width:"100%", height:"100%", background:"#fff", border:"1px solid #ddd", borderRadius:10, boxShadow:"0 2px 12px rgba(0,0,0,0.08)", display:"flex", overflow:"hidden" }}>
                  <div style={{ width:"58%", borderRight:"1px solid #e8e4dc", position:"relative", padding:"28px 24px 0" }}>
                    <RuledTextarea value={message} onChange={setMessage} lines={ruledLines} padTop={28} padH={24}/>
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                    <div style={{ padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div><div style={pcTitle}>Postcard</div><div style={pcSub}>with love</div></div>
                      <StampZone stamp={stamp} uid="pm-l"/>
                    </div>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"0 20px 24px" }}>
                      {["Name","Address","City, Country","Postal code"].map(p => (
                        <input key={p} type="text" placeholder={p} style={addrInput("100%")}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Starter pills (back only) ── */}
      {side === "back" && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", display:"flex", gap:8, zIndex:50 }}>
          {STARTER_PILLS.map(p => (
            <button key={p.text} onClick={() => setMessage(p.text)} style={{ border:"1px solid #d0d0d0", background:"#fff", borderRadius:20, padding:"7px 16px", fontSize:13, fontStyle:"italic", cursor:"pointer", color:"#888", whiteSpace:"nowrap", transform:`rotate(${p.r})` }}>
              {p.text}
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom toolbar (back only) ── */}
      {side === "back" && (
        <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:10, zIndex:50 }}>
          <button style={{ border:"1px solid #d0d0d0", background:"#fff", borderRadius:10, padding:"7px 16px", fontSize:13, cursor:"pointer", color:"#333", fontStyle:"italic" }}>Font</button>
          <CircleBtn onClick={() => setShowStampModal(true)} title="Add stamp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 .88-.28 1.7-.77 2.36L17 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2l-1.77 1.64A4 4 0 1 1 8 15.08V10H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2l1.77-1.64A4 4 0 0 1 12 2z"/>
              <line x1="8" y1="20" x2="16" y2="20"/>
            </svg>
          </CircleBtn>
          <CircleBtn onClick={() => {}} title="Add sticker">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.19 0 2-.95 2-2.11v-.39c0-.49.41-.9.9-.9h1.2c3.59 0 5.9-3.85 5.9-6.6C22 6.05 17.52 2 12 2z"/>
              <circle cx="8.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/>
              <circle cx="14.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
            </svg>
          </CircleBtn>
        </div>
      )}

      {/* ── Jazz record ── */}
      <div onClick={() => setJazzOn(j => !j)} style={{ position:"fixed", bottom:22, left:22, width:56, height:56, cursor:"pointer", zIndex:50, filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }} title="Play jazz">
        <svg style={{ animation: jazzOn ? "vinyl-spin 4.5s linear 3 forwards" : "none" }} viewBox="0 0 56 56" width="56" height="56">
          <circle cx="28" cy="28" r="27" fill="#1a1a1a"/>
          <circle cx="28" cy="28" r="20" fill="#2a2a2a"/>
          <circle cx="28" cy="28" r="13" fill="#1a1a1a"/>
          <circle cx="28" cy="28" r="6"  fill="#333"/>
          <circle cx="28" cy="28" r="2.5" fill="#555"/>
          {[0,45,90,135,180,225,270,315].map((deg,i) => (
            <line key={i} x1="28" y1="28" x2={28+10*Math.cos(deg*Math.PI/180)} y2={28+10*Math.sin(deg*Math.PI/180)} stroke="#333" strokeWidth="1.5"/>
          ))}
          <circle cx="34" cy="22" r="3" fill="#c0392b" opacity="0.9"/>
        </svg>
      </div>

      {/* ── Stamp picker modal ── */}
      {showStampModal && (
        <div onClick={() => setShowStampModal(false)} style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:80 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:14, padding:20, width:340, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Pick a stamp</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
              {STAMP_OPTS.map(s => (
                <button key={s} onClick={() => { setStamp(s); setShowStampModal(false); }} style={{ height:52, border:"none", background: stamp===s?"#f0ede8":"transparent", borderRadius:8, fontSize:22, cursor:"pointer" }}>{s}</button>
              ))}
            </div>
            <button onClick={() => setShowStampModal(false)} style={{ border:"1px solid #ddd", background:"#f5f5f3", borderRadius:8, padding:9, fontSize:13, cursor:"pointer", color:"#555" }}>Close</button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImageUpload}/>
    </div>
  );
}

// ── Sub-components & helpers ──

function SbTile({ active, onClick, children }: { active:boolean; onClick:()=>void; children:React.ReactNode }) {
  return (
    <div onClick={onClick} style={{ width:72, height:82, background:"#fff", borderRadius:12, border: active?"2px solid #555":"1px solid #e2e2e0", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:7, cursor:"pointer", boxShadow: active?"0 1px 4px rgba(0,0,0,0.10)":"0 1px 3px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}

function CircleBtn({ onClick, title, children }: { onClick:()=>void; title:string; children:React.ReactNode }) {
  return (
    <div onClick={onClick} title={title} style={{ width:36, height:36, border:"1.5px solid #c0c0c0", borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#666" }}>
      {children}
    </div>
  );
}

function StampZone({ stamp, uid }: { stamp:string|null; uid:string }) {
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{ width:58, height:72, background:"#f0eeea", borderRadius:3, position:"absolute", top:-6, right:-6 }}/>
      <div style={{ width:58, height:72, border:"1.5px dashed #d8b8b8", borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", fontSize: stamp?22:9, color:"#c8a8a8", letterSpacing:"0.06em", textTransform:"uppercase", position:"relative", zIndex:1 }}>
        {stamp ?? "Stamp"}
      </div>
      <div style={{ position:"absolute", bottom:-30, left:-30, opacity:0.8, pointerEvents:"none", zIndex:2 }}>
        <PostmarkSVG uid={uid}/>
      </div>
    </div>
  );
}

function RuledTextarea({ value, onChange, lines, padTop, padH }: { value:string; onChange:(v:string)=>void; lines:unknown[]; padTop:number; padH:number }) {
  return (
    <div style={{ flex:1, position:"relative" }}>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"space-around" }}>
        {lines.map((_,i) => <div key={i} style={{ height:1, background:"#ece8e0", margin:`0 ${padH}px` }}/>)}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder="Write your message…" maxLength={280}
        style={{ position:"absolute", inset:`${padTop}px ${padH}px`, border:"none", background:"transparent", resize:"none", fontFamily:"Georgia,serif", fontSize:13, color:"#333", lineHeight:"36px", outline:"none", zIndex:1 }}/>
    </div>
  );
}

function tileLabel(active: boolean): React.CSSProperties {
  return { fontSize:10, letterSpacing:"0.04em", textTransform:"uppercase", color: active?"#222":"#999", fontWeight:500 };
}

function addrInput(w: number | string): React.CSSProperties {
  return { border:"none", borderBottom:"1px solid #ece8e0", height:34, width:w, background:"transparent", fontFamily:"Georgia,serif", fontSize:12, color:"#333", padding:"14px 4px 2px", outline:"none", boxSizing:"border-box" };
}

const pcTitle: React.CSSProperties = { fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"#1a1a1a" };
const pcSub:   React.CSSProperties = { fontFamily:"'Dancing Script',cursive", fontSize:13, color:"#b0a0a0", marginTop:2 };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@400&display=swap');`;
const keyframes = `@keyframes vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
