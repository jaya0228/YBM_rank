import { NextResponse } from "next/server";
import axios from "axios";

export const dynamic = "force-dynamic";

const PID = "S000218791163";
const BID = "9788917243802";

async function getSize(url: string): Promise<number | string> {
  try {
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 6000 });
    return (r.data as ArrayBuffer).byteLength;
  } catch { return "실패"; }
}

export async function GET() {
  const urls: Record<string, string> = {
    "200x0":       `https://contents.kyobobook.co.kr/sih/fit-in/200x0/product/${PID}.jpg`,
    "458x0":       `https://contents.kyobobook.co.kr/sih/fit-in/458x0/product/${PID}.jpg`,
    "200x290":     `https://contents.kyobobook.co.kr/sih/fit-in/200x290/product/${PID}.jpg`,
    "direct":      `https://contents.kyobobook.co.kr/product/${PID}.jpg`,
    "isbn_large":  `https://image.kyobobook.co.kr/images/book/large/${BID.slice(-3)}/b${BID}.jpg`,
    "isbn_xlarge": `https://image.kyobobook.co.kr/images/book/xlarge/${BID.slice(-3)}/b${BID}.jpg`,
    "isbn_medium": `https://image.kyobobook.co.kr/images/book/medium/${BID.slice(-3)}/b${BID}.jpg`,
    "cover_api":   `https://contents.kyobobook.co.kr/sih/fit-in/200x0/cover/${PID}.jpg`,
  };

  const results: Record<string, number | string> = {};
  for (const [key, url] of Object.entries(urls)) {
    results[key] = await getSize(url);
  }

  return NextResponse.json(results);
}
