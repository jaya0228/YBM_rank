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

// Yes24 베스트셀러 전체 목록에서 YBM 출판사 도서만 추출
export async function scrapeYes24(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const pages = [1, 2, 3]; // 상위 150권 스캔 (페이지당 50권)

  for (const page of pages) {
    try {
      const { data } = await axios.get(
        `https://www.yes24.com/Product/Category/BestSeller?CategoryNumber=001&sumgb=09&PageNumber=${page}`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(data);

      $(".itemUnit").each((_, el) => {
        const publisher = $(el).find(".authWrap .auth").last().text().trim();
        if (!publisher.toLowerCase().includes("ybm")) return;

        const rankText = $(el).find(".rankNum").text().trim();
        const rank = parseInt(rankText) || (page - 1) * 50 + results.length + 1;
        const title = $(el).find(".itemName").text().trim();
        const author = $(el).find(".authWrap .auth").first().text().trim();
        const href = $(el).find(".itemName").attr("href") || "";
        const url = href.startsWith("http") ? href : `https://www.yes24.com${href}`;
        const coverImage = $(el).find(".lazy").attr("data-original") || $(el).find("img").attr("src");

        if (title) {
          results.push({ title, author, rank, url, coverImage });
        }
      });
    } catch {
      // 페이지 실패 시 스킵
    }
  }

  return results;
}
