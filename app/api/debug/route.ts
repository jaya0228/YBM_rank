import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: "https://www.yes24.com/",
};

export async function GET() {
  const result: Record<string, unknown> = {};

  // Yes24 검색 페이지 테스트
  try {
    const { data } = await axios.get(
      `https://www.yes24.com/Product/Search?domain=BOOK&query=%EC%99%80%EC%9D%B4%EB%B9%84%EC%97%A0&keyfield=author&PageNumber=1`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);

    const itemUnitCount = $(".itemUnit").length;
    const firstItemHtml = $(".itemUnit").first().html()?.slice(0, 500) ?? "없음";

    // 다양한 셀렉터 시도
    const selectors: Record<string, number> = {};
    for (const sel of [".itemUnit", ".item_unit", ".goods_info", ".prd_info", "li.item", ".sItem", ".gItem"]) {
      selectors[sel] = $(sel).length;
    }

    result.yes24 = {
      status: "ok",
      itemUnitCount,
      selectors,
      firstItemHtml,
      pageLength: data.length,
    };
  } catch (e) {
    result.yes24 = { status: "error", message: String(e) };
  }

  // 교보 Puppeteer 테스트 (간단히 launch만)
  try {
    const chromium = await import("@sparticuz/chromium");
    const executablePath = await chromium.default.executablePath();
    result.kyobo = { status: "chromium_path_ok", executablePath };
  } catch (e) {
    result.kyobo = { status: "chromium_error", message: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
