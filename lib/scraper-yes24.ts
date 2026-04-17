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
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
  "Referer": "https://www.yes24.com/",
};

function isYbm(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("와이비엠");
}

async function fetchEucKr(url: string): Promise<string> {
  const { data } = await axios.get(url, {
    headers: HEADERS,
    timeout: 15000,
    responseType: "arraybuffer",
  });
  const decoded = new TextDecoder("euc-kr").decode(data as ArrayBuffer);
  // cheerio가 charset=euc-kr 메타태그 보고 재해석하지 않도록 utf-8로 교체
  return decoded.replace(/charset=["']?euc-kr["']?/gi, 'charset="utf-8"');
}

// Yes24 검색은 JS 렌더링이라 서버에서 안 됨 → SSR 베스트셀러 페이지 사용
// 국어/외국어(001001) + 수험/자격증(001011) 카테고리에서 YBM 출판사 책 수집
export async function scrapeYes24(): Promise<BookRank[]> {
  const results: BookRank[] = [];
  const seen = new Set<string>();
  let globalRank = 1;

  const targets = [
    { cat: "001001", pages: [1, 2, 3, 4, 5] },
    { cat: "001011", pages: [1, 2, 3] },
  ];

  for (const { cat, pages } of targets) {
    for (const page of pages) {
      try {
        const html = await fetchEucKr(
          `https://www.yes24.com/Product/Category/BestSeller?CategoryNumber=${cat}&sumgb=09&PageNumber=${page}`
        );
        const $ = cheerio.load(html);

        $(".itemUnit").each((_, el) => {
          const pub = $(el).find(".authPub.info_pub").text().trim();
          const auth = $(el).find(".authPub.info_auth").text().trim();
          if (!isYbm(pub) && !isYbm(auth)) return;

          const title = $(el).find(".gd_name").text().trim();
          if (!title || seen.has(title)) return;

          const href = $(el).find(".gd_name").attr("href") ?? "";
          const url = href.startsWith("http") ? href : `https://www.yes24.com${href}`;
          const author = $(el).find(".authPub.info_auth a").first().text().trim() || auth;
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
