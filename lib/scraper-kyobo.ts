import axios from "axios";
import * as cheerio from "cheerio";
import type { BookRank } from "./scraper-yes24";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: "https://product.kyobobook.co.kr/",
};

// 교보문고 베스트셀러에서 YBM 출판사 도서 추출
export async function scrapeKyobo(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const pages = [1, 2, 3];

  for (const page of pages) {
    try {
      const { data } = await axios.get(
        `https://product.kyobobook.co.kr/bestseller/total?page=${page}&per=50`,
        { headers: HEADERS, timeout: 10000 }
      );
      const $ = cheerio.load(data);

      $(".prod_item").each((idx, el) => {
        const publisher = $(el).find(".prod_publish").text().trim();
        if (!publisher.toLowerCase().includes("ybm")) return;

        const rankText = $(el).find(".rank_num").text().trim();
        const rank = parseInt(rankText) || (page - 1) * 50 + idx + 1;
        const title = $(el).find(".prod_name").text().trim();
        const author = $(el).find(".prod_author").text().trim();
        const href = $(el).find(".prod_name").attr("href") || $(el).find("a").attr("href") || "";
        const url = href.startsWith("http") ? href : `https://product.kyobobook.co.kr${href}`;
        const coverImage = $(el).find("img").attr("src");

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
