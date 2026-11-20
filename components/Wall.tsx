"use client";

import { useEffect, useState } from "react";
import { supabase, Post } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";

const MAX = 280;
const NAME = "Kimberly Padilla";

export default function Wall() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) setError("Could not load posts.");
      else setPosts(data);
      setLoading(false);
    }
    load();

    // live updates: new posts appear without a refresh
    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const post = payload.new as Post;
          setPosts((prev) =>
            prev.some((p) => p.id === post.id) ? prev : [post, ...prev].slice(0, 50)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function share() {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setError("");

    const { data, error } = await supabase
      .from("posts")
      .insert({ body, author: NAME })
      .select()
      .single();

    if (error) {
      setError("Could not share your post. Please try again.");
    } else {
      // the realtime event may arrive too, so skip duplicates
      setPosts((prev) => (prev.some((p) => p.id === data.id) ? prev : [data, ...prev]));
      setText("");
    }
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-[#3b5998] px-6 py-3 text-xl font-bold text-white">wall</header>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:flex-row">
        <aside className="flex flex-col items-center text-center md:w-56 md:items-start md:text-left">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-[#3b5998] text-4xl font-bold text-white md:h-56 md:w-56 md:text-6xl">
            K
          </div>
          <h1 className="mt-4 text-2xl font-bold">{NAME}</h1>
          <div className="mt-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-left text-sm">
            <p className="font-semibold">Information</p>
            <p className="mt-2 text-slate-500">Networks</p>
            <p>UP Cebu Alum</p>
            <p className="mt-2 text-slate-500">Current City</p>
            <p>Metro Manila, PH</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            maxLength={MAX}
            placeholder="What's on your mind?"
            aria-label="Write a post"
            className="h-28 w-full rounded-lg border border-dashed border-slate-400 bg-white p-3"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm text-slate-500">{MAX - text.length} characters remaining</span>
            <button
              onClick={share}
              disabled={!text.trim() || sending}
              className="rounded bg-[#3b5998] px-5 py-2 font-semibold text-white transition hover:bg-[#2d4373] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sharing..." : "Share"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-300 bg-white">
            {loading && <li className="p-4 text-slate-500">Loading...</li>}
            {!loading && posts.length === 0 && (
              <li className="p-4 text-slate-500">No posts yet. Be the first to share!</li>
            )}
            {posts.map((p) => (
              <li key={p.id} className="p-4">
                <div className="flex justify-between">
                  <span className="font-bold text-[#3b5998]">{p.author}</span>
                  <span className="text-sm text-slate-500">{timeAgo(p.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}