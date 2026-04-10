// api/market.js — Vercel Serverless Function
// Proxies requests to Polygon.io so your API key never reaches the browser.
//
// SETUP:
//   1. Deploy this folder to Vercel (free): https://vercel.com
//   2. In Vercel dashboard → Settings → Environment Variables → add:
//        POLYGON_API_KEY = your_key_here
//   3. Your ATLAS app calls  https://your-app.vercel.app/api/market?path=...
//      instead of calling Polygon directly.

export default async function handler(req, res) {
  // ── CORS: allow your Claude artifact origin ──────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ── Only GET allowed ─────────────────────────────────────────────────────
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Grab the Polygon path from query string ───────────────────────────────
  // Example: /api/market?path=/v2/snapshot/locale/us/markets/stocks/tickers&tickers=SPY,QQQ
  const { path, ...rest } = req.query;

  if (!path) {
    return res.status(400).json({ error: "Missing 'path' query parameter" });
  }

  // ── Allowlist: only permit safe Polygon endpoints ─────────────────────────
  const ALLOWED_PREFIXES = [
    "/v2/snapshot/locale/us/markets/stocks",
    "/v2/snapshot/locale/global/markets/crypto",
    "/v2/aggs/ticker/",
    "/v3/reference/tickers",
    "/v2/last/trade/",
    "/v1/open-close/",
  ];

  const isAllowed = ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isAllowed) {
    return res.status(403).json({ error: "Endpoint not permitted" });
  }

  // ── Build Polygon URL — inject key server-side ────────────────────────────
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "POLYGON_API_KEY not configured on server" });
  }

  const params = new URLSearchParams({ ...rest, apiKey });
  const polygonUrl = `https://api.polygon.io${path}?${params.toString()}`;

  // ── Proxy the request ─────────────────────────────────────────────────────
  try {
    const upstream = await fetch(polygonUrl, {
      headers: { "User-Agent": "ATLAS-Proxy/1.0" },
    });

    const data = await upstream.json();

    // Cache for 10 seconds (free tier rate limit friendly)
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Polygon proxy error:", err);
    return res.status(502).json({ error: "Upstream request failed", detail: err.message });
  }
}
