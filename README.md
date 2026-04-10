# ATLAS Polygon Proxy

Secure server-side proxy so your Polygon.io API key never touches the browser.

## Deploy to Vercel (free, 2 minutes)

### Option A — Vercel CLI
```bash
npm i -g vercel
cd atlas-proxy
vercel deploy
```

### Option B — GitHub → Vercel (recommended)
1. Push this folder to a GitHub repo
2. Go to vercel.com → "Add New Project" → import your repo
3. Vercel auto-detects the `/api` folder — no config needed

## Add your API key (critical step)
In Vercel dashboard:
- Project → Settings → Environment Variables
- Name:  `POLYGON_API_KEY`
- Value: your Polygon.io key
- Click Save → Redeploy

Your key is now encrypted on Vercel's servers. It never appears in browser requests.

## Update your ATLAS app
Once deployed, replace all Polygon fetch calls in the ATLAS dashboard with:

```js
// BEFORE (insecure — key in browser)
const url = `https://api.polygon.io/v2/snapshot/...?apiKey=${yourKey}`;

// AFTER (secure — key stays on server)
const PROXY = "https://your-app.vercel.app";

async function polygonFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${PROXY}/api/market?path=${encodeURIComponent(path)}&${qs}`);
  return res.json();
}

// Example — fetch snapshots:
const data = await polygonFetch(
  "/v2/snapshot/locale/us/markets/stocks/tickers",
  { tickers: "SPY,QQQ,NVDA" }
);
```

## What the proxy does
- Injects your API key server-side before forwarding to Polygon
- Allowlists only safe endpoints (no account/billing endpoints exposed)
- Adds 10-second cache to stay within free tier rate limits
- Returns CORS headers so browser fetch works without errors

## Cost
Vercel free tier: 100GB bandwidth, 100k function invocations/month.
More than enough for personal use.
