"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, money, date } from "@/lib/api";
import { RowSkeleton, Empty } from "@/components/ui";

export default function Duplicates() {
  const [list, setList] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const load = () => api("/ai/duplicates").then(setList).catch(() => { setList([]); toast.error("Failed to load review list"); });
  useEffect(() => { load(); }, []);

  const dismiss = async (a) => {
    try { await api(`/ai/duplicates/${a._id}/dismiss`, { method: "PATCH" }); setList(list.filter((x) => x._id !== a._id)); toast.success("Marked as not a duplicate"); }
    catch (e) { toast.error(e.message); }
  };
  const remove = async (a) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try { await api(`/artworks/${a._id}`, { method: "DELETE" }); setList(list.filter((x) => x._id !== a._id)); toast.success("Artwork deleted"); }
    catch (e) { toast.error(e.message); }
  };

  // Embeds artworks that have no AI vector yet (e.g. demo data), 10 per call
  const reindex = async () => {
    setIndexing(true);
    try {
      let r;
      do { r = await api("/ai/reindex", { method: "POST" }); } while (r.remaining > 0 && r.done > 0);
      if (r.remaining > 0) toast.error(`${r.remaining} artworks could not be indexed${r.lastError ? `: ${r.lastError}` : ""}`);
      else toast.success("All artworks are indexed for AI search");
      load();
    } catch (e) { toast.error(e.message); }
    setIndexing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">AI duplicate review</h1><p className="text-muted">New uploads that look very similar to an existing artwork. You decide: nothing is removed automatically.</p></div>
        <button className="btn btn-ghost" onClick={reindex} disabled={indexing}>{indexing ? "Indexing…" : "Index artworks for AI"}</button>
      </div>
      {list === null ? <RowSkeleton rows={3} /> : list.length === 0 ? <Empty title="Nothing to review" hint="Flagged uploads will appear here." /> : list.map((a) => (
        <div key={a._id} className="card p-4">
          <div className="grid md:grid-cols-[200px_1fr] gap-4">
            <div><img src={a.image} alt={a.title} className="w-full rounded-lg object-cover aspect-[4/5]" />
              <p className="mt-2 font-semibold">{a.title}</p><p className="text-sm text-muted">by {a.artist?.name} · {money(a.price)} · {date(a.createdAt)}</p></div>
            <div>
              <p className="text-sm font-semibold mb-2">Looks similar to:</p>
              <div className="flex flex-wrap gap-3">
                {a.duplicates.filter((d) => d.artwork).map((d) => (
                  <Link key={d.artwork._id} href={`/artworks/${d.artwork._id}`} className="w-32 block">
                    <img src={d.artwork.image} alt={d.artwork.title} className="rounded-lg object-cover aspect-[4/5] w-full" />
                    <p className="mt-1 text-xs font-semibold truncate">{d.artwork.title}</p>
                    <p className="text-xs text-muted">{Math.round(d.score * 100)}% similar · {d.artwork.artist?.name}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn btn-primary" onClick={() => dismiss(a)}>Not a duplicate</button>
                <button className="btn btn-danger" onClick={() => remove(a)}>Delete artwork</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
