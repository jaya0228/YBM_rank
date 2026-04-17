import axios from "axios";
import * as cheerio from "cheerio";
import type { BookRank } from "./scraper-yes24";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  "Connection": "keep-alive",
};

function isYbmOrEts(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("ets");
}

// Puppeteer 제거 — search.kyobobook.co.kr는 SSR HTML 반환
export async function scrapeKyobo(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const seen = new Set<string>();
  let globalRank = 1;

  const queries = ["YBM", "ETS"];

  for (const query of queries) {
    for (const page of [1, 2, 3]) {
      try {
        const { data } = await axios.get(
          `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(query)}&page=${page}`,
          { headers: HEADERS, timeout: 15000 }
        );
        const $ = cheerio.load(data);

        $(".prod_item").each((_, el) => {
          const checkbox = $(el).find("input.result_checkbox");
          const title = checkbox.attr("data-name")?.trim() ?? $(el).find("a.prod_link").first().text().trim();
          if (!title || seen.has(title)) return;

          const authorText =
            $(el).find(".prod_author").text().trim() ||
            $(el).find(".author").text().trim();

          // 저자 또는 제목에 YBM/ETS 포함 여부 확인
          if (!isYbmOrEts(authorText) && !isYbmOrEts(title)) return;

          const href = $(el).find("a.prod_link").attr("href") ?? "";
          // pid: data-pid → URL에서 추출 순으로 fallback
          const pid =
            checkbox.attr("data-pid") ||
            href.match(/\/detail\/(S[^/?]+)/)?.[1] ||
            "";
          const url = href || (pid ? `https://product.kyobobook.co.kr/detail/${pid}` : "");
          const coverImage = pid
            ? `https://contents.kyobobook.co.kr/sih/fit-in/458x0/product/${pid}.jpg`
            : undefined;

          seen.add(title);
          results.push({ title, author: authorText || query, rank: globalRank++, url, coverImage });
        });
      } catch {
        // 페이지 실패 시 스킵
      }
    }
  }

  return results;
}
