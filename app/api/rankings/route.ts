import { NextResponse } from "next/server";
import { scrapeKyobo } from "@/lib/scraper-kyobo";
import { aggregateRankings } from "@/lib/aggregator";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const kyoboData = await scrapeKyobo().catch(() => []);
  const rankings = aggregateRankings([], kyoboData);

  return NextResponse.json({
    rankings,
    updatedAt: new Date().toISOString(),
    sources: { kyobo: kyoboData.length },
  });
}
