@AGENTS.md

# YBM 도서 순위 프로젝트

## 개요
Yes24 + 교보문고에서 YBM/ETS 저자 도서를 수집해 종합 순위를 보여주는 Next.js 웹사이트.

## 배포
- GitHub: https://github.com/jaya0228/YBM_rank
- 배포: Vercel (master 푸시 시 자동 배포)

## 기술 스택
- Next.js 16.2.4 (App Router) + TypeScript + Tailwind CSS
- Yes24 스크래퍼: axios + cheerio
- 교보 스크래퍼: puppeteer-core + @sparticuz/chromium (CSR 사이트)

## 스크래핑 방식
- **Yes24**: 저자 검색 `?query=와이비엠&keyfield=author` (와이비엠/YBM 두 쿼리, 5페이지)
- **교보**: 저자 검색 `?keyword=YBM&target=author` (YBM/ETS 두 쿼리, 3페이지), author 필드에 ybm/ets 포함 여부로 필터
- **합산**: 두 사이트 순위 평균, 한쪽만 있으면 +50 페널티

## 주요 파일
- `app/page.tsx` — 메인 페이지 UI
- `app/api/rankings/route.ts` — API 라우트 (force-dynamic 필수)
- `lib/scraper-yes24.ts` — Yes24 스크래퍼
- `lib/scraper-kyobo.ts` — 교보 스크래퍼
- `lib/aggregator.ts` — 순위 합산 로직

## 알려진 이슈 / 주의사항
- API 라우트에 `export const dynamic = "force-dynamic"` 없으면 Vercel 빌드 실패
- 교보는 CSR 앱이라 Puppeteer 필수, 로컬에선 chromium 경로 `/usr/bin/chromium-browser`
- Yes24에서 YBM은 출판사가 아니라 **저자** 이름으로 등록됨 (publisher 필터 X)
