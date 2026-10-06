"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import ArtCard from "./ArtCard";
import { CardSkeleton } from "./ui";

// F3: six most similar artworks
export default function Similar({ artworkId }) {
  const [data, setData] = useState(null);
  useEffect(() => { setData(null); api(`/ai/similar/${artworkId}`).then(setData).catch(() => setData({ items: [] })); }, [artworkId]);
  if (data && data.items.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles size={20} className="text-brand" /> {data?.fallback ? "More in this category" : "You might also like"}</h2>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {data === null ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : data.items.map((a) => <ArtCard key={a._id} art={a} score={a.score} />)}
      </div>
    </section>
  );
}
