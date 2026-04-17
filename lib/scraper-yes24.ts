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
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: "https://www.yes24.com/",
};

function isYbmAuthor(author: string): boolean {
  const lower = author.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("와이비엠");
}

// Yes24 저자 검색으로 YBM(와이비엠) 전체 도서 수집
export async function scrapeYes24(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const seen = new Set<string>();
  let globalRank = 1;

  const queries = ["와이비엠", "YBM"];

  for (const query of queries) {
    for (const page of [1, 2, 3, 4, 5]) {
      try {
        const { data } = await axios.get(
          `https://www.yes24.com/Product/Search?domain=BOOK&query=${encodeURIComponent(query)}&keyfield=author&PageNumber=${page}`,
          { headers: HEADERS, timeout: 10000 }
        );
        const $ = cheerio.load(data);

        $(".itemUnit").each((_, el) => {
          const authorText = $(el).find(".authPub.info_auth").text().trim();
          if (!isYbmAuthor(authorText)) return;

          const title = $(el).find(".gd_name").text().trim();
          if (!title || seen.has(title)) return;

          const href = $(el).find(".gd_name").attr("href") || "";
          const url = href.startsWith("http") ? href : `https://www.yes24.com${href}`;
          const author = $(el).find(".authPub.info_auth a").first().text().trim() || authorText;
          const coverImage =
            $(el).find("img.lazy").attr("data-original") ||
            $(el).find("img").attr("src");

          seen.add(title);
          results.push({ title, author, rank: globalRank++, url, coverImage });
        });
      } catch {
        // 페이지 실패 시 스킵
      }
    }
  }

  return results;
}
