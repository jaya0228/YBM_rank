import type { BookRank } from "./scraper-yes24";

export interface AggregatedBook {
  title: string;
  author: string;
  combinedRank: number;
  yes24Rank?: number;
  kyoboRank?: number;
  yes24Url?: string;
  kyoboUrl?: string;
  coverImage?: string;
}

// 두 사이트 순위를 평균 순위로 종합 (한 사이트만 있으면 해당 순위 사용)
export function aggregateRankings(
  yes24: BookRank[],
  kyobo: BookRank[]
): AggregatedBook[] {
  const map = new Map<string, AggregatedBook>();

  const normalize = (title: string) =>
    title.replace(/\s+/g, "").toLowerCase();

  for (const book of yes24) {
    const key = normalize(book.title);
    map.set(key, {
      title: book.title,
      author: book.author,
      yes24Rank: book.rank,
      yes24Url: book.url,
      coverImage: book.coverImage,
      combinedRank: 0,
    });
  }

  for (const book of kyobo) {
    const key = normalize(book.title);
    const existing = map.get(key);
    if (existing) {
      existing.kyoboRank = book.rank;
      existing.kyoboUrl = book.url;
      if (!existing.coverImage) existing.coverImage = book.coverImage;
    } else {
      map.set(key, {
        title: book.title,
        author: book.author,
        kyoboRank: book.rank,
        kyoboUrl: book.url,
        coverImage: book.coverImage,
        combinedRank: 0,
      });
    }
  }

  const books = Array.from(map.values());

  // 종합 순위 = 두 사이트 평균 (없는 경우 있는 순위 + 페널티 50)
  for (const book of books) {
    const r1 = book.yes24Rank ?? (book.kyoboRank! + 50);
    const r2 = book.kyoboRank ?? (book.yes24Rank! + 50);
    book.combinedRank = (r1 + r2) / 2;
  }

  books.sort((a, b) => a.combinedRank - b.combinedRank);

  return books.map((book, idx) => ({ ...book, combinedRank: idx + 1 }));
}
