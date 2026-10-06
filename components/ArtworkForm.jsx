"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { api, uploadImage, money, CATEGORIES } from "@/lib/api";

const AiBadge = ({ show, onConfirm }) =>
  show ? (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
      <Sparkles size={12} /> AI suggested
      <button type="button" onClick={onConfirm} className="underline ml-1">Confirm</button>
    </span>
  ) : null;

export default function ArtworkForm({ initial }) {
  const router = useRouter();
  const [f, setF] = useState(initial ? { ...initial, tags: (initial.tags || []).join(", ") } : { title: "", description: "", price: "", category: CATEGORIES[0], image: "", tags: "" });
  const [file, setFile] = useState(null);
  const [owns, setOwns] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [unconfirmed, setUnconfirmed] = useState({}); // AI-08: fields still labelled "AI suggested"
  const [price, setPrice] = useState(null);

  const edit = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setUnconfirmed((u) => ({ ...u, [k]: false })); };
  const confirm = (k) => setUnconfirmed((u) => ({ ...u, [k]: false }));

  // Uploads once; later calls reuse the hosted URL
  const ensureImage = async () => {
    if (!file) return f.image;
    const url = await uploadImage(file);
    setF((x) => ({ ...x, image: url }));
    setFile(null);
    return url;
  };

  const suggest = async () => {
    setAiBusy(true); setAiNote("");
    try {
      const imageUrl = await ensureImage();
      if (!imageUrl) throw new Error("Choose an image first");
      const r = await api("/ai/listing-assist", { method: "POST", body: { imageUrl } });
      if (r.suggestion) {
        setF((x) => ({ ...x, image: imageUrl, title: r.suggestion.title, description: r.suggestion.description, category: r.suggestion.category, tags: r.suggestion.tags.join(", ") }));
        setUnconfirmed({ title: true, description: true, category: true, tags: true });
      }
      setPrice(r.price);
      setAiNote(r.warnings?.join(" ") || "");
      toast.success("AI suggestions added. Review them before publishing.");
    } catch (e) {
      setAiNote(`${e.message}${e.message.includes("manually") ? "" : ". You can fill in the details manually."}`);
      toast.error("AI suggestions unavailable");
    }
    setAiBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (Object.values(unconfirmed).some(Boolean)) return toast.error("Please confirm or edit the AI-suggested fields first");
    setBusy(true);
    try {
      const image = await ensureImage();
      if (!image) throw new Error("Please choose an image");
      const body = { title: f.title, description: f.description, price: +f.price, category: f.category, image, tags: f.tags };
      const res = initial ? await api(`/artworks/${initial._id}`, { method: "PUT", body }) : await api("/artworks", { method: "POST", body });
      if (res.flaggedAsDuplicate) toast("This upload looks similar to an existing artwork and was sent to an admin for review.", { icon: "🔎", duration: 6000 });
      toast.success(initial ? "Artwork updated" : "Artwork added");
      router.push("/dashboard/artist");
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  };

  const preview = file ? URL.createObjectURL(file) : f.image;

  return (
    <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
      <div>
        <input type="file" accept="image/*" className="input" onChange={(e) => { setFile(e.target.files[0]); setPrice(null); }} />
        {preview && <img src={preview} alt="Preview" className="mt-3 h-40 rounded-lg object-cover" />}
        <button type="button" className="btn btn-ghost mt-3" disabled={aiBusy || (!file && !f.image)} onClick={suggest}>
          <Sparkles size={16} /> {aiBusy ? "Analysing…" : "Suggest title, tags & price with AI"}
        </button>
        <p className="mt-2 text-xs text-muted">If you use AI suggestions, your image is sent to Google's Gemini API for analysis. Suggestions are drafts: you decide what to publish.</p>
        {aiNote && <p className="mt-2 text-sm rounded-lg bg-brand-soft text-brand px-3 py-2">{aiNote}</p>}
      </div>

      <label className="block text-sm font-semibold">Title<AiBadge show={unconfirmed.title} onConfirm={() => confirm("title")} />
        <input className="input mt-1 font-normal" required value={f.title} onChange={edit("title")} /></label>
      <label className="block text-sm font-semibold">Description<AiBadge show={unconfirmed.description} onConfirm={() => confirm("description")} />
        <textarea className="input mt-1 min-h-32 font-normal" required value={f.description} onChange={edit("description")} /></label>
      <label className="block text-sm font-semibold">Tags (comma separated)<AiBadge show={unconfirmed.tags} onConfirm={() => confirm("tags")} />
        <input className="input mt-1 font-normal" value={f.tags} onChange={edit("tags")} placeholder="calm, blue, abstract" /></label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold">Price (USD)
          <input className="input mt-1 font-normal" type="number" min="1" step="0.01" required value={f.price} onChange={edit("price")} /></label>
        <label className="block text-sm font-semibold">Category<AiBadge show={unconfirmed.category} onConfirm={() => confirm("category")} />
          <select className="input mt-1 font-normal" value={f.category} onChange={edit("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>

      {price && (
        <div className="rounded-xl border border-brand/40 bg-brand-soft/50 p-4 text-sm">
          <p className="font-semibold text-brand flex items-center gap-1"><Sparkles size={14} /> AI price guidance: {money(price.low)} to {money(price.high)}</p>
          <p className="mt-1">{price.reason}</p>
          <p className="mt-2 text-muted">Based on:{" "}
            {price.basedOn.map((b, i) => <span key={b.id}>{i > 0 && ", "}<Link href={`/artworks/${b.id}`} className="underline" target="_blank">{b.title}</Link> ({money(b.price)})</span>)}
          </p>
          <button type="button" className="btn btn-ghost mt-3 !py-1.5" onClick={() => setF({ ...f, price: Math.round((price.low + price.high) / 2) })}>Use {money(Math.round((price.low + price.high) / 2))}</button>
          <p className="mt-2 text-xs text-muted">Guidance only. You set the final price.</p>
        </div>
      )}

      {!initial && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={owns} onChange={(e) => setOwns(e.target.checked)} required />
          I confirm I created this artwork or have the right to sell it.
        </label>
      )}
      <button className="btn btn-primary" disabled={busy || !owns}>{busy ? "Saving…" : initial ? "Save changes" : "Publish artwork"}</button>
    </form>
  );
}
