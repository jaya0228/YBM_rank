import { NextResponse } from "next/server";
import { scrapeYes24 } from "@/lib/scraper-yes24";
import { scrapeKyobo } from "@/lib/scraper-kyobo";
import { aggregateRankings } from "@/lib/aggregator";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1시간 캐시

export async function GET() {
  const [yes24, kyobo] = await Promise.allSettled([
    scrapeYes24(),
    scrapeKyobo(),
  ]);

  const yes24Data = yes24.status === "fulfilled" ? yes24.value : [];
  const kyoboData = kyobo.status === "fulfilled" ? kyobo.value : [];

  const rankings = aggregateRankings(yes24Data, kyoboData);

  return NextResponse.json({
    rankings,
    updatedAt: new Date().toISOString(),
    sources: {
      yes24: yes24Data.length,
      kyobo: kyoboData.length,
    },
  });
}
