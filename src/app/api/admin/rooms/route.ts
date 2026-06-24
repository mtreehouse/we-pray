import { NextResponse } from "next/server";
import { listAdminRooms, normalizeAdminRoomFilter } from "@/lib/admin-rooms";
import { requireAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const filter = normalizeAdminRoomFilter(url.searchParams.get("type"));
  const query = (url.searchParams.get("q") ?? "").trim();
  const cursor = url.searchParams.get("cursor");

  const result = await listAdminRooms({ filter, query, cursor });
  return NextResponse.json(result);
}
