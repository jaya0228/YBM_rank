import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
  "Referer": "https://www.yes24.com/",
};

export async function GET() {
  const result: Record<string, unknown> = {};

  // Yes24: arraybuffer + EUC-KR 디코딩
  try {
    const { data: buf } = await axios.get(
      `https://www.yes24.com/Product/Search?domain=BOOK&query=%EC%99%80%EC%9D%B4%EB%B9%84%EC%97%A0&keyfield=author&PageNumber=1`,
      { headers: HEADERS, timeout: 15000, responseType: "arraybuffer" }
    );
    const html = new TextDecoder("euc-kr").decode(buf as ArrayBuffer);
    const $ = cheerio.load(html);

    const authSamples: string[] = [];
    let ybmCount = 0;
    $(".goods_info").each((_, el) => {
      const href = $(el).find(".goods_name a").attr("href") ?? "";
      if (!href.includes("/Product/Goods/")) return;
      const auth = $(el).find(".goods_auth").text().trim();
      if (authSamples.length < 5) authSamples.push(auth);
      const lower = auth.toLowerCase().replace(/\s+/g, "");
      if (lower.includes("ybm") || lower.includes("와이비엠")) ybmCount++;
    });
    result.yes24 = { ybmCount, authSamples };
  } catch (e) {
    result.yes24 = { status: "error", message: String(e) };
  }

  // 교보: 이미지 URL 두 가지 형식 테스트
  try {
    const { data } = await axios.get(
      "https://search.kyobobook.co.kr/search?keyword=YBM",
      { headers: { ...HEADERS, Referer: "https://search.kyobobook.co.kr/" }, timeout: 15000 }
    );
    const $k = cheerio.load(data);
    const first = $k(".prod_item").first();
    const pid = first.find("input.result_checkbox").attr("data-pid") ?? "";
    const bid = first.find("input.result_checkbox").attr("data-bid") ?? "";

    const url1 = `https://contents.kyobobook.co.kr/sih/fit-in/200x0/product/${pid}.jpg`;
    const url2 = bid ? `https://image.kyobobook.co.kr/images/book/large/${bid.slice(-3)}/b${bid}.jpg` : "bid없음";

    const checkUrl = async (u: string) => {
      try { const r = await axios.head(u, { timeout: 5000 }); return r.status; }
      catch { return "실패"; }
    };

    result.kyobo = {
      pid, bid,
      url1, url1Status: await checkUrl(url1),
      url2, url2Status: await checkUrl(url2),
    };
  } catch (e) {
    result.kyobo = { status: "error", message: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
