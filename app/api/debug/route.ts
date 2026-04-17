import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {};

  // 교보: pid 목록과 각 이미지 URL 실제 크기 확인
  try {
    const { data } = await axios.get(
      "https://search.kyobobook.co.kr/search?keyword=YBM&page=1",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
        timeout: 15000,
      }
    );
    const $ = cheerio.load(data);
    const samples: { title: string; pid: string; imgSize: number | string }[] = [];

    const items = $(".prod_item").slice(0, 5).toArray();
    for (const el of items) {
      const checkbox = $(el).find("input.result_checkbox");
      const title = checkbox.attr("data-name") ?? "";
      const pid = checkbox.attr("data-pid") ?? "";
      const imgUrl = `https://contents.kyobobook.co.kr/sih/fit-in/200x0/product/${pid}.jpg`;
      let imgSize: number | string = "skip";
      if (pid) {
        try {
          const r = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 5000 });
          imgSize = (r.data as ArrayBuffer).byteLength;
        } catch { imgSize = "실패"; }
      }
      samples.push({ title, pid, imgSize });
    }
    result.kyobo_images = samples;
  } catch (e) {
    result.kyobo_images = { error: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
