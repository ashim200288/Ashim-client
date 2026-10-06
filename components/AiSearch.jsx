"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, ImageUp, X } from "lucide-react";
import { api, uploadImage } from "@/lib/api";

// F2: describe what you want in words, or search with a picture.
export default function AiSearch({ onResults, onClear, active }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn, label) => {
    setBusy(true);
    try {
      const r = await fn();
      onResults({ items: r.items, label, notice: r.fallback ? r.message : "" });
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  const text = (e) => { e.preventDefault(); if (q.trim()) run(() => api(`/ai/search?q=${encodeURIComponent(q.trim())}`), `Results for "${q.trim()}"`); };
  const image = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (f) run(async () => api("/ai/search/image", { method: "POST", body: { imageUrl: await uploadImage(f) } }), "Artworks similar to your image");
  };

  return (
    <form onSubmit={text} className="card p-4 mt-6 border-brand/40">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand"><Sparkles size={16} /> AI search: describe a feeling, a place or a colour</p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder='e.g. "calm blue abstract for a bedroom"' aria-label="Describe the art you want" />
        <button className="btn btn-primary shrink-0" disabled={busy}>{busy ? "Searching…" : "Search"}</button>
        <label className={`btn btn-ghost shrink-0 ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          <ImageUp size={16} /> By image
          <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={image} />
        </label>
        {active && <button type="button" onClick={() => { setQ(""); onClear(); }} className="btn btn-ghost shrink-0"><X size={16} /> Clear</button>}
      </div>
    </form>
  );
}
