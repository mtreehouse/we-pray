import { notFound, redirect } from "next/navigation";
import { VerseMemoryDetail } from "@/components/VerseMemoryDetail";
import { getCurrentUser } from "@/lib/permissions";
import { getBibleTranslationOptions, getUserVerseMemoryTranslation, getVerseMemoryCard, translationLabel } from "@/lib/verse-room-data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ cardId: string }>;
};

export default async function VerseMemoryDetailPage({ params }: Props) {
  const { cardId } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/login?next=" + encodeURIComponent("/verse-room/" + cardId));
  if (!user.nickname) redirect("/nickname?next=" + encodeURIComponent("/verse-room/" + cardId));

  const translations = await getBibleTranslationOptions();
  const selectedTranslation = await getUserVerseMemoryTranslation(user.id, translations, Boolean(user.bibleCopyrightAllowed));
  const card = await getVerseMemoryCard({
    cardId,
    userId: user.id,
    translationCode: selectedTranslation,
    translationName: translationLabel(translations, selectedTranslation)
  });

  if (!card) notFound();
  return <VerseMemoryDetail card={card} />;
}
