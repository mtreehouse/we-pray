"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, Clipboard, Crown, Edit3, History, Settings, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

type RoomMember = {
  id: string;
  userId: string;
  nickname: string | null;
  role: "creator" | "member";
  joinedAt: string;
  postCount: number;
};

type PrayerPost = {
  id: string;
  userId: string;
  authorNickname: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  answeredAt: string | null;
  prayerCount: number;
  isPrayedByMe: boolean;
};

type RoomDetail = {
  id: string;
  title: string;
  description: string;
  creatorNickname: string | null;
  createdAt: string;
  isCreator: boolean;
};

type Props = {
  room: RoomDetail;
  currentUserId: string;
  members: RoomMember[];
  posts: PrayerPost[];
  nextCursor: string | null;
};

const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKoreaDateParts(value: string) {
  const date = new Date(new Date(value).getTime() + KOREA_TIME_OFFSET_MS);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes()
  };
}

function formatKoreanDate(value: string, style: "medium" | "long" = "medium") {
  const { year, month, day } = getKoreaDateParts(value);

  if (style === "long") {
    return `${year}년 ${month}월 ${day}일`;
  }

  return `${year}. ${month}. ${day}.`;
}

function formatKoreanTime(value: string) {
  const { hour, minute } = getKoreaDateParts(value);
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 || 12;

  return `${period} ${hour12}:${String(minute).padStart(2, "0")}`;
}

function formatKoreanDateTime(value: string) {
  return `${formatKoreanDate(value)} ${formatKoreanTime(value)}`;
}

