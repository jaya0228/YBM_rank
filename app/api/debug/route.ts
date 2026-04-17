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

  // Yes24: YBM 책에서 출판사 링크(pubNo) 추출
  try {
    const { data } = await axios.get(
      "https://www.yes24.com/Product/Category/BestSeller?CategoryNumber=001001&sumgb=09&PageNumber=1",
      { headers: HEADERS, timeout: 15000 }
    );
    const $ = cheerio.load(data);
    const pubLinks: string[] = [];
    $(".itemUnit").each((_, el) => {
      const pub = $(el).find(".authPub.info_pub").text().trim();
      const isYbm = pub.toLowerCase().includes("ybm") || pub.includes("와이비엠");
      if (!isYbm) return;
      const pubHref = $(el).find(".authPub.info_pub a").attr("href") ?? "";
      const title = $(el).find(".gd_name").text().trim();
      pubLinks.push(`${title} → ${pubHref}`);
    });
    result.yes24_publinks = pubLinks;
  } catch (e) {
    result.yes24_publinks = { error: String(e) };
  }

  // 교보: pid가 있는 책과 없는 책 비율 확인
  try {
    const { data } = await axios.get(
      "https://search.kyobobook.co.kr/search?keyword=YBM&page=1",
      {
        headers: { ...HEADERS, Referer: "https://search.kyobobook.co.kr/" },
        timeout: 15000,
      }
    );
    const $ = cheerio.load(data);
    let withPid = 0, withoutPid = 0;
    const noPidSamples: string[] = [];
    $(".prod_item").each((_, el) => {
      const checkbox = $(el).find("input.result_checkbox");
      const pid = checkbox.attr("data-pid") ?? "";
      const href = $(el).find("a.prod_link").attr("href") ?? "";
      const pidFromUrl = href.match(/\/detail\/(S[^/?]+)/)?.[1] ?? "";
      const finalPid = pid || pidFromUrl;
      const title = checkbox.attr("data-name") ?? "";
      if (finalPid) {
        withPid++;
      } else {
        withoutPid++;
        if (noPidSamples.length < 3) noPidSamples.push(title || href);
      }
    });
    result.kyobo_pid = { withPid, withoutPid, noPidSamples };
  } catch (e) {
    result.kyobo_pid = { error: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
