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

// Yes24 베스트셀러에서 YBM 출판사 도서 추출
// 전체(001) + 국어/외국어(001001) 카테고리 스캔
export async function scrapeYes24(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const seen = new Set<string>();

  const targets = [
    { cat: "001", pages: [1, 2, 3] },       // 전체 베스트셀러
    { cat: "001001", pages: [1, 2] },        // 국어/외국어/사전
  ];

  for (const { cat, pages } of targets) {
    for (const page of pages) {
      try {
        const { data } = await axios.get(
          `https://www.yes24.com/Product/Category/BestSeller?CategoryNumber=${cat}&sumgb=09&PageNumber=${page}`,
          { headers: HEADERS, timeout: 10000 }
        );
        const $ = cheerio.load(data);

        $(".itemUnit").each((_, el) => {
          const publisher = $(el).find(".authPub.info_pub a").text().trim();
          if (!publisher.toLowerCase().includes("ybm")) return;

          const rankText = $(el).find(".ico.rank").text().trim();
          const rank = parseInt(rankText) || 999;
          const title = $(el).find(".gd_name").text().trim();
          const author = $(el).find(".authPub.info_auth a").first().text().trim();
          const href = $(el).find(".gd_name").attr("href") || "";
          const url = href.startsWith("http") ? href : `https://www.yes24.com${href}`;
          const coverImage = $(el).find("img.lazy").attr("data-original") || $(el).find("img").attr("src");

          if (title && !seen.has(title)) {
            seen.add(title);
            results.push({ title, author, rank, url, coverImage });
          }
        });
      } catch {
        // 페이지 실패 시 스킵
      }
    }
  }

  return results.sort((a, b) => a.rank - b.rank);
}
