import type { AggregatedBook } from "@/lib/aggregator";

async function getRankings() {
  try {
    const [yes24, kyobo] = await Promise.allSettled([
      import("@/lib/scraper-yes24").then((m) => m.scrapeYes24()),
      import("@/lib/scraper-kyobo").then((m) => m.scrapeKyobo()),
    ]);
    const { aggregateRankings } = await import("@/lib/aggregator");
    const yes24Data = yes24.status === "fulfilled" ? yes24.value : [];
    const kyoboData = kyobo.status === "fulfilled" ? kyobo.value : [];
    return {
      rankings: aggregateRankings(yes24Data, kyoboData),
      updatedAt: new Date().toISOString(),
      sources: { yes24: yes24Data.length, kyobo: kyoboData.length },
    };
  } catch {
    return { rankings: [], updatedAt: new Date().toISOString(), sources: { yes24: 0, kyobo: 0 } };
  }
}

export const revalidate = 3600;

export default async function Home() {
  const { rankings, updatedAt, sources } = await getRankings();

  const updatedDate = new Date(updatedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">YBM 도서 실시간 순위</h1>
            <p className="text-xs text-gray-500 mt-0.5">Yes24 + 교보문고 종합</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>업데이트: {updatedDate}</p>
            <p>Yes24 {sources.yes24}권 · 교보 {sources.kyobo}권</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {rankings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">데이터를 불러오지 못했습니다.</p>
            <p className="text-sm mt-2">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((book: AggregatedBook) => (
              <BookCard key={book.title} book={book} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function BookCard({ book }: { book: AggregatedBook }) {
  const rankColor =
    book.combinedRank === 1
      ? "bg-yellow-400 text-white"
      : book.combinedRank === 2
      ? "bg-gray-400 text-white"
      : book.combinedRank === 3
      ? "bg-amber-600 text-white"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${rankColor}`}>
        {book.combinedRank}
      </div>

      {book.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-14 h-20 object-cover rounded flex-shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{book.title}</h2>
        <p className="text-xs text-gray-500 mt-1">{book.author}</p>

        <div className="flex gap-3 mt-2 text-xs">
          {book.yes24Rank ? (
            <a href={book.yes24Url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Yes24 {book.yes24Rank}위
            </a>
          ) : (
            <span className="text-gray-300">Yes24 —</span>
          )}
          {book.kyoboRank ? (
            <a href={book.kyoboUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
              교보 {book.kyoboRank}위
            </a>
          ) : (
            <span className="text-gray-300">교보 —</span>
          )}
        </div>
      </div>
    </div>
  );
}
