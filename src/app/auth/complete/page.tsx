import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/permissions";
import { LOGIN_NEXT_COOKIE_NAME, safeNextPath } from "@/lib/redirect";

export const dynamic = "force-dynamic";

type AuthCompletePageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function AuthCompletePage({ searchParams }: AuthCompletePageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const cookieNextPath = safeNextPath(decodeCookieValue(cookieStore.get(LOGIN_NEXT_COOKIE_NAME)?.value));
  const nextPath = safeNextPath(params?.next, cookieNextPath);
  const user = await requireUser();

  if (!user.nickname) {
    redirect("/nickname?next=" + encodeURIComponent(nextPath));
  }

  redirect(nextPath);
}

function decodeCookieValue(value: string | undefined) {
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
