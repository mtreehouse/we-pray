import { redirect } from "next/navigation";
import { requireUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AuthCompletePage() {
  const user = await requireUser();

  if (!user.nickname) {
    redirect("/nickname");
  }

  redirect("/");
}
