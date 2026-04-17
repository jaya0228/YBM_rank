import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

async function fetchEucKr(url: string) {
  const { data } = await axios.get(url, {
    headers: { ...HEADERS, Referer: "https://www.yes24.com/" },
    timeout: 15000,
    responseType: "arraybuffer",
  });
  return new TextDecoder("euc-kr").decode(data as ArrayBuffer);
}

export async function GET() {
  const result: Record<string, unknown> = {};

  // Yes24: 출판사(pub) 검색 시도
  try {
    const html = await fetchEucKr(
      `https://www.yes24.com/Product/Search?domain=BOOK&query=%BF%CD%C0%CC%BA%F1%BF%A4&keyfield=pub&PageNumber=1`
    );
    const $ = cheerio.load(html);
    const authSamples: string[] = [];
    let ybmCount = 0;
    $(".goods_info").each((_, el) => {
      const href = $(el).find(".goods_name a").attr("href") ?? "";
      if (!href.includes("/Product/Goods/")) return;
      const auth = $(el).find(".goods_auth").text().trim();
      const pub = $(el).find(".goods_pub").text().trim();
      if (authSamples.length < 5) authSamples.push(`저자:${auth} | 출판:${pub}`);
      const lower = (auth + pub).toLowerCase().replace(/\s+/g, "");
      if (lower.includes("ybm") || lower.includes("와이비엠")) ybmCount++;
    });
    result.yes24_pub = { ybmCount, authSamples };
  } catch (e) {
    result.yes24_pub = { error: String(e) };
  }

  // Yes24: 일반 키워드 검색 (YBM)
  try {
    const html = await fetchEucKr(
      `https://www.yes24.com/Product/Search?domain=BOOK&query=YBM&PageNumber=1`
    );
    const $ = cheerio.load(html);
    const samples: string[] = [];
    let ybmCount = 0;
    $(".goods_info").each((_, el) => {
      const href = $(el).find(".goods_name a").attr("href") ?? "";
      if (!href.includes("/Product/Goods/")) return;
      const auth = $(el).find(".goods_auth").text().trim();
      const pub = $(el).find(".goods_pub").text().trim();
      if (samples.length < 5) samples.push(`저자:${auth} | 출판:${pub}`);
      const lower = (auth + pub).toLowerCase().replace(/\s+/g, "");
      if (lower.includes("ybm") || lower.includes("와이비엠")) ybmCount++;
    });
    result.yes24_keyword = { ybmCount, samples };
  } catch (e) {
    result.yes24_keyword = { error: String(e) };
  }

  // 교보 이미지: CDN 직접 fetch로 Content-Type 확인
  try {
    const url = "https://contents.kyobobook.co.kr/sih/fit-in/200x0/product/S000218791163.jpg";
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 5000 });
    const contentType = r.headers["content-type"] ?? "없음";
    const size = (r.data as ArrayBuffer).byteLength;
    result.kyobo_img = { contentType, size, url };
  } catch (e) {
    result.kyobo_img = { error: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