function formatKoreanIsoDate(value: string) {
  const { year, month, day } = getKoreaDateParts(value);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function PrayerRoomDetail({ room, currentUserId, members, posts, nextCursor: initialNextCursor }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [historyMember, setHistoryMember] = useState<RoomMember | null>(null);
  const [selectedPost, setSelectedPost] = useState<PrayerPost | null>(null);
  const [editingPost, setEditingPost] = useState<PrayerPost | null>(null);
  const [loadedPosts, setLoadedPosts] = useState(posts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [postsLoading, setPostsLoading] = useState(false);
  const [historyPosts, setHistoryPosts] = useState<PrayerPost[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingPrayerIds, setPendingPrayerIds] = useState<string[]>([]);
  const [pendingAnswerIds, setPendingAnswerIds] = useState<string[]>([]);
  const [prayerEffectVisible, setPrayerEffectVisible] = useState(false);
  const [prayerEffectKey, setPrayerEffectKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prayerEffectTimeoutRef = useRef<number | null>(null);

  const showPrayerEffect = useCallback(() => {
    setPrayerEffectKey((key) => key + 1);
    setPrayerEffectVisible(true);

    if (prayerEffectTimeoutRef.current) {
      window.clearTimeout(prayerEffectTimeoutRef.current);
    }

    prayerEffectTimeoutRef.current = window.setTimeout(() => {
      setPrayerEffectVisible(false);
      prayerEffectTimeoutRef.current = null;
    }, 1450);
  }, []);

  function updatePostPrayerState(postId: string, prayed: boolean, prayerCount: number) {
    const update = (post: PrayerPost) => post.id === postId ? { ...post, isPrayedByMe: prayed, prayerCount } : post;

    setLoadedPosts((items) => items.map(update));
    setHistoryPosts((items) => items.map(update));
    setSelectedPost((post) => post ? update(post) : post);
  }

  function updatePostAnsweredState(postId: string, answeredAt: string | null) {
    const update = (post: PrayerPost) => post.id === postId ? { ...post, answeredAt } : post;

    setLoadedPosts((items) => items.map(update));
    setHistoryPosts((items) => items.map(update));
    setSelectedPost((post) => post ? update(post) : post);
    setEditingPost((post) => post ? update(post) : post);
  }


  async function togglePostPrayer(post: PrayerPost) {
    if (pendingPrayerIds.includes(post.id)) return;

    setPendingPrayerIds((ids) => [...ids, post.id]);

    try {
      const res = await fetch(`/api/rooms/${room.id}/posts/${post.id}/prayers`, { method: "POST" });
      const data = (await res.json()) as { prayed?: boolean; prayerCount?: number; error?: string };

      if (!res.ok || typeof data.prayed !== "boolean" || typeof data.prayerCount !== "number") {
        setToast(data.error ?? "함께 기도하기에 실패했습니다.");
        return;
      }

      updatePostPrayerState(post.id, data.prayed, data.prayerCount);
      if (data.prayed) showPrayerEffect();
    } catch {
      setToast("함께 기도하기에 실패했습니다.");
    } finally {
      setPendingPrayerIds((ids) => ids.filter((id) => id !== post.id));
    }
  }

  async function togglePostAnswered(post: PrayerPost) {
    if (post.userId !== currentUserId || pendingAnswerIds.includes(post.id)) return;

    setPendingAnswerIds((ids) => [...ids, post.id]);

    try {
      const res = await fetch(`/api/rooms/${room.id}/posts/${post.id}/answer`, { method: "POST" });
      const data = (await res.json()) as { answeredAt?: string | null; error?: string };

      if (!res.ok || !("answeredAt" in data)) {
        setToast(data.error ?? "응답 표시 저장에 실패했습니다.");
        return;
      }

      updatePostAnsweredState(post.id, data.answeredAt ?? null);
      setToast(data.answeredAt ? "기도 응답으로 표시했습니다." : "응답 표시를 해제했습니다.");
    } catch {
      setToast("응답 표시 저장에 실패했습니다.");
    } finally {
      setPendingAnswerIds((ids) => ids.filter((id) => id !== post.id));
    }
  }

  const groupedPosts = useMemo(() => {
    return loadedPosts.reduce<Record<string, PrayerPost[]>>((acc, post) => {
      const key = formatKoreanDate(post.createdAt);
      acc[key] = acc[key] ?? [];
      acc[key].push(post);
      return acc;
    }, {});
  }, [loadedPosts]);

  const loadPosts = useCallback(async (reset = false) => {
    if (postsLoading) return;

    setPostsLoading(true);
    const cursor = reset ? "" : nextCursor ?? "";
    const res = await fetch(`/api/rooms/${room.id}/posts?take=50${cursor ? `&cursor=${cursor}` : ""}`);
    const data = (await res.json()) as { posts?: PrayerPost[]; nextCursor?: string | null; error?: string };
    setPostsLoading(false);

    if (!res.ok) {
      setToast(data.error ?? "기도제목을 불러오지 못했습니다.");
      return;
    }

    setLoadedPosts((items) => (reset ? data.posts ?? [] : [...items, ...(data.posts ?? [])]));
    setNextCursor(data.nextCursor ?? null);
  }, [nextCursor, postsLoading, room.id]);

  useEffect(() => {
    setLoadedPosts(posts);
    setNextCursor(initialNextCursor);
    setSelectedPost(null);
  }, [initialNextCursor, posts]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && !postsLoading) {
        void loadPosts(false);
      }
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadPosts, nextCursor, postsLoading]);

  useEffect(() => {
    return () => {
      if (prayerEffectTimeoutRef.current) {
        window.clearTimeout(prayerEffectTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    if (!settingsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen]);


  async function copySelectedPost() {
    if (!selectedPost) return;

    const author = selectedPost.authorNickname ?? "알 수 없음";
    const date = formatKoreanIsoDate(selectedPost.createdAt);
    await navigator.clipboard.writeText(`[${author}] [${date}] ${selectedPost.content}`);
    setToast("기도제목을 복사했습니다.");
    window.setTimeout(() => setToast(""), 2400);
    setSelectedPost(null);
  }

  function editSelectedPost() {
    if (!selectedPost || selectedPost.userId !== currentUserId) return;

    setEditingPost(selectedPost);
    setSelectedPost(null);
  }

  async function openMemberHistory(member: RoomMember) {
    setHistoryMember(member);
    setHistoryPosts([]);
    setHistoryLoading(true);

    const res = await fetch(`/api/rooms/${room.id}/members/${member.id}`);
    const data = (await res.json()) as { posts?: PrayerPost[]; error?: string };
    setHistoryLoading(false);

    if (!res.ok) {
      setToast(data.error ?? "작성 내역을 불러오지 못했습니다.");
      return;
    }

    setHistoryPosts(data.posts ?? []);
  }

  async function leaveRoom() {
    if (!confirm("방에서 나가시겠습니까?")) return;

    const res = await fetch(`/api/rooms/${room.id}/leave`, { method: "POST" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setToast(data.error ?? "방 나가기에 실패했습니다.");
      return;
    }

    router.push("/pray-room");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-white/55 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Toast message={toast} onClose={() => setToast("")} />
      {prayerEffectVisible ? <PrayerCelebration key={prayerEffectKey} /> : null}
      <header className="sticky top-0 z-20 grid h-14 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 border-b border-white/70 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <Link
          href="/pray-room"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          aria-label="방 목록으로"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="min-w-0 truncate text-center text-lg font-black text-slate-950 dark:text-slate-50">{room.title}</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          aria-label="방 설정"
        >
          <Settings size={19} />
        </button>
      </header>

      <section className="flex-1 px-4 pb-28 pt-4">
        {Object.entries(groupedPosts).length ? (
          Object.entries(groupedPosts).map(([date, datePosts]) => (
            <div key={date} className="mb-6">
              <div className="mb-3 flex justify-center">
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{date}</span>
              </div>
              <div className="grid gap-3">
                {datePosts.map((post) => (
                  <PrayerPostCard
                    key={post.id}
                    post={post}
                    selected={selectedPost?.id === post.id}
                    isMine={post.userId === currentUserId}
                    prayerPending={pendingPrayerIds.includes(post.id)}
                    onSelect={() => setSelectedPost((current) => (current?.id === post.id ? null : post))}
                    onTogglePrayer={() => togglePostPrayer(post)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            아직 작성된 기도제목이 없습니다.
          </div>
        )}
        <div ref={sentinelRef} className="h-8" />
        {postsLoading ? <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500">기도제목을 불러오는 중입니다.</p> : null}
        {!nextCursor && loadedPosts.length ? <p className="text-center text-xs font-bold text-slate-300 dark:text-slate-600">마지막 기도제목입니다.</p> : null}
      </section>

      {!selectedPost ? (
        <div className="fixed inset-x-0 bottom-0 z-20 safe-bottom">
          <div className="mx-auto flex w-full max-w-xl justify-end px-4 pb-4">
            <button
              type="button"
              onClick={() => setWriteOpen(true)}
              className="grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-2xl text-white shadow-soft"
              aria-label="기도제목 작성"
            >
              ✏️
            </button>
          </div>
        </div>
      ) : null}

      <PrayerPostModal
        roomId={room.id}
        open={writeOpen}
        onClose={() => setWriteOpen(false)}
        onToast={setToast}
      />
      <PrayerPostModal
        roomId={room.id}
        post={editingPost ?? undefined}
        open={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        onToast={setToast}
      />
      {selectedPost ? (
        <div
          className="fixed left-1/2 z-30 w-[16.5rem] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.20)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="mb-1 truncate text-center text-[11px] font-black text-slate-500 dark:text-slate-400">
            {selectedPost.authorNickname ?? "알 수 없음"}
          </p>
          <div className={`grid gap-1 ${selectedPost.userId === currentUserId ? "grid-cols-3" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={copySelectedPost}
              className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            >
              <Clipboard size={14} />
              복사
            </button>
            {selectedPost.userId === currentUserId ? (
              <button
                type="button"
                onClick={editSelectedPost}
                className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-teal-700 px-2.5 text-xs font-black text-white"
              >
                <Edit3 size={14} />
                수정
              </button>
            ) : null}
            {selectedPost.userId === currentUserId ? (
              <button
                type="button"
                onClick={() => void togglePostAnswered(selectedPost)}
                disabled={pendingAnswerIds.includes(selectedPost.id)}
                className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-black transition disabled:opacity-60 ${
                  selectedPost.answeredAt
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/55 dark:text-amber-100"
                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/45 dark:text-indigo-200"
                }`}
              >
                <CheckCircle2 size={14} />
                {selectedPost.answeredAt ? "응답됨" : "응답"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <RoomSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        room={room}
        currentUserId={currentUserId}
        members={members}
        onInfo={() => setInfoOpen(true)}
        onManage={() => setManageOpen(true)}
        onLeave={leaveRoom}
        onHistory={openMemberHistory}
        onToast={setToast}
      />
      <RoomInfoModal room={room} open={infoOpen} onClose={() => setInfoOpen(false)} />
      <RoomManageModal
        room={room}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onToast={setToast}
      />
      <MemberHistoryModal
        member={historyMember}
        posts={historyPosts}
        loading={historyLoading}
        onClose={() => setHistoryMember(null)}
      />
    </main>
  );
}

function PrayerPostCard({
  post,
  selected,
  isMine,
  prayerPending,
  onSelect,
  onTogglePrayer
}: {
  post: PrayerPost;
  selected: boolean;
  isMine: boolean;
  prayerPending: boolean;
  onSelect: () => void;
  onTogglePrayer: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative w-full cursor-pointer overflow-hidden rounded-lg bg-white p-4 text-left shadow-soft transition dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${
        post.answeredAt ? "ring-1 ring-amber-200/80 dark:ring-amber-800/60" : ""
      } ${selected ? "ring-2 ring-teal-500 dark:ring-teal-400" : ""}`}
    >
      {post.answeredAt ? (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-[-13deg] rounded-lg border-2 border-amber-500/15 px-3 py-1.5 text-xl font-black tracking-[0.18em] text-amber-600/12 dark:border-amber-300/12 dark:text-amber-200/10" aria-hidden="true">
          ANSWERED
        </div>
      ) : null}
      <div className="relative block w-full text-left">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className={`font-bold ${selected || isMine ? "text-teal-700 dark:text-teal-300" : "text-slate-900 dark:text-slate-100"}`}>
            {post.authorNickname ?? "알 수 없음"}
          </p>
          <time className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {formatKoreanTime(post.createdAt)}
          </time>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{post.content}</p>
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-3">
        {post.answeredAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/45 dark:text-amber-100 dark:ring-amber-900/70">
            <CheckCircle2 size={13} />
            응답됨
          </span>
        ) : <span aria-hidden="true" />}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTogglePrayer();
          }}
          disabled={prayerPending}
          aria-label={post.isPrayedByMe ? "함께 기도 취소" : "함께 기도"}
          aria-pressed={post.isPrayedByMe}
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-black transition disabled:opacity-60 ${
            post.isPrayedByMe
              ? "border-teal-200 bg-teal-50 text-teal-700 shadow-[0_6px_16px_rgba(13,148,136,0.18)] dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-900 dark:hover:bg-teal-950/50 dark:hover:text-teal-200"
          }`}
        >
          <span className="text-sm leading-none" aria-hidden="true">🙏</span>
          <span>{post.prayerCount}</span>
        </button>
      </div>
    </article>
  );
}

function PrayerCelebration() {
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4">
        <div className="prayer-celebration relative inline-flex items-center gap-2 overflow-visible rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(13,148,136,0.35)]">
          <span className="text-lg leading-none" aria-hidden="true">🙏</span>
          <span>함께 기도해요!</span>
          <span className="prayer-sparkle prayer-sparkle-a" aria-hidden="true">✦</span>
          <span className="prayer-sparkle prayer-sparkle-b" aria-hidden="true">✧</span>
          <span className="prayer-sparkle prayer-sparkle-c" aria-hidden="true">✦</span>
        </div>
      </div>
      <style>{`
        @keyframes prayerCelebrationRise {
          0% { opacity: 0; transform: translateY(34px) scale(0.9); }
          16% { opacity: 1; transform: translateY(0) scale(1.04); }
          58% { opacity: 1; transform: translateY(-42px) scale(1); }
          100% { opacity: 0; transform: translateY(-92px) scale(0.96); }
        }

        @keyframes prayerSparkleFloat {
          0% { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.6) rotate(0deg); }
          24% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(var(--sparkle-x), -38px, 0) scale(1.18) rotate(26deg); }
        }

        .prayer-celebration {
          animation: prayerCelebrationRise 1450ms cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        .prayer-sparkle {
          position: absolute;
          font-size: 1rem;
          color: #fef3c7;
          text-shadow: 0 0 14px rgba(254, 243, 199, 0.95);
          animation: prayerSparkleFloat 950ms ease-out forwards;
        }

        .prayer-sparkle-a {
          --sparkle-x: -34px;
          left: 12px;
          top: -10px;
        }

        .prayer-sparkle-b {
          --sparkle-x: 28px;
          right: 18px;
          top: -12px;
          animation-delay: 110ms;
        }

        .prayer-sparkle-c {
          --sparkle-x: 18px;
          right: 36px;
          bottom: -4px;
          animation-delay: 210ms;
        }
      `}</style>
    </>
  );
}

function PrayerPostModal({
  roomId,
  post,
  open,
  onClose,
  onToast
}: {
  roomId: string;
  post?: PrayerPost;
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const [content, setContent] = useState(post?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!open) return;
    setContent(post?.content ?? "");
  }, [open, post?.id, post?.content]);

  async function submit() {
    const nextContent = content.trim();

    if (!nextContent) {
      onToast("기도제목 내용을 입력해주세요.");
      return;
    }

    if (post && nextContent === post.content.trim()) {
      onToast("변경된 내용이 없습니다.");
      return;
    }

    setLoading(true);
    const endpoint = post ? `/api/rooms/${roomId}/posts/${post.id}` : `/api/rooms/${roomId}/posts`;
    const res = await fetch(endpoint, {
      method: post ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: nextContent })
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      onToast(data.error ?? "저장에 실패했습니다.");
      return;
    }

    if (!post) setContent("");
    onClose();
    router.refresh();
  }

  async function deletePost() {
    if (!post) return;
    if (!confirm("기도제목을 삭제하시겠습니까?")) return;

    setDeleting(true);
    const res = await fetch(`/api/rooms/${roomId}/posts/${post.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    setDeleting(false);

    if (!res.ok) {
      onToast(data.error ?? "삭제에 실패했습니다.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal title={post ? "기도제목 수정" : "기도제목 작성"} open={open} onClose={onClose}>
      <div className="grid gap-3">
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            onToast("");
          }}
          className="min-h-40 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="함께 기도할 내용을 적어주세요."
          maxLength={1000}
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || deleting}
          className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          저장
        </button>
        {post ? (
          <button
            type="button"
            onClick={deletePost}
            disabled={loading || deleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-3 font-bold text-rose-700 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300"
          >
            <Trash2 size={17} />
            삭제
          </button>
        ) : null}
      </div>
    </Modal>
  );
}

function RoomSettingsDrawer({
  open,
  onClose,
  room,
  currentUserId,
  members,
  onInfo,
  onManage,
  onLeave,
  onHistory,
  onToast
}: {
  open: boolean;
  onClose: () => void;
  room: RoomDetail;
  currentUserId: string;
  members: RoomMember[];
  onInfo: () => void;
  onManage: () => void;
  onLeave: () => void;
  onHistory: (member: RoomMember) => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();

  async function kick(member: RoomMember) {
    if (!confirm(`${member.nickname ?? "멤버"}님을 내보내시겠습니까?`)) return;

    const res = await fetch(`/api/rooms/${room.id}/members/${member.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      onToast(data.error ?? "멤버 내보내기에 실패했습니다.");
      return;
    }

    router.refresh();
  }

  return (
    <div className={`fixed inset-0 z-30 ${open ? "" : "pointer-events-none"}`}>
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 z-0 bg-slate-950/30 transition-opacity dark:bg-slate-950/70 ${open ? "opacity-100" : "opacity-0"}`}
        aria-label="설정 닫기"
      />
      <aside
        className={`absolute right-0 top-0 z-10 h-full w-[86%] max-w-sm overflow-y-auto overscroll-contain bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft transition-transform dark:bg-slate-950 dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">방 설정</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 grid gap-2">
          <button type="button" onClick={onInfo} className="rounded-lg bg-slate-100 px-4 py-3 text-left font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            방 정보
          </button>
          {room.isCreator ? (
            <button type="button" onClick={onManage} className="rounded-lg bg-slate-100 px-4 py-3 text-left font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
              방 관리
            </button>
          ) : null}
          {!room.isCreator ? (
            <button type="button" onClick={onLeave} className="touch-manipulation rounded-lg bg-rose-50 px-4 py-3 text-left font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              방 나가기
            </button>
          ) : null}
        </div>

        <h3 className="mb-3 text-sm font-black text-slate-500 dark:text-slate-400">멤버 {members.length}</h3>
        <div className="grid gap-2">
          {members.map((member) => {
            const isMe = member.userId === currentUserId;

            return (
              <div key={member.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <span className="truncate">{member.nickname ?? "닉네임 없음"}</span>
                    {member.role === "creator" ? <Crown className="shrink-0 text-amber-500" size={16} /> : null}
                    {isMe ? (
                      <span className="shrink-0 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-700 ring-1 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-900">
                        ME
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">작성 {member.postCount}개</p>
                </div>
                <button
                  type="button"
                  onClick={() => onHistory(member)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="기도제목 history"
                >
                  <History size={17} />
                </button>
                {room.isCreator && member.role !== "creator" ? (
                  <button
                    type="button"
                    onClick={() => kick(member)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    aria-label="멤버 내보내기"
                  >
                    <Trash2 size={17} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function RoomInfoModal({ room, open, onClose }: { room: RoomDetail; open: boolean; onClose: () => void }) {
  return (
    <Modal title="방 정보" open={open} onClose={onClose}>
      <dl className="grid gap-3 text-sm">
        <InfoRow label="방 제목" value={room.title} />
        <InfoRow label="방 설명" value={room.description} />
        <InfoRow label="방장" value={room.creatorNickname ?? "알 수 없음"} />
        <InfoRow label="생성일자" value={formatKoreanDate(room.createdAt, "long")} />
      </dl>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 font-bold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function RoomManageModal({
  room,
  open,
  onClose,
  onToast
}: {
  room: RoomDetail;
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(room.title);
  const [description, setDescription] = useState(room.description);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, password })
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      onToast(data.error ?? "방 관리 저장에 실패했습니다.");
      return;
    }

    onClose();
    router.refresh();
  }

  async function deleteRoom() {
    if (!confirm("방을 삭제하시겠습니까? 모든 멤버의 목록에서 제거됩니다.")) return;

    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      onToast(data.error ?? "방 삭제에 실패했습니다.");
      return;
    }

    router.push("/pray-room");
    router.refresh();
  }

  return (
    <Modal title="방 관리" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="방 제목"
          maxLength={40}
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="방 설명"
          maxLength={300}
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="새 비밀번호, 변경하지 않으면 비워두세요"
          type="password"
        />
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          저장
        </button>
        <button
          type="button"
          onClick={deleteRoom}
          className="rounded-lg border border-rose-200 px-4 py-3 font-bold text-rose-700 dark:border-rose-900 dark:text-rose-300"
        >
          방 삭제
        </button>
      </div>
    </Modal>
  );
}

function MemberHistoryModal({
  member,
  posts,
  loading,
  onClose
}: {
  member: RoomMember | null;
  posts: PrayerPost[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={`${member?.nickname ?? "멤버"} history`} open={Boolean(member)} onClose={onClose}>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">작성 내역을 불러오는 중입니다.</p>
        ) : posts.length ? (
          <div className="grid gap-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                <time className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {formatKoreanDateTime(post.createdAt)}
                </time>
                {post.answeredAt ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-950/45 dark:text-amber-100">
                    <CheckCircle2 size={13} />
                    응답됨
                  </span>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{post.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">작성 내역이 없습니다.</p>
        )}
      </div>
    </Modal>
  );
}
