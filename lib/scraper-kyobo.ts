import axios from "axios";
import * as cheerio from "cheerio";
import type { BookRank } from "./scraper-yes24";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

function isYbmOrEts(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("ets");
}

async function fetchPage(query: string, page: number): Promise<BookRank[]> {
  try {
    const { data } = await axios.get(
      `https://search.kyobobook.co.kr/search?keyword=${encodeURIComponent(query)}&page=${page}`,
      { headers: HEADERS, timeout: 8000 }
    );
    const $ = cheerio.load(data);
    const books: BookRank[] = [];

    $(".prod_item").each((idx, el) => {
      const checkbox = $(el).find("input.result_checkbox");
      const title = checkbox.attr("data-name")?.trim() ?? $(el).find("a.prod_link").first().text().trim();
      if (!title) return;

      const authorText = $(el).find(".prod_author").text().trim() || $(el).find("[class*='author']").text().trim();
      if (!isYbmOrEts(authorText) && !isYbmOrEts(title)) return;

      const href = $(el).find("a.prod_link").attr("href") ?? "";
      const pid = checkbox.attr("data-pid") || href.match(/\/detail\/(S[^/?]+)/)?.[1] || "";
      const url = href || (pid ? `https://product.kyobobook.co.kr/detail/${pid}` : "");
      const coverImage = pid
        ? `https://contents.kyobobook.co.kr/sih/fit-in/458x0/product/${pid}.jpg`
        : undefined;

      books.push({ title, author: authorText || query, rank: (page - 1) * 20 + idx + 1, url, coverImage });
    });

    return books;
  } catch {
    return [];
  }
}

export async function scrapeKyobo(): Promise<BookRank[]> {
  // YBM, ETS 각 3페이지 — 모두 병렬 실행
  const tasks = ["YBM", "ETS"].flatMap(q => [1, 2, 3].map(p => fetchPage(q, p)));
  const results = await Promise.all(tasks);

  const seen = new Set<string>();
  const merged: BookRank[] = [];
  let rank = 1;

  for (const books of results) {
    for (const book of books) {
      if (seen.has(book.title)) continue;
      seen.add(book.title);
      merged.push({ ...book, rank: rank++ });
    }
  }

  return merged;
}
