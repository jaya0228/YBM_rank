import axios from "axios";
import * as cheerio from "cheerio";

export interface BookRank {
  title: string;
  author: string;
  rank: number;
  url: string;
  coverImage?: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: "https://www.yes24.com/",
};

function isYbmAuthor(author: string): boolean {
  const lower = author.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("와이비엠");
}

export async function scrapeYes24(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const seen = new Set<string>();
  let globalRank = 1;

  for (const page of [1, 2, 3, 4, 5]) {
    try {
      const { data } = await axios.get(
        `https://www.yes24.com/Product/Search?domain=BOOK&query=%EC%99%80%EC%9D%B4%EB%B9%84%EC%97%A0&keyfield=author&PageNumber=${page}`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(data);

      $(".goods_info").each((_, el) => {
        const titleEl = $(el).find(".goods_name a");
        const href = titleEl.attr("href") ?? "";
        if (!href.includes("/Product/Goods/")) return;

        const authorText = $(el).find(".goods_auth").text().trim();
        if (!isYbmAuthor(authorText)) return;

        const title = titleEl.text().trim();
        if (!title || seen.has(title)) return;

        const url = `https://www.yes24.com${href}`;
        const author = authorText;
        const coverImage =
          $(el).parent().find("img.lazy").attr("data-original") ||
          $(el).parent().find("img").attr("src");

        seen.add(title);
        results.push({ title, author, rank: globalRank++, url, coverImage });
      });
    } catch {
      // 페이지 실패 시 스킵
    }
  }

  return results;
}
