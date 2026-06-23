import { redirect } from "next/navigation";
import { requireUser } from "@/lib/permissions";
import { safeNextPath } from "@/lib/redirect";

export const dynamic = "force-dynamic";

type AuthCompletePageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function AuthCompletePage({ searchParams }: AuthCompletePageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params?.next);
  const user = await requireUser();

  if (!user.nickname) {
    redirect("/nickname?next=" + encodeURIComponent(nextPath));
  }

  redirect(nextPath);
}
