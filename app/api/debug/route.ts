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

  // 교보: target 파라미터 없이 시도
  try {
    const { data } = await axios.get(
      "https://search.kyobobook.co.kr/search?keyword=YBM",
      { headers: HEADERS, timeout: 10000 }
    );
    const $k = cheerio.load(data);
    const selectors: Record<string, number> = {};
    for (const sel of [
      ".prod_item", ".book_item", "li.item", ".search_item",
      "[class*='prod_item']", "[class*='book']", "ul.list li",
      ".result_item", ".list_item", ".prod_info", ".item_info",
    ]) {
      selectors[sel] = $k(sel).length;
    }
    const bestSel = Object.entries(selectors).sort((a, b) => b[1] - a[1])[0];
    const firstHtml = bestSel[1] > 0 ? $k(bestSel[0]).first().html()?.slice(0, 1000) : "없음";
    result.kyobo = { selectors, bestSel, firstHtml };
  } catch (e) {
    result.kyobo = { status: "error", message: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
