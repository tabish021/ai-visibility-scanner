import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns";
import https from "https";
import { ScanResult, CheckItem, CheckCategory, CheckStatus } from "./types";

dns.setDefaultResultOrder("ipv4first");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  family: 4,
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const FIX_PRICES: Record<string, number> = {
  C01: 900,
  C02: 600,
  C03: 1050,
  C04: 1750,
  C05: 600,
  C06: 300,
  C07: 200,
  C08: 200,
  C09: 250,
  C10: 150,
  C11: 350,
  C12: 400,
  C13: 950,
  C14: 400,
  C15: 950,
  C17: 350,
  C18: 100,
};

function normalizeUrl(input: string): URL {
  let cleaned = input.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  return new URL(cleaned);
}

async function fetchPSI(url: string, apiKey: string) {
  if (!apiKey) return null;
  try {
    const res = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`,
      {
        params: { url, key: apiKey.trim(), strategy: "mobile" },
        timeout: 60000,
        httpsAgent,
      },
    );
    const audits = res.data.lighthouseResult?.audits;
    if (!audits) return null;
    return {
      lcp: audits["largest-contentful-paint"]?.numericValue || 0,
      cls: audits["cumulative-layout-shift"]?.numericValue || 0,
    };
  } catch (e: any) {
    // We catch the error here so the whole scan doesn't crash
    console.error("PageSpeed Error:", e.message);
    return null;
  }
}

async function runScanner(
  targetUrl: string,
  isLocal: boolean,
): Promise<ScanResult> {
  const parsedUrl = normalizeUrl(targetUrl);
  const fullUrl = parsedUrl.toString();
  const origin = parsedUrl.origin;

  const psiPromise = fetchPSI(fullUrl, process.env.PAGESPEED_API_KEY || "");

  const client = axios.create({
    timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    maxRedirects: 5,
    validateStatus: () => true,
    httpsAgent,
  });

  let html = "";
  let status = 200;

  try {
    const pageRes = await client.get(fullUrl);
    html =
      typeof pageRes.data === "string"
        ? pageRes.data
        : JSON.stringify(pageRes.data);
    status = pageRes.status;
  } catch (err: any) {
    throw new Error(`Connection Failed: ${err.message}`);
  }

  const $ = cheerio.load(html);
  const checks: CheckItem[] = [];
  const info: any[] = [];

  let robotsTxt = "",
    robotsFound = false,
    sitemapFound = false;
  try {
    const robotsRes = await client.get(`${origin}/robots.txt`);
    if (robotsRes.status === 200) {
      robotsTxt = robotsRes.data;
      robotsFound = true;
      if (robotsTxt.includes("Sitemap:")) sitemapFound = true;
    }
  } catch {}
  if (!sitemapFound) {
    try {
      const sitemapRes = await client.get(`${origin}/sitemap.xml`);
      if (sitemapRes.status === 200) sitemapFound = true;
    } catch {}
  }

  // CHECK SCHEMA BEFORE DELETING SCRIPTS
  const jsonLd = $('script[type="application/ld+json"]');
  let hasOrg = false;
  jsonLd.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      const types = Array.isArray(data)
        ? data.map((d: any) => d["@type"])
        : [data["@type"]];
      if (
        types.some(
          (t: string) =>
            t && (t.includes("Organization") || t.includes("LocalBusiness")),
        )
      )
        hasOrg = true;
      if (data["@graph"]) {
        data["@graph"].forEach((node: any) => {
          if (
            node["@type"] &&
            (node["@type"].includes("Organization") ||
              node["@type"].includes("LocalBusiness"))
          )
            hasOrg = true;
        });
      }
    } catch {}
  });

  // NOW delete scripts for word count
  $("script, style, noscript, template").remove();
  const rawText = $("body").text().replace(/\s+/g, " ").trim();
  const rawWords = rawText.split(" ").filter((w) => w.length > 1).length;

  // C01 Indexable
  let c01Status: CheckStatus = "PASS",
    c01Found = "Page returns 200 OK.";
  if (status !== 200) {
    c01Status = "FAIL";
    c01Found = `Page returned ${status}.`;
  } else if ($('meta[name="robots"]').attr("content")?.includes("noindex")) {
    c01Status = "FAIL";
    c01Found = "Found 'noindex' tag.";
  }
  checks.push({
    id: "C01",
    name: "Page is indexable",
    category: "A",
    weight: 25,
    status: c01Status,
    found: c01Found,
    why: "If a page can't be indexed, it can't appear in AI answers.",
    fix: "Remove noindex.",
  });

  // C02 Robots.txt
  let c02Status: CheckStatus = "PASS",
    c02Found = "Robots.txt allows AI bots.";
  if (
    robotsFound &&
    /User-agent:\s*(Googlebot|OAI-SearchBot|PerplexityBot)[\s\S]*?Disallow:\s*\//i.test(
      robotsTxt,
    )
  ) {
    c02Status = "FAIL";
    c02Found = "Robots.txt is blocking AI bots.";
  }
  checks.push({
    id: "C02",
    name: "Crawler access in robots.txt",
    category: "A",
    weight: 25,
    status: c02Status,
    found: c02Found,
    why: "AI assistants can only read what they are allowed to.",
    fix: "Update robots.txt.",
  });

  // C03 Bot Fetch
  let c03Status: CheckStatus = "PASS",
    c03Found = "No bot blocking detected.";
  try {
    const botRes = await client.get(fullUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OAI-SearchBot/1.0)" },
    });
    if ([401, 403, 406, 429, 503].includes(botRes.status)) {
      c03Status = "FAIL";
      c03Found = "Firewall is blocking AI crawlers.";
    }
  } catch {}
  checks.push({
    id: "C03",
    name: "Bot fetch test",
    category: "A",
    weight: 15,
    status: c03Status,
    found: c03Found,
    why: "Firewalls can block AI bots.",
    fix: "Whitelist AI crawlers.",
  });

  // C04 Readable HTML
  let c04Status: CheckStatus = "PASS",
    c04Found = `Good raw HTML (${rawWords} words).`;
  if (rawWords < 50) {
    c04Status = "FAIL";
    c04Found = "Page looks empty without JS.";
  } else if (rawWords < 150) {
    c04Status = "WARN";
    c04Found = `Sparse HTML (${rawWords} words).`;
  }
  checks.push({
    id: "C04",
    name: "Readable HTML",
    category: "A",
    weight: 25,
    status: c04Status,
    found: c04Found,
    why: "AI tools read the raw page.",
    fix: "Implement SSR.",
  });

  // C05 HTTPS
  const isHttps = fullUrl.startsWith("https");
  checks.push({
    id: "C05",
    name: "HTTPS",
    category: "A",
    weight: 6,
    status: isHttps ? "PASS" : "FAIL",
    found: isHttps ? "HTTPS is active." : "No HTTPS.",
    why: "HTTPS builds trust.",
    fix: "Install SSL.",
  });

  // C06 Sitemap
  checks.push({
    id: "C06",
    name: "XML sitemap",
    category: "A",
    weight: 4,
    status: sitemapFound ? "PASS" : "WARN",
    found: sitemapFound ? "Sitemap found." : "No sitemap.",
    why: "Helps discovery.",
    fix: "Create sitemap.xml.",
  });

  // C07 Title
  const title = $("title").text().trim();
  let c07Status: CheckStatus = "PASS";
  if (!title) c07Status = "FAIL";
  else if (title.length < 30 || title.length > 60) c07Status = "WARN";
  checks.push({
    id: "C07",
    name: "Title tag",
    category: "B",
    weight: 15,
    status: c07Status,
    found: title ? `"${title}" (${title.length} chars)` : "Missing",
    why: "Titles appear in search.",
    fix: "Write a 30-60 char title.",
  });

  // C08 Description
  const desc = $('meta[name="description"]').attr("content") || "";
  let c08Status: CheckStatus = "PASS";
  if (!desc) c08Status = "FAIL";
  else if (desc.length < 70 || desc.length > 160) c08Status = "WARN";
  checks.push({
    id: "C08",
    name: "Meta description",
    category: "B",
    weight: 12,
    status: c08Status,
    found: desc ? `"${desc}" (${desc.length} chars)` : "Missing",
    why: "Descriptions summarize pages.",
    fix: "Write a 70-160 char description.",
  });

  // C09 Canonical
  checks.push({
    id: "C09",
    name: "Canonical tag",
    category: "B",
    weight: 12,
    status: $('link[rel="canonical"]').length > 0 ? "PASS" : "WARN",
    found: $('link[rel="canonical"]').length > 0 ? "Present" : "Missing",
    why: "Avoids duplicate content.",
    fix: "Add canonical tag.",
  });

  // C10 Viewport
  checks.push({
    id: "C10",
    name: "Mobile viewport",
    category: "B",
    weight: 8,
    status: $('meta[name="viewport"]').length > 0 ? "PASS" : "FAIL",
    found: $('meta[name="viewport"]').length > 0 ? "Configured" : "Missing",
    why: "Mobile layout.",
    fix: "Add viewport tag.",
  });

  // C11 Headings
  const h1Count = $("h1").length,
    h2Count = $("h2").length,
    hasLang = $("html").attr("lang");
  let c11Issues =
    (h1Count === 0 ? 1 : 0) + (h2Count < 2 ? 1 : 0) + (!hasLang ? 1 : 0);
  let c11Status: CheckStatus =
    c11Issues === 0 ? "PASS" : c11Issues === 1 ? "WARN" : "FAIL";
  checks.push({
    id: "C11",
    name: "Heading structure",
    category: "B",
    weight: 15,
    status: c11Status,
    found: `${h1Count} H1s, ${h2Count} H2s`,
    why: "Content hierarchy.",
    fix: "Use H1 and H2s.",
  });

  // C12 Image Alt
  const imgs = $("img");
  let imgsWithAlt = 0;
  imgs.each((_, el) => {
    if ($(el).attr("alt")?.trim()) imgsWithAlt++;
  });
  let c12Status: CheckStatus = "PASS",
    c12Found = "All images have alt text.";
  if (imgs.length > 0) {
    const ratio = imgsWithAlt / imgs.length;
    if (ratio < 0.6) {
      c12Status = "FAIL";
      c12Found = `Only ${Math.round(ratio * 100)}% have alt.`;
    } else if (ratio < 0.9) {
      c12Status = "WARN";
      c12Found = `${Math.round(ratio * 100)}% have alt.`;
    }
  }
  checks.push({
    id: "C12",
    name: "Image alt text",
    category: "B",
    weight: 12,
    status: c12Status,
    found: c12Found,
    why: "Describes images to AI.",
    fix: "Add alt text.",
  });

  // C13 Page Speed
  let c13Status: CheckStatus = "N/A",
    c13Found = "Speed test unavailable.";
  const psiData = await psiPromise;
  if (psiData) {
    if (psiData.lcp > 4000 || psiData.cls > 0.25) {
      c13Status = "FAIL";
      c13Found = `Poor speed: LCP ${Math.round(psiData.lcp)}ms.`;
    } else if (psiData.lcp > 2500 || psiData.cls > 0.1) {
      c13Status = "WARN";
      c13Found = `Needs improvement: LCP ${Math.round(psiData.lcp)}ms.`;
    } else {
      c13Status = "PASS";
      c13Found = `Good speed: LCP ${Math.round(psiData.lcp)}ms.`;
    }
  }
  checks.push({
    id: "C13",
    name: "Page speed",
    category: "B",
    weight: 16,
    status: c13Status,
    found: c13Found,
    why: "Slow pages rank worse.",
    fix: "Optimize images.",
  });

  // C14 Links
  checks.push({
    id: "C14",
    name: "Broken links",
    category: "B",
    weight: 10,
    status: "PASS",
    found: "Skipped.",
    why: "Dead links hurt UX.",
    fix: "Fix links.",
  });

  // C15 Schema
  checks.push({
    id: "C15",
    name: "Structured data (JSON-LD)",
    category: "C",
    weight: 30,
    status: hasOrg ? "PASS" : "FAIL",
    found: hasOrg ? "Organization schema found." : "No Organization schema.",
    why: "Helps search engines understand you.",
    fix: "Add JSON-LD.",
  });

  // C16 Trust Signals
  let trustScore = 0;
  if (/about/i.test(rawText)) trustScore++;
  if (/contact|phone|email/i.test(rawText)) trustScore++;
  if (/privacy|terms/i.test(rawText)) trustScore++;
  if (/founder|team|author/i.test(rawText)) trustScore++;
  if (/review|testimonial/i.test(rawText)) trustScore++;
  checks.push({
    id: "C16",
    name: "Trust signals",
    category: "C",
    weight: 25,
    status: trustScore >= 4 ? "PASS" : trustScore >= 2 ? "WARN" : "FAIL",
    found: `Found ${trustScore}/5 signals.`,
    why: "Proves you are real.",
    fix: "Add trust signals.",
  });

  // C17 NAP
  let c17Status: CheckStatus = "N/A";
  if (isLocal)
    c17Status = /(?:\+91|\(?\d{3}\)?)[\s.-]?\d{3}[\s.-]?\d{4}/.test(rawText)
      ? "PASS"
      : "FAIL";
  checks.push({
    id: "C17",
    name: "Business details (NAP)",
    category: "C",
    weight: 15,
    status: c17Status,
    found:
      c17Status === "N/A"
        ? "Skipped"
        : c17Status === "PASS"
          ? "Phone found."
          : "No phone.",
    why: "Helps local AI.",
    fix: "Add phone.",
  });

  // C18 Social Links
  const hasSocial =
    /linkedin\.com|facebook\.com|instagram\.com|twitter\.com/i.test(html);
  checks.push({
    id: "C18",
    name: "Business profile links",
    category: "C",
    weight: 10,
    status: hasSocial ? "PASS" : "FAIL",
    found: hasSocial ? "Found social links." : "No social links.",
    why: "Ties site to reality.",
    fix: "Add social links.",
  });

  // C19 Content
  checks.push({
    id: "C19",
    name: "Answer-ready content",
    category: "C",
    weight: 20,
    status: rawWords >= 300 ? "PASS" : "FAIL",
    found: `${rawWords} words.`,
    why: "AI needs depth.",
    fix: "Write 300+ words.",
  });

  // Scores
  let aPoints = 0,
    aMax = 0,
    bPoints = 0,
    bMax = 0,
    cPoints = 0,
    cMax = 0;
  let totalQuote = 499,
    hasBlockingIssue = false;

  checks.forEach((c) => {
    const pts = c.status === "PASS" ? 1 : c.status === "WARN" ? 0.5 : 0;
    if (c.status !== "N/A") {
      if (c.category === "A") {
        aPoints += pts * c.weight;
        aMax += c.weight;
      }
      if (c.category === "B") {
        bPoints += pts * c.weight;
        bMax += c.weight;
      }
      if (c.category === "C") {
        cPoints += pts * c.weight;
        cMax += c.weight;
      }
    }
    if ((c.status === "FAIL" || c.status === "WARN") && FIX_PRICES[c.id])
      totalQuote += FIX_PRICES[c.id];
    if (
      (c.id === "C01" || c.id === "C02" || c.id === "C04") &&
      c.status === "FAIL"
    )
      hasBlockingIssue = true;
  });

  const scoreA = aMax > 0 ? (aPoints / aMax) * 100 : 0;
  const scoreB = bMax > 0 ? (bPoints / bMax) * 100 : 0;
  const scoreC = cMax > 0 ? (cPoints / cMax) * 100 : 0;

  let overallRaw = scoreA * 0.4 + scoreB * 0.3 + scoreC * 0.3;
  if (hasBlockingIssue) overallRaw = Math.min(overallRaw, 49);
  const finalScore = Math.round(overallRaw);

  let label =
    finalScore >= 90
      ? "Strong foundation"
      : finalScore >= 75
        ? "Good foundation"
        : finalScore >= 50
          ? "Needs work"
          : "Major gaps";

  return {
    scanner_version: "2.0",
    scanned_at: new Date().toISOString(),
    input_url: fullUrl,
    final_url: fullUrl,
    is_local_business: isLocal,
    overall: {
      score: finalScore,
      label,
      capped: hasBlockingIssue,
      disclaimer: "This score measures technical readiness.",
    },
    categories: {
      A: { name: "Access and Indexability", score: Math.round(scoreA) },
      B: { name: "Page Quality", score: Math.round(scoreB) },
      C: { name: "Trust and Identity", score: Math.round(scoreC) },
    },
    checks,
    info,
    quote: {
      setup_fee: 499,
      subtotal: totalQuote,
      quoted_items: [],
      total_fixed: Math.min(totalQuote, 9999),
    },
  };
}

// ==========================================
// 🚨 API ROUTES (The Logs are back here) 🚨
// ==========================================
app.post("/api/scan", async (req, res) => {
  const { url, isLocal } = req.body;
  if (!url) return res.status(400).json({ error: "URL required." });

  console.log(`\n========================================`);
  console.log(`🔍 NEW SCAN: ${url} (Local: ${isLocal})`);
  console.log(`🕒 Time: ${new Date().toLocaleString()}`);
  console.log(`========================================\n`);

  try {
    const result = await runScanner(url, !!isLocal);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Scan failed." });
  }
});

app.post("/api/lead", (req, res) => {
  const { email, domain } = req.body;

  console.log(`\n========================================`);
  console.log(`🎯 NEW LEAD CAPTURED!`);
  console.log(`📧 Email: ${email}`);
  console.log(`🌐 Website: ${domain}`);
  console.log(`🕒 Time: ${new Date().toLocaleString()}`);
  console.log(`========================================\n`);

  res.json({ success: true });
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Server Startup
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(Number(PORT), "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`),
  );
}
startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
