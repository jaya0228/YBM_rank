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

    // /Product/Goods/ 링크가 있는 실제 책 항목 찾기
    let bookItemHtml = "없음";
    let bookCount = 0;
    $(".goods_info").each((_, el) => {
      const href = $(el).find(".goods_name a").attr("href") ?? "";
      if (href.includes("/Product/Goods/")) {
        bookCount++;
        if (bookItemHtml === "없음") {
          bookItemHtml = $.html(el).slice(0, 1500);
        }
      }
    });

    result.yes24 = { bookCount, bookItemHtml };
  } catch (e) {
    result.yes24 = { status: "error", message: String(e) };
  }

  // 교보: 다양한 URL 시도
  const kyoboUrls = [
    "https://store.kyobobook.co.kr/search?keyword=YBM",
    "https://search.kyobobook.co.kr/search?keyword=YBM",
    "https://store.kyobobook.co.kr/api/gw/shop/search/v1/search?keyword=YBM&gbCode=TOT&pageIndex=1&pageSize=20",
  ];
  const kyoboResults: Record<string, unknown>[] = [];
  for (const url of kyoboUrls) {
    try {
      const { data, status } = await axios.get(url, { headers: HEADERS, timeout: 8000 });
      const isJson = typeof data === "object";
      const preview = isJson ? JSON.stringify(data).slice(0, 300) : String(data).slice(0, 300);
      kyoboResults.push({ url, status, isJson, preview });
    } catch (e: unknown) {
      const err = e as { response?: { status: number }; message: string };
      kyoboResults.push({ url, error: err?.response?.status ?? err.message });
    }
  }
  result.kyobo = kyoboResults;

  return NextResponse.json(result, { status: 200 });
}
