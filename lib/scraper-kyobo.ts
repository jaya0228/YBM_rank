import axios from "axios";
import * as cheerio from "cheerio";
import type { BookRank } from "./scraper-yes24";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

function isYbmOrEts(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("ets");
}

function parseBooks(html: string, query: string): BookRank[] {
  const $ = cheerio.load(html);
  const books: BookRank[] = [];

  $(".prod_item").each((idx, el) => {
    const checkbox = $(el).find("input.result_checkbox");
    const title = checkbox.attr("data-name")?.trim() ?? "";
    if (!title) return;

    const author = $(el).find(".prod_author").text().trim();
    if (!isYbmOrEts(author) && !isYbmOrEts(title)) return;

    const href = $(el).find("a.prod_link").attr("href") ?? "";
    const pid = checkbox.attr("data-pid") || href.match(/\/detail\/(S[^/?]+)/)?.[1] || "";
    const url = href || (pid ? `https://product.kyobobook.co.kr/detail/${pid}` : "");
    const coverImage = pid
      ? `https://contents.kyobobook.co.kr/sih/fit-in/458x0/product/${pid}.jpg`
      : undefined;

    books.push({ title, author: author || query, rank: idx + 1, url, coverImage });
  });

  return books;
}

export async function scrapeKyobo(): Promise<BookRank[]> {
  // YBM, ETS 각 1페이지씩 병렬 fetch (총 2 요청, 빠르고 안정적)
  const [ybmHtml, etsHtml] = await Promise.allSettled([
    axios.get("https://search.kyobobook.co.kr/search?keyword=YBM&page=1", { headers: HEADERS, timeout: 7000 }).then(r => r.data as string),
    axios.get("https://search.kyobobook.co.kr/search?keyword=ETS&page=1", { headers: HEADERS, timeout: 7000 }).then(r => r.data as string),
  ]);

  const seen = new Set<string>();
  const result: BookRank[] = [];
  let rank = 1;

  const ybmBooks = ybmHtml.status === "fulfilled" ? parseBooks(ybmHtml.value, "YBM") : [];
  const etsBooks = etsHtml.status === "fulfilled" ? parseBooks(etsHtml.value, "ETS") : [];

  for (const book of [...ybmBooks, ...etsBooks]) {
    if (seen.has(book.title)) continue;
    seen.add(book.title);
    result.push({ ...book, rank: rank++ });
  }

  return result;
}
