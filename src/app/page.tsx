"use client";
import { useState, useRef, useEffect } from "react";

type Screen = "login" | "desk" | "send" | "inbox" | "sent";
type Orientation = "portrait" | "landscape";
type Side = "front" | "back";
type PhotoEffect = "original" | "vintage";
type PenType = "calligraphy" | "ink";
type ModalType = "none" | "stamp" | "sticker" | "pen";

interface PlacedItem {
  id: string;
  kind: "stamp" | "sticker";
  content: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const STAMP_OPTS = ["🌿","🌸","🏔️","🌊","🌙","☀️","🦋","🍂","✨","🌺"];

const STICKER_OPTS = [
  { id:"rose",     label:"Rose",           svg:`<svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="10" fill="#e57373"/><circle cx="20" cy="20" r="6" fill="#ef5350"/><circle cx="28" cy="20" r="5" fill="#e53935"/><circle cx="24" cy="28" r="6" fill="#c62828"/><ellipse cx="24" cy="38" rx="3" ry="8" fill="#43a047" transform="rotate(-10 24 38)"/><ellipse cx="18" cy="35" rx="6" ry="3" fill="#66bb6a" transform="rotate(-30 18 35)"/></svg>` },
  { id:"daisy",    label:"Daisy",          svg:`<svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="7" fill="#fff176"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(36 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(72 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(108 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(144 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(180 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(216 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(252 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(288 24 24)"/><ellipse cx="24" cy="10" rx="4" ry="7" fill="white" transform="rotate(324 24 24)"/></svg>` },
  { id:"hibiscus", label:"Hibiscus",       svg:`<svg viewBox="0 0 48 48" width="48" height="48"><ellipse cx="24" cy="12" rx="8" ry="12" fill="#f06292" transform="rotate(0 24 24)"/><ellipse cx="24" cy="12" rx="8" ry="12" fill="#e91e8c" transform="rotate(72 24 24)"/><ellipse cx="24" cy="12" rx="8" ry="12" fill="#f06292" transform="rotate(144 24 24)"/><ellipse cx="24" cy="12" rx="8" ry="12" fill="#e91e8c" transform="rotate(216 24 24)"/><ellipse cx="24" cy="12" rx="8" ry="12" fill="#f06292" transform="rotate(288 24 24)"/><circle cx="24" cy="24" r="5" fill="#fff176"/></svg>` },
  { id:"maple",    label:"Maple Leaf",     svg:`<svg viewBox="0 0 48 48" width="48" height="48"><path d="M24 4l3 8 5-2-4 7 7 1-5 5 2 7-8-3v10h-2V27l-8 3 2-7-5-5 7-1-4-7 5 2z" fill="#e53935"/><rect x="22" y="36" width="4" height="8" fill="#795548" rx="1"/></svg>` },
  { id:"tropical", label:"Tropical Leaf",  svg:`<svg viewBox="0 0 48 48" width="48" height="48"><path d="M8 44 Q20 20 40 8 Q38 24 28 34 Q22 40 8 44z" fill="#43a047"/><path d="M8 44 Q24 36 40 8" stroke="#2e7d32" stroke-width="1.5" fill="none"/></svg>` },
  { id:"cherry",   label:"Cherry Blossom", svg:`<svg viewBox="0 0 48 48" width="48" height="48"><ellipse cx="24" cy="14" rx="6" ry="9" fill="#f8bbd0"/><ellipse cx="24" cy="14" rx="6" ry="9" fill="#f8bbd0" transform="rotate(72 24 24)"/><ellipse cx="24" cy="14" rx="6" ry="9" fill="#f8bbd0" transform="rotate(144 24 24)"/><ellipse cx="24" cy="14" rx="6" ry="9" fill="#f8bbd0" transform="rotate(216 24 24)"/><ellipse cx="24" cy="14" rx="6" ry="9" fill="#f8bbd0" transform="rotate(288 24 24)"/><circle cx="24" cy="24" r="4" fill="#fff176"/></svg>` },
];

const STARTER_PILLS = [
  { text:"Wish you were here", r:"-1deg" },
  { text:"Thinking of you",    r:"0.5deg" },
  { text:"Until next time",    r:"-0.5deg" },
];

const INBOX_ITEMS = [
  { id:1, from:"Priya",  date:"Nov 8",  bg:"linear-gradient(135deg,#b5cfe8 0%,#d4e8c2 100%)", emoji:"🌊", unread:true,  rot:-2.1, msg:"Thinking of you from the coast.\nThe water here is impossibly blue —\nyou'd love it.\n\n— Priya" },
  { id:2, from:"Arjun",  date:"Nov 6",  bg:"linear-gradient(135deg,#f5e0b5 0%,#f0c8a0 100%)", emoji:"🏜️", unread:true,  rot:1.4,  msg:"Made it to Rajasthan.\nThe light at dusk is unlike anything\nI've ever seen.\n\n— Arjun" },
  { id:3, from:"Mei",    date:"Nov 2",  bg:"linear-gradient(135deg,#e8d5f0 0%,#c8b0e8 100%)", emoji:"🌸", unread:false, rot:-0.8, msg:"Kyoto in the rain.\nEverything is quiet and perfect\nand I wished you were here.\n\n— Mei" },
];

function PostmarkSVG({ uid }: { uid:string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 90 90" fill="none">
      <circle cx="45" cy="45" r="40" stroke="#c8b8b8" strokeWidth="1.2"/>
      <circle cx="45" cy="45" r="34" stroke="#c8b8b8" strokeWidth="0.7"/>
      <path d="M13 45 Q20 38 27 45 Q34 52 41 45 Q48 38 55 45 Q62 52 69 45 Q76 38 83 45" stroke="#c8b8b8" strokeWidth="1" fill="none"/>
      <text fontFamily="Georgia,serif" fontSize="7.5" fill="#b8a8a8" letterSpacing="2.5" textAnchor="middle">
        <textPath href={`#${uid}-top`} startOffset="50%">YOUR LOCATION</textPath>
      </text>
      <text fontFamily="Georgia,serif" fontSize="7" fill="#b8a8a8" letterSpacing="1.5" textAnchor="middle">
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
  const [imageUrl, setImageUrl]       = useState<string|null>(null);
  const [imageFile, setImageFile]     = useState<File|null>(null);
  const [photoEffect, setPhotoEffect] = useState<PhotoEffect>("original");
  const [photoHover, setPhotoHover]   = useState(false);
  const [photoPos, setPhotoPos]       = useState({x:50,y:50});
  const [isPanning, setIsPanning]     = useState(false);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [modal, setModal]             = useState<ModalType>("none");
  const [penType, setPenType]         = useState<PenType>("calligraphy");
  const [jazzOn, setJazzOn]           = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [slideX, setSlideX]           = useState(0);
  const [hoveredCard, setHoveredCard] = useState<number|null>(null);
  const [openCardIdx, setOpenCardIdx] = useState<number|null>(null);
  const [openCardFlipped, setOpenCardFlipped] = useState(false);
  const [addrLines, setAddrLines]     = useState(["","","",""]);
  const [hoveredItem, setHoveredItem] = useState<string|null>(null);

  const fileRef      = useRef<HTMLInputElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const backCardRef  = useRef<HTMLDivElement>(null);
  const ghostRef     = useRef<HTMLDivElement>(null);

  // jazz refs
  const jazzCtxRef   = useRef<AudioContext|null>(null);
  const jazzOnRef    = useRef(false);
  const jazzBeatRef  = useRef(0);
  const jazzTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // slider
  const sliderDrag = useRef(false);
  const sliderStart= useRef(0);
  const SLIDE_MAX  = 268;

  // drag refs (not state — no re-render needed for internal tracking)
  const panActive   = useRef(false);
  const panStart    = useRef({cx:0,cy:0,px:50,py:50});

  const itemDragId  = useRef<string|null>(null);
  const itemDragStart = useRef({mx:0,my:0,ix:0,iy:0});

  const ghostActive = useRef(false);
  const ghostData   = useRef<{content:string;kind:"stamp"|"sticker"}|null>(null);

  const isPortrait = orientation === "portrait";
  const flipped    = side === "back";
  const cardW      = isPortrait ? 432 : 672;
  const cardH      = isPortrait ? 600 : 432;
  const ruledLines = Array.from({length: isPortrait ? 10 : 11});
  const hasContent = !!(message || imageUrl || placedItems.length > 0 || addrLines.some(Boolean));

  const penStyle: React.CSSProperties = penType === "calligraphy"
    ? {fontFamily:"'Dancing Script',cursive", fontSize:18, fontStyle:"italic"}
    : {fontFamily:"Courier New,monospace",    fontSize:14, fontStyle:"normal"};
  const photoFilter = photoEffect === "vintage" ? "sepia(60%) contrast(90%) brightness(95%) saturate(80%)" : undefined;

  // ── Consolidated window-level drag handlers ──
  useEffect(() => {
    function onMove(e: PointerEvent) {
      // photo pan
      if (panActive.current && imgRef.current && cardFrontRef.current) {
        const img  = imgRef.current;
        const card = cardFrontRef.current;
        const cw = card.offsetWidth, ch = card.offsetHeight;
        const iw = img.naturalWidth  || cw;
        const ih = img.naturalHeight || ch;
        const scale  = Math.max(cw/iw, ch/ih);
        const ovX    = Math.max(1, iw*scale - cw);
        const ovY    = Math.max(1, ih*scale - ch);
        const dx = -(e.clientX - panStart.current.cx) / ovX * 100;
        const dy = -(e.clientY - panStart.current.cy) / ovY * 100;
        setPhotoPos({
          x: Math.max(0, Math.min(100, panStart.current.px + dx)),
          y: Math.max(0, Math.min(100, panStart.current.py + dy)),
        });
        return;
      }

      // placed item drag
      if (itemDragId.current && backCardRef.current) {
        const card = backCardRef.current;
        const id   = itemDragId.current;
        setPlacedItems(prev => {
          const item = prev.find(it => it.id === id);
          if (!item) return prev;
          const nx = Math.max(0, Math.min(card.offsetWidth  - item.w, itemDragStart.current.ix + e.clientX - itemDragStart.current.mx));
          const ny = Math.max(0, Math.min(card.offsetHeight - item.h, itemDragStart.current.iy + e.clientY - itemDragStart.current.my));
          return prev.map(it => it.id===id ? {...it, x:nx, y:ny} : it);
        });
        return;
      }

      // ghost drag
      if (ghostActive.current && ghostRef.current) {
        ghostRef.current.style.left = (e.clientX - 24) + "px";
        ghostRef.current.style.top  = (e.clientY - 24) + "px";
      }
    }

    function onUp(e: PointerEvent) {
      if (panActive.current) {
        panActive.current = false;
        setIsPanning(false);
      }
      if (itemDragId.current) {
        itemDragId.current = null;
      }
      if (ghostActive.current) {
        ghostActive.current = false;
        if (ghostRef.current) ghostRef.current.style.display = "none";
        const gc = ghostData.current;
        ghostData.current = null;
        if (!gc) { setModal("none"); return; }
        // drop onto card
        if (backCardRef.current) {
          const rect = backCardRef.current.getBoundingClientRect();
          const w = 48, h = 48;
          if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const x = Math.max(0, Math.min(rect.width  - w, e.clientX - rect.left - w/2));
            const y = Math.max(0, Math.min(rect.height - h, e.clientY - rect.top  - h/2));
            setPlacedItems(prev => [...prev, {id:Date.now().toString(), kind:gc.kind, content:gc.content, x, y, w, h}]);
            setModal("none");
            return;
          }
        }
        // tap-to-place (didn't drag far)
        const w = 48, h = 48;
        setPlacedItems(prev => [...prev, {id:Date.now().toString(), kind:gc.kind, content:gc.content, x:isPortrait?300:540, y:20, w, h}]);
        setModal("none");
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  }, [isPortrait]);

  // ── Jazz engine ──
  const CHORDS = [
    [146.83,220.00,261.63,329.63,392.00],
    [196.00,246.94,329.63,392.00,440.00],
    [261.63,329.63,392.00,493.88,587.33],
    [220.00,261.63,329.63,392.00,493.88],
  ];
  const BASS = [146.83,164.81,174.61,185.00, 196.00,220.00,233.08,246.94, 261.63,246.94,220.00,196.00, 220.00,196.00,174.61,164.81];

  function jazzNote(ctx:AudioContext, type:OscillatorType, freq:number, when:number, dur:number, vol:number) {
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(vol, when+0.015);
    env.gain.exponentialRampToValueAtTime(0.001, when+dur);
    osc.connect(env); env.connect(ctx.destination);
    osc.start(when); osc.stop(when+dur+0.05);
  }

  function scheduleJazz() {
    const ctx = jazzCtxRef.current;
    if (!ctx || !jazzOnRef.current) return;
    const beat = jazzBeatRef.current;
    const TEMPO = 0.52;
    const now = ctx.currentTime;
    jazzNote(ctx, "sine", BASS[beat%BASS.length], now, TEMPO*0.9, 0.22);
    jazzNote(ctx, "sine", BASS[beat%BASS.length]*2, now, TEMPO*0.5, 0.06);
    const chord = CHORDS[Math.floor(beat/4)%CHORDS.length];
    const bar = beat%4;
    if (bar===1||bar===3) chord.forEach((f,i)=>jazzNote(ctx,"triangle",f,now+i*0.022,TEMPO*0.7,0.04));
    else if (bar===0&&Math.random()>0.5) chord.slice(1,4).forEach((f,i)=>jazzNote(ctx,"triangle",f,now+i*0.018,TEMPO*0.4,0.025));
    const noiseLen=0.04;
    const nBuf=ctx.createBuffer(1,ctx.sampleRate*noiseLen,ctx.sampleRate);
    const nd=nBuf.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=(Math.random()*2-1);
    const filt=ctx.createBiquadFilter(); filt.type="highpass"; filt.frequency.value=8000;
    for (const [t,v] of [[0,0.06],[TEMPO*0.65,0.03]] as [number,number][]) {
      const src=ctx.createBufferSource(), env=ctx.createGain();
      src.buffer=nBuf;
      env.gain.setValueAtTime(v,now+t); env.gain.exponentialRampToValueAtTime(0.001,now+t+noiseLen);
      src.connect(filt); filt.connect(env); env.connect(ctx.destination);
      src.start(now+t); src.stop(now+t+noiseLen);
    }
    jazzBeatRef.current++;
    jazzTimerRef.current = setTimeout(scheduleJazz, TEMPO*1000);
  }

  function toggleJazz() {
    if (!jazzOn) {
      const ctx = new (window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext)();
      jazzCtxRef.current = ctx; jazzBeatRef.current=0; jazzOnRef.current=true;
      setJazzOn(true); scheduleJazz();
    } else {
      jazzOnRef.current=false; setJazzOn(false);
      if (jazzTimerRef.current) clearTimeout(jazzTimerRef.current);
      jazzCtxRef.current?.close(); jazzCtxRef.current=null;
    }
  }

  // ── Handlers ──
  function handleReset() {
    if (!hasContent) return;
    if (!window.confirm("Reset and start over?")) return;
    setMessage(""); setImageUrl(null); setImageFile(null);
    setPlacedItems([]); setSide("front"); setSlideX(0);
    setPhotoPos({x:50,y:50}); setPhotoEffect("original");
    setAddrLines(["","","",""]);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
    setPhotoPos({x:50,y:50}); setPhotoEffect("original");
    e.target.value="";
  }

  async function uploadImage(file:File): Promise<string|null> {
    const {createClient} = await import("@supabase/supabase-js");
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const path = `${Date.now()}.${file.name.split(".").pop()}`;
    const {error} = await sb.storage.from("postcard-images").upload(path, file);
    if (error) return null;
    return sb.storage.from("postcard-images").getPublicUrl(path).data.publicUrl;
  }

  async function handleSend() {
    if (!recipientEmail) { setSendError("Please enter a recipient email."); return; }
    setSendError(""); setSending(true);
    try {
      let url = imageUrl;
      if (imageFile) url = await uploadImage(imageFile);
      const res = await fetch("/api/send", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({recipientEmail, message, imageUrl:url, orientation, bgColor:"#ffffff", stampEmoji: placedItems.find(it=>it.kind==="stamp")?.content||"🌿"}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Failed");
      setScreen("sent");
    } catch(e:unknown) {
      setSendError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setSending(false); }
  }

  function onSliderDown(e: React.PointerEvent<HTMLDivElement>) {
    sliderDrag.current=true; sliderStart.current=e.clientX-slideX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onSliderMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!sliderDrag.current) return;
    const nx=Math.max(0,Math.min(SLIDE_MAX,e.clientX-sliderStart.current));
    setSlideX(nx);
    if (nx>=SLIDE_MAX*0.88) { sliderDrag.current=false; handleSend(); }
  }
  function onSliderUp() { if(sliderDrag.current){sliderDrag.current=false;setSlideX(0);} }

  // photo pan start
  function onImgDown(e: React.PointerEvent<HTMLImageElement>) {
    if (!imageUrl) return;
    e.preventDefault(); e.stopPropagation();
    panActive.current = true;
    panStart.current  = {cx:e.clientX, cy:e.clientY, px:photoPos.x, py:photoPos.y};
    setIsPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  // placed item drag start
  function onItemDown(e: React.PointerEvent<HTMLDivElement>, id:string, x:number, y:number) {
    e.stopPropagation();
    itemDragId.current   = id;
    itemDragStart.current= {mx:e.clientX, my:e.clientY, ix:x, iy:y};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  // ghost drag start from modal
  function onModalItemDown(e: React.PointerEvent<HTMLButtonElement>, content:string, kind:"stamp"|"sticker") {
    e.preventDefault();
    ghostActive.current = true;
    ghostData.current   = {content, kind};
    const ghost = ghostRef.current;
    if (ghost) {
      ghost.innerHTML    = kind==="stamp" ? `<span style="font-size:36px">${content}</span>` : content;
      ghost.style.display= "flex";
      ghost.style.left   = (e.clientX-24)+"px";
      ghost.style.top    = (e.clientY-24)+"px";
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  const topBtn = (extra?:object) => ({display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:500,border:"1px solid #ddd",background:"#fff",borderRadius:8,padding:"8px 14px",cursor:"pointer",color:"#555",...extra});

  // ══════════════════════════════════════════════
  // SCREEN: LOGIN
  // ══════════════════════════════════════════════
  if (screen==="login") return (
    <div style={{minHeight:"100vh",background:"#f5f5f3",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{fonts}</style>
      <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:12,padding:"40px 36px",width:360,display:"flex",flexDirection:"column",gap:18,boxSizing:"border-box"}}>
        <h1 style={{fontSize:20,fontWeight:700,textAlign:"center",fontFamily:"'Playfair Display',Georgia,serif",margin:0}}>Postcards</h1>
        <p style={{fontSize:12,color:"#999",textAlign:"center",lineHeight:1.6,margin:0}}>A deliberate way to share a moment with someone you care about.</p>
        <input type="email" placeholder="your@email.com" style={{border:"1px solid #d0d0d0",borderRadius:8,padding:"10px 14px",fontSize:14,background:"#fafafa",outline:"none",width:"100%",boxSizing:"border-box"}}/>
        <button onClick={()=>setScreen("desk")} style={{width:"100%",background:"#333",color:"#fff",border:"none",borderRadius:8,padding:11,fontSize:14,cursor:"pointer"}}>Send magic link →</button>
        <div style={{fontSize:11,color:"#bbb",textAlign:"center"}}>No password. We&apos;ll email you a link to sign in.</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: SENT
  // ══════════════════════════════════════════════
  if (screen==="sent") return (
    <div style={{minHeight:"100vh",background:"#f5f5f3",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{fonts}</style>
      <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
        <div style={{fontSize:44}}>✉️</div>
        <h2 style={{fontSize:20,fontWeight:600,margin:0}}>Posted.</h2>
        <p style={{fontSize:13,color:"#888",maxWidth:260,lineHeight:1.6,margin:0}}>On its way to {recipientEmail}</p>
        <div style={{fontSize:12,color:"#aaa",border:"1px solid #ddd",borderRadius:20,padding:"4px 14px"}}>Arrives in a few minutes</div>
        <button onClick={()=>{setScreen("desk");}} style={{border:"1px solid #bbb",background:"#fff",borderRadius:8,padding:"9px 22px",fontSize:13,cursor:"pointer",color:"#333",marginTop:4}}>Send another</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: INBOX
  // ══════════════════════════════════════════════
  if (screen==="inbox") return (
    <div style={{minHeight:"100vh",background:"#f5f5f3",display:"flex",flexDirection:"column"}}>
      <style>{fonts}</style>

      {openCardIdx!==null && (()=>{
        const card=INBOX_ITEMS[openCardIdx];
        const rLines=Array.from({length:11});
        return (
          <div onClick={()=>{setOpenCardIdx(null);setOpenCardFlipped(false);}} style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
            <div onClick={e=>e.stopPropagation()} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
              <div style={{perspective:"1200px",cursor:"pointer"}} onClick={()=>setOpenCardFlipped(f=>!f)}>
                <div style={{width:600,height:384,position:"relative",transformStyle:"preserve-3d",transition:"transform 0.55s cubic-bezier(0.45,0.05,0.55,0.95)",transform:openCardFlipped?"rotateY(180deg)":"rotateY(0deg)"}}>
                  <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden"} as React.CSSProperties}>
                    <div style={{width:"100%",height:"100%",background:card.bg,borderRadius:10,border:"1.5px solid rgba(0,0,0,0.12)",boxShadow:"0 8px 40px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:120}}>{card.emoji}</div>
                  </div>
                  <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",transform:"rotateY(180deg)"} as React.CSSProperties}>
                    <div style={{width:"100%",height:"100%",background:"#fff",borderRadius:10,border:"1px solid #ddd",boxShadow:"0 8px 40px rgba(0,0,0,0.3)",display:"flex",overflow:"hidden"}}>
                      <div style={{width:"58%",borderRight:"1px solid #e8e4dc",position:"relative",padding:"28px 24px 0"}}>
                        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
                          {rLines.map((_,i)=><div key={i} style={{height:1,background:"#ece8e0",margin:"0 24px"}}/>)}
                        </div>
                        <div style={{position:"absolute",inset:"28px 24px",fontFamily:"'Dancing Script',cursive",fontSize:16,fontStyle:"italic",color:"#333",lineHeight:"36px",whiteSpace:"pre-wrap",zIndex:1,pointerEvents:"none"}}>{card.msg}</div>
                      </div>
                      <div style={{flex:1,display:"flex",flexDirection:"column"}}>
                        <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div><div style={pcTitle}>Postcard</div><div style={pcSub}>with love</div></div>
                          <div style={{position:"relative",flexShrink:0}}>
                            <div style={{width:58,height:72,background:"#f0eeea",borderRadius:3,position:"absolute",top:-6,right:-6}}/>
                            <div style={{width:58,height:72,border:"1.5px dashed #d8b8b8",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#c8a8a8",letterSpacing:"0.06em",textTransform:"uppercase",position:"relative",zIndex:1}}>Stamp</div>
                          </div>
                        </div>
                        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"0 20px 24px"}}>
                          {["Durga Vitankar","12 Garden Lane","Mumbai, India","400 001"].map((line,i)=>(
                            <div key={i} style={{borderBottom:"1px solid #ece8e0",height:34,display:"flex",alignItems:"flex-end",paddingBottom:4,fontFamily:"Georgia,serif",fontSize:12,color:"#333"}}>{line}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.65)"}}>From <strong style={{color:"#fff"}}>{card.from}</strong> · {card.date}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,padding:"3px 10px"}}>tap to flip</div>
                <button onClick={()=>{setOpenCardIdx(null);setOpenCardFlipped(false);}} style={{fontSize:12,color:"rgba(255,255,255,0.65)",background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"5px 12px",cursor:"pointer"}}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 48px 0",maxWidth:1200,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:28,fontWeight:700,color:"#111",letterSpacing:"-0.02em"}}>Received</div>
        <button onClick={()=>setScreen("desk")} style={{fontSize:13,color:"#777",cursor:"pointer",background:"none",border:"none",display:"flex",alignItems:"center",gap:5}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to writing
        </button>
      </div>
      <div style={{display:"flex",gap:8,padding:"20px 48px 0",maxWidth:1200,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        {["All","Unread"].map((f,i)=>(
          <button key={f} style={{fontSize:12,fontWeight:600,letterSpacing:"0.04em",color:i===0?"#fff":"#888",background:i===0?"#111":"none",border:`1px solid ${i===0?"#111":"#ddd"}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",textTransform:"uppercase"}}>{f}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:40,paddingBottom:120,flex:1,overflowY:"auto"}}>
        {INBOX_ITEMS.map((item,i)=>(
          <div key={item.id} style={{marginBottom:-28,position:"relative",cursor:"pointer",zIndex:INBOX_ITEMS.length-i,transition:"transform 0.22s ease,box-shadow 0.22s ease",transform:hoveredCard===i?`rotate(${item.rot*0.3}deg) translateY(-14px)`:`rotate(${item.rot}deg)`,transformOrigin:"center top"}}
            onMouseEnter={()=>setHoveredCard(i)} onMouseLeave={()=>setHoveredCard(null)}
            onClick={()=>{setOpenCardIdx(i);setOpenCardFlipped(false);}}>
            <div style={{width:490,height:314,background:item.bg,borderRadius:8,border:"1.5px solid rgba(0,0,0,0.10)",boxShadow:hoveredCard===i?"0 18px 48px rgba(0,0,0,0.22)":"0 4px 18px rgba(0,0,0,0.13)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:90,position:"relative",overflow:"hidden",transition:"box-shadow 0.22s ease"}}>
              {item.emoji}
              {item.unread&&<div style={{position:"absolute",top:12,left:12,width:9,height:9,borderRadius:"50%",background:"#111",border:"2px solid rgba(255,255,255,0.8)",zIndex:2}}/>}
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:8,padding:"10px 4px 0",transform:`rotate(${-item.rot*0.5}deg)`}}>
              <span style={{fontSize:12,fontWeight:600,color:"#333"}}>From {item.from}</span>
              <span style={{fontSize:11,color:"#bbb"}}>{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: SEND
  // ══════════════════════════════════════════════
  if (screen==="send") return (
    <div style={{minHeight:"100vh",background:"#f5f5f3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,fontFamily:"sans-serif"}}>
      <style>{fonts}</style>
      <button onClick={()=>setScreen("desk")} style={{position:"fixed",top:18,left:16,...topBtn(),color:"#777"}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      <div style={{width:isPortrait?110:170,height:isPortrait?154:110,borderRadius:8,overflow:"hidden",border:"1.5px solid rgba(0,0,0,0.12)",boxShadow:"0 4px 20px rgba(0,0,0,0.14)",transform:"rotate(-1.5deg)",background:"#f0f0ee"}}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${photoPos.x}% ${photoPos.y}%`,display:"block",filter:photoFilter}}/>
          : <div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#e8e4dc,#f5f3ef)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,color:"#ccc"}}>✉️</div>
        }
      </div>

      <h2 style={{fontSize:22,fontWeight:700,fontFamily:"'Playfair Display',Georgia,serif",margin:0,letterSpacing:"-0.01em"}}>Who&apos;s it going to?</h2>

      <div style={{width:340}}>
        <div style={{fontSize:11,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>To</div>
        <input type="email" value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} placeholder="their@email.com"
          style={{width:"100%",border:"1px solid #d0d0d0",borderRadius:10,padding:"11px 16px",fontSize:15,fontFamily:"Georgia,serif",color:"#333",background:"#fff",outline:"none",boxSizing:"border-box"}}/>
      </div>

      {sendError&&<p style={{color:"#e55",fontSize:13,margin:0}}>{sendError}</p>}

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
        <div style={{position:"relative",display:"flex",alignItems:"center"}}>
          <div style={{width:340,height:56,border:"1.5px solid #ddd",borderRadius:14,background:"#f0ede8",position:"relative",overflow:"visible",display:"flex",alignItems:"center"}}>
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",fontSize:12,color:"#ccc",pointerEvents:"none",whiteSpace:"nowrap"}}>slide to send ›</div>
            <div onPointerDown={onSliderDown} onPointerMove={onSliderMove} onPointerUp={onSliderUp}
              style={{position:"absolute",left:4+slideX,top:"50%",transform:"translateY(-50%)",width:72,height:46,background:"#fff",border:"1px solid #ddd",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"grab",userSelect:"none",touchAction:"none",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",zIndex:5,flexDirection:"column",gap:2}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <div style={{fontSize:10,color:"#ccc"}}>send</div>
            </div>
          </div>
          <div style={{position:"absolute",right:-52,top:"50%",transform:"translateY(-50%)",fontSize:40,pointerEvents:"none",filter:slideX>SLIDE_MAX*0.5?"none":"grayscale(1) opacity(0.4)"}}>
            {slideX>SLIDE_MAX*0.6?"📬":"📪"}
          </div>
        </div>
        <div style={{fontSize:12,color:"#bbb"}}>The postcard will be posted at 6pm</div>
        <button onClick={handleSend} disabled={sending} style={{background:sending?"#999":"#111",color:"#fff",border:"none",borderRadius:10,padding:"11px 36px",fontSize:14,cursor:sending?"default":"pointer",fontWeight:600}}>
          {sending?"Sending…":"Send now ✈"}
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // SCREEN: DESK
  // ══════════════════════════════════════════════
  const backCard = (ref: React.RefObject<HTMLDivElement | null>, extraStyle: React.CSSProperties) => (
    <div ref={ref} style={{width:"100%",height:"100%",background:"#fff",border:"1px solid #ddd",borderRadius:10,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",position:"relative",overflow:"hidden",...extraStyle}}>
      {/* placed items */}
      {placedItems.map(item=>(
        <div key={item.id}
          style={{position:"absolute",left:item.x,top:item.y,width:item.w,height:item.h,cursor:"move",userSelect:"none",zIndex:20,touchAction:"none"}}
          onPointerDown={e=>onItemDown(e,item.id,item.x,item.y)}
          onMouseEnter={()=>setHoveredItem(item.id)}
          onMouseLeave={()=>setHoveredItem(null)}>
          {item.kind==="stamp"
            ? <span style={{fontSize:item.w,lineHeight:1,display:"block"}}>{item.content}</span>
            : <span dangerouslySetInnerHTML={{__html:item.content}} style={{display:"block",width:"100%",height:"100%"}}/>
          }
          {hoveredItem===item.id&&(
            <>
              <button onClick={e=>{e.stopPropagation();setPlacedItems(prev=>prev.filter(it=>it.id!==item.id));}} style={{position:"absolute",top:-8,right:-8,width:18,height:18,borderRadius:"50%",background:"#333",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:21,lineHeight:1}}>×</button>
              <div style={{position:"absolute",bottom:-4,right:-4,width:12,height:12,background:"#555",borderRadius:2,cursor:"se-resize",zIndex:21}}/>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f3",position:"relative",overflow:"hidden"}}>
      <style>{fonts+keyframes}</style>

      {/* ghost drag element */}
      <div ref={ghostRef} style={{position:"fixed",display:"none",zIndex:9999,pointerEvents:"none",width:48,height:48,alignItems:"center",justifyContent:"center"}}/>

      {/* top-left */}
      <button onClick={()=>setScreen("inbox")} style={{position:"fixed",top:18,left:16,zIndex:50,...topBtn()}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
        </svg>
        Received
        <span style={{background:"#111",color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"1px 6px",lineHeight:1.5}}>3</span>
      </button>

      {/* top-right */}
      <button onClick={handleReset} disabled={!hasContent}
        style={{position:"fixed",top:18,right:120,zIndex:50,...topBtn({color:hasContent?"#888":"#ccc",opacity:hasContent?1:0.5,cursor:hasContent?"pointer":"default"})}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
        Reset
      </button>
      <button onClick={()=>setScreen("send")} style={{position:"fixed",top:18,right:24,zIndex:50,display:"flex",alignItems:"center",gap:7,fontSize:13,fontWeight:600,color:"#fff",background:"#111",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>
        Send
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>

      {/* left sidebar */}
      <div style={{position:"fixed",left:16,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:10,zIndex:50}}>
        <SbTile active={false} onClick={()=>setOrientation(o=>o==="landscape"?"portrait":"landscape")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {isPortrait?<rect x="6" y="2" width="13" height="20" rx="2"/>:<rect x="2" y="6" width="20" height="13" rx="2"/>}
          </svg>
          <span style={tileLabel(false)}>Orient</span>
        </SbTile>
        <div style={{height:1,background:"#e8e8e6",margin:"2px 8px"}}/>
        <SbTile active={side==="front"} onClick={()=>setSide("front")}>
          <div style={{width:isPortrait?26:44,height:isPortrait?38:28,borderRadius:3,border:"1px solid rgba(0,0,0,0.08)",overflow:"hidden",flexShrink:0,background:"#e8e8e6"}}>
            {imageUrl&&<img src={imageUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${photoPos.x}% ${photoPos.y}%`,filter:photoFilter}}/>}
          </div>
          <span style={tileLabel(side==="front")}>Front</span>
        </SbTile>
        <SbTile active={side==="back"} onClick={()=>setSide("back")}>
          <div style={{width:isPortrait?26:44,height:isPortrait?38:28,borderRadius:3,background:"#f8f8f6",border:"1px solid rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",justifyContent:"space-evenly",padding:"3px 4px",flexShrink:0}}>
            {[0,1,2].map(i=><div key={i} style={{height:1,background:"#c8c8c8"}}/>)}
          </div>
          <span style={tileLabel(side==="back")}>Back</span>
        </SbTile>
      </div>

      {/* 3D card */}
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 100px"}}>
        <div style={{perspective:"1200px"}}>
          <div style={{position:"relative",width:cardW,height:cardH,transformStyle:"preserve-3d",transition:"transform 0.55s cubic-bezier(0.45,0.05,0.55,0.95)",transform:flipped?"rotateY(180deg)":"rotateY(0deg)"}}>

            {/* FRONT */}
            <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden"} as React.CSSProperties}>
              <div ref={cardFrontRef}
                style={{width:"100%",height:"100%",background:"#fff",border:imageUrl?"1.5px solid #ccc":"1.5px dashed #c8c8c8",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,position:"relative",overflow:"hidden",boxShadow:imageUrl?"0 2px 12px rgba(0,0,0,0.08)":"none",cursor:imageUrl?(isPanning?"grabbing":"grab"):"pointer"}}
                onClick={()=>{if(!imageUrl)fileRef.current?.click();}}
                onMouseEnter={()=>imageUrl&&setPhotoHover(true)}
                onMouseLeave={()=>setPhotoHover(false)}>
                {imageUrl?(
                  <>
                    <img ref={imgRef} src={imageUrl} alt=""
                      draggable={false}
                      onPointerDown={onImgDown}
                      style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${photoPos.x}% ${photoPos.y}%`,display:"block",borderRadius:9,filter:photoFilter,userSelect:"none",WebkitUserDrag:"none",touchAction:"none"} as React.CSSProperties}/>
                    {photoHover&&!isPanning&&(
                      <>
                        <div style={{position:"absolute",top:10,right:10,display:"flex",gap:6,zIndex:10}}>
                          <button onClick={e=>{e.stopPropagation();fileRef.current?.click();}} style={{background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>Change</button>
                          <button onClick={e=>{e.stopPropagation();setImageUrl(null);setImageFile(null);setPhotoHover(false);}} style={{background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>Remove</button>
                        </div>
                        <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:11,borderRadius:20,padding:"4px 12px",pointerEvents:"none",whiteSpace:"nowrap"}}>Drag to reposition</div>
                      </>
                    )}
                  </>
                ):(
                  <>
                    <div style={{width:28,height:28,border:"1.5px solid #c0c0c0",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#b0b0b0",fontSize:18}}>+</div>
                    <div style={{fontSize:13,color:"#b0b0b0"}}>Add image</div>
                  </>
                )}
              </div>
            </div>

            {/* BACK */}
            <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",WebkitBackfaceVisibility:"hidden",transform:"rotateY(180deg)"} as React.CSSProperties}>
              {isPortrait?(
                <div ref={backCardRef} style={{width:"100%",height:"100%",background:"#fff",border:"1px solid #ddd",borderRadius:10,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
                  {placedItems.map(item=>(
                    <div key={item.id} style={{position:"absolute",left:item.x,top:item.y,width:item.w,height:item.h,cursor:"move",userSelect:"none",zIndex:20,touchAction:"none"}}
                      onPointerDown={e=>onItemDown(e,item.id,item.x,item.y)}
                      onMouseEnter={()=>setHoveredItem(item.id)} onMouseLeave={()=>setHoveredItem(null)}>
                      {item.kind==="stamp"?<span style={{fontSize:item.w,lineHeight:1,display:"block"}}>{item.content}</span>:<span dangerouslySetInnerHTML={{__html:item.content}} style={{display:"block",width:"100%",height:"100%"}}/>}
                      {hoveredItem===item.id&&(<>
                        <button onClick={e=>{e.stopPropagation();setPlacedItems(p=>p.filter(i=>i.id!==item.id));}} style={{position:"absolute",top:-8,right:-8,width:18,height:18,borderRadius:"50%",background:"#333",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:21}}>×</button>
                        <div style={{position:"absolute",bottom:-4,right:-4,width:12,height:12,background:"#555",borderRadius:2,cursor:"se-resize",zIndex:21}}/>
                      </>)}
                    </div>
                  ))}
                  <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
                    <div>
                      <div style={pcTitle}>Postcard</div><div style={pcSub}>with love</div>
                      <div style={{display:"flex",flexDirection:"column",marginTop:12}}>
                        {["Name","Address","City, Country"].map((p,i)=>(
                          <input key={p} type="text" placeholder={p} value={addrLines[i]} onChange={e=>setAddrLines(prev=>{const a=[...prev];a[i]=e.target.value;return a;})} style={addrInput(180)}/>
                        ))}
                      </div>
                    </div>
                    <StampZone stamp={placedItems.find(it=>it.kind==="stamp")?.content||null} uid="pm-p"/>
                  </div>
                  <RuledTextarea value={message} onChange={setMessage} lines={ruledLines} padTop={16} padH={24} penStyle={penStyle}/>
                </div>
              ):(
                <div ref={backCardRef} style={{width:"100%",height:"100%",background:"#fff",border:"1px solid #ddd",borderRadius:10,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",display:"flex",overflow:"hidden",position:"relative"}}>
                  {placedItems.map(item=>(
                    <div key={item.id} style={{position:"absolute",left:item.x,top:item.y,width:item.w,height:item.h,cursor:"move",userSelect:"none",zIndex:20,touchAction:"none"}}
                      onPointerDown={e=>onItemDown(e,item.id,item.x,item.y)}
                      onMouseEnter={()=>setHoveredItem(item.id)} onMouseLeave={()=>setHoveredItem(null)}>
                      {item.kind==="stamp"?<span style={{fontSize:item.w,lineHeight:1,display:"block"}}>{item.content}</span>:<span dangerouslySetInnerHTML={{__html:item.content}} style={{display:"block",width:"100%",height:"100%"}}/>}
                      {hoveredItem===item.id&&(<>
                        <button onClick={e=>{e.stopPropagation();setPlacedItems(p=>p.filter(i=>i.id!==item.id));}} style={{position:"absolute",top:-8,right:-8,width:18,height:18,borderRadius:"50%",background:"#333",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:21}}>×</button>
                        <div style={{position:"absolute",bottom:-4,right:-4,width:12,height:12,background:"#555",borderRadius:2,cursor:"se-resize",zIndex:21}}/>
                      </>)}
                    </div>
                  ))}
                  <div style={{width:"58%",borderRight:"1px solid #e8e4dc",position:"relative",padding:"28px 24px 0"}}>
                    <RuledTextarea value={message} onChange={setMessage} lines={ruledLines} padTop={28} padH={24} penStyle={penStyle}/>
                  </div>
                  <div style={{flex:1,display:"flex",flexDirection:"column"}}>
                    <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div><div style={pcTitle}>Postcard</div><div style={pcSub}>with love</div></div>
                      <StampZone stamp={placedItems.find(it=>it.kind==="stamp")?.content||null} uid="pm-l"/>
                    </div>
                    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"0 20px 24px"}}>
                      {["Name","Address","City, Country","Postal code"].map((p,i)=>(
                        <input key={p} type="text" placeholder={p} value={addrLines[i]} onChange={e=>setAddrLines(prev=>{const a=[...prev];a[i]=e.target.value;return a;})} style={addrInput("100%")}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* effect pills - front with photo */}
      {side==="front"&&imageUrl&&(
        <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",display:"flex",gap:8,zIndex:50}}>
          {(["Original","Vintage"] as const).map(ef=>{
            const key = ef==="Original"?"original":"vintage";
            const active = photoEffect===key;
            return <button key={ef} onClick={()=>setPhotoEffect(key)} style={{border:`1px solid ${active?"#333":"#d0d0d0"}`,background:active?"#333":"#fff",color:active?"#fff":"#555",borderRadius:20,padding:"7px 20px",fontSize:13,cursor:"pointer",fontWeight:active?600:400}}>{ef}</button>;
          })}
        </div>
      )}

      {/* starter pills - back */}
      {side==="back"&&(
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",display:"flex",gap:8,zIndex:50}}>
          {STARTER_PILLS.map(p=>(
            <button key={p.text} onClick={()=>setMessage(p.text)} style={{border:"1px solid #d0d0d0",background:"#fff",borderRadius:20,padding:"7px 16px",fontSize:13,fontStyle:"italic",cursor:"pointer",color:"#888",whiteSpace:"nowrap",transform:`rotate(${p.r})`}}>{p.text}</button>
          ))}
        </div>
      )}

      {/* toolbar - back */}
      {side==="back"&&(
        <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:10,zIndex:50}}>
          <button onClick={()=>setModal("pen")} style={{border:"1px solid #d0d0d0",background:"#fff",borderRadius:10,padding:"7px 16px",fontSize:13,cursor:"pointer",color:"#333",fontStyle:"italic"}}>Font</button>
          <CircleBtn onClick={()=>setModal("stamp")} title="Add stamp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 .88-.28 1.7-.77 2.36L17 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2l-1.77 1.64A4 4 0 1 1 8 15.08V10H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2l1.77-1.64A4 4 0 0 1 12 2z"/>
              <line x1="8" y1="20" x2="16" y2="20"/>
            </svg>
          </CircleBtn>
          <CircleBtn onClick={()=>setModal("sticker")} title="Add sticker">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.19 0 2-.95 2-2.11v-.39c0-.49.41-.9.9-.9h1.2c3.59 0 5.9-3.85 5.9-6.6C22 6.05 17.52 2 12 2z"/>
              <circle cx="8.5" cy="10.5" r="1.2" fill="currentColor" stroke="none"/>
              <circle cx="14.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
            </svg>
          </CircleBtn>
        </div>
      )}

      {/* jazz record */}
      <div onClick={toggleJazz} style={{position:"fixed",bottom:22,left:22,width:56,height:56,cursor:"pointer",zIndex:50,filter:`drop-shadow(0 2px 6px rgba(0,0,0,0.18))`}} title={jazzOn?"Stop jazz":"Play jazz"}>
        <svg style={{animation:jazzOn?"vinyl-spin 4.5s linear infinite":"none"}} viewBox="0 0 56 56" width="56" height="56">
          <circle cx="28" cy="28" r="27" fill="#1a1a1a"/>
          <circle cx="28" cy="28" r="20" fill="#2a2a2a"/>
          <circle cx="28" cy="28" r="13" fill="#1a1a1a"/>
          <circle cx="28" cy="28" r="6"  fill="#333"/>
          <circle cx="28" cy="28" r="2.5" fill="#555"/>
          {[0,45,90,135,180,225,270,315].map((deg,i)=>(
            <line key={i} x1="28" y1="28" x2={28+10*Math.cos(deg*Math.PI/180)} y2={28+10*Math.sin(deg*Math.PI/180)} stroke="#333" strokeWidth="1.5"/>
          ))}
          <circle cx="34" cy="22" r="3" fill="#c0392b" opacity="0.9"/>
        </svg>
        {jazzOn&&<div style={{position:"absolute",bottom:-18,left:"50%",transform:"translateX(-50%)",fontSize:9,color:"#999",whiteSpace:"nowrap"}}>♩ playing</div>}
      </div>

      {/* stamp modal */}
      {modal==="stamp"&&(
        <div onClick={()=>setModal("none")} style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:80}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:20,width:360,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,fontWeight:600}}>Pick a stamp — drag onto the card</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
              {STAMP_OPTS.map(s=>(
                <button key={s} onPointerDown={e=>onModalItemDown(e,s,"stamp")}
                  style={{height:52,border:"1px solid #f0ede8",background:"#faf8f5",borderRadius:8,fontSize:28,cursor:"grab",touchAction:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>{s}</button>
              ))}
            </div>
            <button onClick={()=>setModal("none")} style={{border:"1px solid #ddd",background:"#f5f5f3",borderRadius:8,padding:9,fontSize:13,cursor:"pointer",color:"#555"}}>Close</button>
          </div>
        </div>
      )}

      {/* sticker modal */}
      {modal==="sticker"&&(
        <div onClick={()=>setModal("none")} style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:80}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:20,width:380,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,fontWeight:600}}>Botanical stickers — drag onto the card</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {STICKER_OPTS.map(s=>(
                <button key={s.id} onPointerDown={e=>onModalItemDown(e,s.svg,"sticker")}
                  style={{height:72,border:"1px solid #f0ede8",background:"#faf8f5",borderRadius:10,cursor:"grab",touchAction:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:8}}>
                  <span dangerouslySetInnerHTML={{__html:s.svg}}/>
                  <span style={{fontSize:10,color:"#999"}}>{s.label}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setModal("none")} style={{border:"1px solid #ddd",background:"#f5f5f3",borderRadius:8,padding:9,fontSize:13,cursor:"pointer",color:"#555"}}>Close</button>
          </div>
        </div>
      )}

      {/* pen modal */}
      {modal==="pen"&&(
        <div onClick={()=>setModal("none")} style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:80}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:20,width:340,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,fontWeight:600}}>Choose writing style</div>
            <div style={{display:"flex",gap:10}}>
              {([
                {id:"calligraphy" as PenType, label:"Calligraphy", style:{fontFamily:"'Dancing Script',cursive",fontSize:17,fontStyle:"italic"}, preview:"Thinking of you…"},
                {id:"ink"         as PenType, label:"Ink",         style:{fontFamily:"Courier New,monospace",fontSize:14},                      preview:"Thinking of you…"},
              ]).map(opt=>(
                <button key={opt.id} onClick={()=>{setPenType(opt.id);setModal("none");}}
                  style={{flex:1,border:`1.5px solid ${penType===opt.id?"#333":"#ddd"}`,background:penType===opt.id?"#f5f5f3":"#fff",borderRadius:10,padding:"14px 10px",cursor:"pointer",display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",color:penType===opt.id?"#333":"#aaa"}}>{opt.label}</div>
                  <div style={{...opt.style as React.CSSProperties,color:"#555"}}>{opt.preview}</div>
                </button>
              ))}
            </div>
            <button onClick={()=>setModal("none")} style={{border:"1px solid #ddd",background:"#f5f5f3",borderRadius:8,padding:9,fontSize:13,cursor:"pointer",color:"#555"}}>Close</button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload}/>
    </div>
  );
}

function SbTile({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}) {
  return <div onClick={onClick} style={{width:72,height:82,background:"#fff",borderRadius:12,border:active?"2px solid #555":"1px solid #e2e2e0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",boxShadow:active?"0 1px 4px rgba(0,0,0,0.10)":"0 1px 3px rgba(0,0,0,0.05)"}}>{children}</div>;
}

function CircleBtn({onClick,title,children}:{onClick:()=>void;title:string;children:React.ReactNode}) {
  return <div onClick={onClick} title={title} style={{width:36,height:36,border:"1.5px solid #c0c0c0",borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#666"}}>{children}</div>;
}

function StampZone({stamp,uid}:{stamp:string|null;uid:string}) {
  const isEmoji = stamp && !stamp.startsWith("<");
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <div style={{width:58,height:72,background:"#f0eeea",borderRadius:3,position:"absolute",top:-6,right:-6}}/>
      <div style={{width:58,height:72,border:"1.5px dashed #d8b8b8",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1}}>
        {isEmoji ? <span style={{fontSize:22}}>{stamp}</span>
         : stamp  ? <span dangerouslySetInnerHTML={{__html:stamp}} style={{width:36,height:36,display:"block"}}/>
                  : <span style={{fontSize:9,color:"#c8a8a8",letterSpacing:"0.06em",textTransform:"uppercase"}}>Stamp</span>}
      </div>
      <div style={{position:"absolute",bottom:-30,left:-30,opacity:0.8,pointerEvents:"none",zIndex:2}}><PostmarkSVG uid={uid}/></div>
    </div>
  );
}

function RuledTextarea({value,onChange,lines,padTop,padH,penStyle}:{value:string;onChange:(v:string)=>void;lines:unknown[];padTop:number;padH:number;penStyle:React.CSSProperties}) {
  return (
    <div style={{flex:1,position:"relative"}}>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"space-around"}}>
        {lines.map((_,i)=><div key={i} style={{height:1,background:"#ece8e0",margin:`0 ${padH}px`}}/>)}
      </div>
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder="Write your message…" maxLength={280}
        style={{position:"absolute",inset:`${padTop}px ${padH}px`,border:"none",background:"transparent",resize:"none",...penStyle,color:"#333",lineHeight:"36px",outline:"none",zIndex:1}}/>
    </div>
  );
}

function tileLabel(active:boolean): React.CSSProperties {
  return {fontSize:10,letterSpacing:"0.04em",textTransform:"uppercase",color:active?"#222":"#999",fontWeight:500};
}
function addrInput(w:number|string): React.CSSProperties {
  return {border:"none",borderBottom:"1px solid #ece8e0",height:34,width:w,background:"transparent",fontFamily:"Georgia,serif",fontSize:12,color:"#333",padding:"14px 4px 2px",outline:"none",boxSizing:"border-box"};
}

const pcTitle: React.CSSProperties = {fontFamily:"'Playfair Display',Georgia,serif",fontSize:15,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase",color:"#1a1a1a"};
const pcSub:   React.CSSProperties = {fontFamily:"'Dancing Script',cursive",fontSize:13,color:"#b0a0a0",marginTop:2};
const fonts    = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@400&display=swap');`;
const keyframes= `@keyframes vinyl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
