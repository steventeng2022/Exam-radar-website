# Exam Radar Website 📡

Exam Radar 的獨立 Next.js 網站與 Cloudflare Workers API 代理。包含段考搜尋、跨校比較、來源／版本紀錄、爬蟲政策與管理控制台。

後端與 Python 爬蟲位於 [Exam-radar](https://github.com/steventeng2022/Exam-radar)。**只部署這個 repository，能啟動網站與 API 代理；不會啟動 Python API、爬蟲或 PostgreSQL。**

## Cloudflare Workers Git 部署

| 設定 | 值 |
| --- | --- |
| Repository | `steventeng2022/Exam-radar-website` |
| Branch | `main` |
| Root directory | repository 根目錄，留空或 `.` |
| Node.js | 22 |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Runtime variable | `API_ORIGIN=https://你的後端網域` |

在 Cloudflare Worker 的 **Settings → Variables and Secrets** 設定 API_ORIGIN 並套用部署。它是後端的 HTTPS origin，不含 `/api`、路徑或 query，不能是 localhost 或這個網站自己的網址。

建置會靜態匯出 Next.js 到 `out/`。`wrangler.jsonc` 部署網站資產與 `workers/index.ts`；瀏覽器查詢同源 `/api/*`，Worker 再轉到 API_ORIGIN。不需要 OpenNext adapter，因為本網站沒有 Next.js 伺服器端功能。

CLI 部署：

```bash
npm install
npm run deploy:cloudflare
# 在 Cloudflare Dashboard 設定 API_ORIGIN，並套用設定。
```

Cloudflare 帳號登入／部署授權由執行部署的人設定，本 repo 不包含憑證。無 API_ORIGIN 時 `/api/*` 回傳 503；上游無法連線或回傳重新導向時回傳 502，網站仍能顯示連線錯誤狀態。

## 後端怎麼部署

從 [後端 repository](https://github.com/steventeng2022/Exam-radar) 在 VPS、Railway、Render 等支援 Python 程序的平台分別啟動：

- API：`uvicorn backend.main:app --host 0.0.0.0 --port 8000`，平台指定 PORT 時改用該 port，提供 HTTPS 網址。
- Crawler：`python -m backend.worker`，一個 replica；frontier 目錄使用持久磁碟。
- PostgreSQL：API 與 crawler 指向相同 DATABASE_URL。

後端的 ADMIN_TOKEN 使用長隨機秘密。控制台輸入這個 token，Worker 會轉送 Authorization header；token 不會存入前端 bundle 或瀏覽器儲存空間。**不要將 ADMIN_TOKEN、DATABASE_URL 放入 NEXT_PUBLIC_ 變數。**

正式學校清單需由後端匯入、啟用 crawl，並由實際公告抽取與審核。沒有資料時列表為空是正常情況。展示需要後端明確設定 DEMO_MODE=true；示範日期與範圍不能作為備考依據。

## 本地開發與檢查

需求 Node.js 22+；先依後端 repo README 啟動 localhost:8000。

```bash
npm install
npm run dev
```

開啟 http://localhost:3000 。本地 `next dev` 預設直連 localhost:8000；Cloudflare build 固定使用同源 API 代理。`next start` 只適用一般 `npm run build`，不能用來啟動靜態 export。

```bash
npm test
npm run typecheck
npm run build:cloudflare
npx wrangler deploy --dry-run --outdir artifacts/cloudflare
```

GitHub Actions 執行代理測試、TypeScript、一般 Next.js 建置、Cloudflare 靜態建置與 Wrangler dry-run。dry-run 驗證打包，沒有實際建立 Worker 或驗證正式 API 的可用性。

## 上線驗收

1. 網站 `/`、`/compare/`、`/dashboard/`、`/crawler/` 能開啟。
2. 網站的 `/api/health` 回傳 `status: ok`。
3. 搜尋與比較能讀到後端發布的資料，示範資料標籤清楚。
4. 控制台能查閱工作與審核資料，排入工作後由獨立 Python crawler 取走。
5. 審核一份真實公開公告後，能追溯原始來源與修正版。

本次 CI 不能取代上述實際雲端驗收；全台收錄、AI/OCR、歷屆題推薦尚未啟用。
