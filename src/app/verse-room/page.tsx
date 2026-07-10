import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { VerseRoom } from "@/components/VerseRoom";
import { getCurrentUser } from "@/lib/permissions";
import { getBibleTranslationOptions, getUserVerseMemoryTranslation, getVerseMemoryBooks, getVerseMemoryCardsPage, translationLabel } from "@/lib/verse-room-data";

export const dynamic = "force-dynamic";

export default async function VerseRoomPage() {
  const user = await getCurrentUser();
  const translations = await getBibleTranslationOptions();
  const books = await getVerseMemoryBooks();
  const canSave = Boolean(user?.nickname);
  const selectedTranslation = await getUserVerseMemoryTranslation(user?.id ?? null, translations, Boolean(user?.bibleCopyrightAllowed));
  const initialPage = canSave && user
    ? await getVerseMemoryCardsPage({
      userId: user.id,
      translationCode: selectedTranslation,
      translationName: translationLabel(translations, selectedTranslation),
      cursor: null
    })
    : { cards: [], nextCursor: null };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6 dark:text-slate-100">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <VerseRoom
        isLoggedIn={canSave}
        needsNickname={Boolean(user && !user.nickname)}
        bibleCopyrightAllowed={Boolean(user?.bibleCopyrightAllowed)}
        books={books}
        translations={translations}
        initialTranslation={selectedTranslation}
        initialCards={initialPage.cards}
        initialNextCursor={initialPage.nextCursor}
      />
    </main>
  );
}
