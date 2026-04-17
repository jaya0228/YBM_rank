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

  try {
    const resp = await axios.get(
      "https://www.yes24.com/Product/Category/BestSeller?CategoryNumber=001001&sumgb=09&PageNumber=1",
      { headers: HEADERS, timeout: 15000, responseType: "arraybuffer" }
    );

    const contentType = resp.headers["content-type"] ?? "";
    const buf = resp.data as ArrayBuffer;

    // 1) UTF-8로 디코딩
    const utf8 = new TextDecoder("utf-8").decode(buf);
    // 2) EUC-KR로 디코딩
    const eucKr = new TextDecoder("euc-kr").decode(buf);

    // charset 메타태그 확인
    const metaCharset = utf8.match(/charset=['"](.*?)['"]/i)?.[1] ?? "없음";

    // EUC-KR 디코딩 후 첫 번째 itemUnit 텍스트
    const eucKrFixed = eucKr.replace(/charset=["']?euc-kr["']?/gi, 'charset="utf-8"');
    const $e = cheerio.load(eucKrFixed);
    const firstPub_euckr = $e(".itemUnit").first().find(".authPub.info_pub").text().trim();
    const firstTitle_euckr = $e(".itemUnit").first().find(".gd_name").text().trim();

    // UTF-8 디코딩 후 첫 번째 itemUnit 텍스트
    const $u = cheerio.load(utf8);
    const firstPub_utf8 = $u(".itemUnit").first().find(".authPub.info_pub").text().trim();
    const firstTitle_utf8 = $u(".itemUnit").first().find(".gd_name").text().trim();

    result.yes24 = {
      contentType,
      metaCharset,
      eucKr: { pub: firstPub_euckr, title: firstTitle_euckr },
      utf8: { pub: firstPub_utf8, title: firstTitle_utf8 },
    };
  } catch (e) {
    result.yes24 = { error: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
