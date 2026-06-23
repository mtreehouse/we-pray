import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    kakaoJavascriptKey: process.env["KAKAO_JAVASCRIPT_KEY"] || ""
  });
}
