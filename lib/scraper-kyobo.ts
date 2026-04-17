import type { BookRank } from "./scraper-yes24";

// 교보문고는 CSR(React) 앱이라 Puppeteer로 스크래핑
export async function scrapeKyobo(): Promise<BookRank[]> {
  let browser;
  try {
    // 로컬 개발: puppeteer 설치 필요, Vercel: @sparticuz/chromium 사용
    const isLocal = process.env.NODE_ENV === "development";
    let executablePath: string;

    const chromium = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");
    executablePath = isLocal
      ? "/usr/bin/chromium-browser" // 로컬 Chromium 경로 (없으면 아래 fallback)
      : await chromium.default.executablePath();
    browser = await puppeteerCore.default.launch({
      args: isLocal ? ["--no-sandbox"] : chromium.default.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "ko-KR,ko;q=0.9" });

    const results: BookRank[] = [];
    const seen = new Set<string>();

    for (const pageNum of [1, 2, 3]) {
      await page.goto(
        `https://store.kyobobook.co.kr/bestseller/total/weekly?page=${pageNum}`,
        { waitUntil: "networkidle2", timeout: 30000 }
      );

      // 도서 목록 로딩 대기
      await page.waitForSelector(".prod_item, .book_item, li[class*='item']", { timeout: 10000 }).catch(() => null);

      const books = await page.evaluate((pNum: number) => {
        const items = document.querySelectorAll(
          ".prod_item, .book_item, li[class*='best'], li[class*='item']"
        );
        const found: Array<{ title: string; author: string; rank: number; url: string; coverImage: string; publisher: string }> = [];
        items.forEach((el, idx) => {
          const publisher =
            el.querySelector(".prod_publish, .publisher, [class*='publish']")?.textContent?.trim() ?? "";
          if (!publisher.toLowerCase().includes("ybm") && !publisher.includes("와이비엠")) return;

          const rankEl = el.querySelector(".rank_num, .num, [class*='rank']");
          const rank = parseInt(rankEl?.textContent?.trim() ?? "") || (pNum - 1) * 50 + idx + 1;
          const titleEl = el.querySelector(".prod_name, .title, [class*='title'] a, h2 a, h3 a");
          const title = titleEl?.textContent?.trim() ?? "";
          const author = el.querySelector(".prod_author, .author, [class*='author']")?.textContent?.trim() ?? "";
          const href = (titleEl as HTMLAnchorElement)?.href ?? el.querySelector("a")?.href ?? "";
          const coverImage = (el.querySelector("img") as HTMLImageElement)?.src ?? "";

          if (title) found.push({ title, author, rank, url: href, coverImage, publisher });
        });
        return found;
      }, pageNum);

      for (const book of books) {
        if (!seen.has(book.title)) {
          seen.add(book.title);
          results.push(book);
        }
      }
    }

    return results.sort((a, b) => a.rank - b.rank);
  } catch {
    return [];
  } finally {
    await browser?.close();
  }
}
