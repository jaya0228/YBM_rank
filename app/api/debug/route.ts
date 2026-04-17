import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

export async function GET() {
  // 교보 상품 상세 페이지에서 실제 이미지 URL 찾기
  try {
    const { data } = await axios.get(
      "https://product.kyobobook.co.kr/detail/S000218791163",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
        timeout: 15000,
      }
    );
    const $ = cheerio.load(data);

    // 모든 img src 수집
    const imgs: string[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") ?? $(el).attr("data-src") ?? "";
      if (src && src.length > 10) imgs.push(src);
    });

    // __NEXT_DATA__ 에 이미지 URL 있는지 확인
    const nextData = $("script#__NEXT_DATA__").html()?.slice(0, 2000) ?? "없음";

    return NextResponse.json({ imgs: imgs.slice(0, 20), nextData });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
