import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

export async function GET() {
  const result: Record<string, unknown> = {};

  // Yes24: 실제 책 항목 구조 파악
  try {
    const { data } = await axios.get(
      `https://www.yes24.com/Product/Search?domain=BOOK&query=%EC%99%80%EC%9D%B4%EB%B9%84%EC%97%A0&keyfield=author&PageNumber=1`,
      { headers: { ...HEADERS, Referer: "https://www.yes24.com/" }, timeout: 10000 }
    );
    const $ = cheerio.load(data);

    // .goods_auth 텍스트 샘플 수집
    const authSamples: string[] = [];
    let ybmCount = 0;
    $(".goods_info").each((_, el) => {
      const href = $(el).find(".goods_name a").attr("href") ?? "";
      if (!href.includes("/Product/Goods/")) return;
      const auth = $(el).find(".goods_auth").text().trim();
      if (authSamples.length < 10) authSamples.push(auth);
      const lower = auth.toLowerCase().replace(/\s+/g, "");
      if (lower.includes("ybm") || lower.includes("와이비엠")) ybmCount++;
    });

    result.yes24 = { ybmCount, authSamples };
  } catch (e) {
    result.yes24 = { status: "error", message: String(e) };
  }

  // 교보: 첫 번째 .prod_item 전체 HTML + 이미지 URL 확인
  try {
    const { data } = await axios.get(
      "https://search.kyobobook.co.kr/search?keyword=YBM",
      { headers: HEADERS, timeout: 15000 }
    );
    const $k = cheerio.load(data);
    const first = $k(".prod_item").first();
    const pid = first.find("input.result_checkbox").attr("data-pid") ?? "";
    const constructedImgUrl = pid
      ? `https://contents.kyobobook.co.kr/sih/fit-in/200x0/product/${pid}.jpg`
      : "pid없음";
    // 이미지 URL 실제 접근 가능 여부 확인
    let imgStatus = "미확인";
    if (pid) {
      try {
        const r = await axios.head(constructedImgUrl, { timeout: 5000 });
        imgStatus = String(r.status);
      } catch { imgStatus = "접근실패"; }
    }
    result.kyobo = { pid, constructedImgUrl, imgStatus };
  } catch (e) {
    result.kyobo = { status: "error", message: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
