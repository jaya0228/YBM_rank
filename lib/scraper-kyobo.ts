import type { BookRank } from "./scraper-yes24";

function isYbmOrEtsAuthor(author: string): boolean {
  const lower = author.toLowerCase().replace(/\s+/g, "");
  return lower.includes("ybm") || lower.includes("ets");
}

// 교보문고 저자 검색으로 YBM / ETS 전체 도서 수집 (CSR이라 Puppeteer 사용)
export async function scrapeKyobo(): Promise<BookRank[]> {
  let browser;
  try {
    const isLocal = process.env.NODE_ENV === "development";

    const chromium = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = isLocal
      ? "/usr/bin/chromium-browser"
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
    let globalRank = 1;

    // YBM과 ETS 각각 검색
    const queries = ["YBM", "ETS"];

    for (const query of queries) {
      for (const pageNum of [1, 2, 3]) {
        try {
          await page.goto(
            `https://store.kyobobook.co.kr/search?keyword=${encodeURIComponent(query)}&target=author&page=${pageNum}`,
            { waitUntil: "networkidle2", timeout: 30000 }
          );

          await page
            .waitForSelector(".prod_item, li[class*='item'], [class*='search'] li", {
              timeout: 10000,
            })
            .catch(() => null);

          const books = await page.evaluate(() => {
            const selectors = [
              ".prod_item",
              "li[class*='item']",
              "[class*='search_list'] li",
              "[class*='result'] li",
            ];
            let items: NodeListOf<Element> | null = null;
            for (const sel of selectors) {
              const found = document.querySelectorAll(sel);
              if (found.length > 0) {
                items = found;
                break;
              }
            }
            if (!items) return [];

            const found: Array<{
              title: string;
              author: string;
              url: string;
              coverImage: string;
            }> = [];

            items.forEach((el) => {
              const authorEl = el.querySelector(
                ".prod_author, [class*='author'], [class*='writer']"
              );
              const author = authorEl?.textContent?.trim() ?? "";

              const titleEl = el.querySelector(
                ".prod_name a, [class*='title'] a, h2 a, h3 a, a[class*='name']"
              );
              const title = titleEl?.textContent?.trim() ?? "";
              const href = (titleEl as HTMLAnchorElement)?.href ?? "";
              const coverImage =
                (el.querySelector("img") as HTMLImageElement)?.src ?? "";

              if (title && author) {
                found.push({ title, author, url: href, coverImage });
              }
            });
            return found;
          });

          for (const book of books) {
            if (!isYbmOrEtsAuthor(book.author)) continue;
            if (seen.has(book.title)) continue;
            seen.add(book.title);
            results.push({ ...book, rank: globalRank++ });
          }
        } catch {
          // 페이지 실패 시 스킵
        }
      }
    }

    return results;
  } catch {
    return [];
  } finally {
    await browser?.close();
  }
}
