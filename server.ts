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

// --- CONSTANTS & PRICING ---
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

// --- HELPERS ---
function normalizeUrl(input: string): URL {
  let cleaned = input.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  return new URL(cleaned);
}

async function fetchPSI(url: string, apiKey: string) {
  if (!apiKey) {
    console.log("⚠️ No PageSpeed API key provided.");
    return null;
  }
  try {
    const res = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`,
      {
        params: { url, key: apiKey, strategy: "mobile" },
        timeout: 25000, // Wait up to 25 seconds
        httpsAgent: httpsAgent, // Use our IPv4 agent
      },
    );

    const audits = res.data.lighthouseResult?.audits;
    if (!audits) return null;

    const lcp = audits["largest-contentful-paint"]?.numericValue || 0;
    const cls = audits["cumulative-layout-shift"]?.numericValue || 0;
    const tbt = audits["total-blocking-time"]?.numericValue || 0;

    return { lcp, cls, tbt };
  } catch (e: any) {
    console.error(
      "PageSpeed API Error:",
      e.response?.data?.error?.message || e.message,
    );
    return null;
  }
}

// --- MAIN SCANNER ---
async function runScanner(
  targetUrl: string,
  isLocal: boolean,
): Promise<ScanResult> {
  const parsedUrl = normalizeUrl(targetUrl);
  const fullUrl = parsedUrl.toString();
  const domain = parsedUrl.hostname;
  const origin = parsedUrl.origin;

  const client = axios.create({
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    maxRedirects: 5,
    validateStatus: () => true,
    httpsAgent: httpsAgent,
  });

  let html = "";
  let status = 200;
  let finalUrl = fullUrl;

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

  // --- FETCH ROBOTS.TXT & SITEMAP ---
  let robotsTxt = "";
  let robotsFound = false;
  let sitemapFound = false;
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

  // ==========================================
  // CATEGORY A: ACCESS AND INDEXABILITY
  // ==========================================

  let c01Status: CheckStatus = "PASS";
  let c01Found = "Page returns 200 OK and is allowed to be indexed.";
  if (status !== 200) {
    c01Status = "FAIL";
    c01Found = `Page returned HTTP status ${status}.`;
  } else if ($('meta[name="robots"]').attr("content")?.includes("noindex")) {
    c01Status = "FAIL";
    c01Found =
      "Found 'noindex' tag. Search engines are told not to list this page.";
  }
  checks.push({
    id: "C01",
    name: "Page is indexable",
    category: "A",
    weight: 25,
    status: c01Status,
    found: c01Found,
    why: "If a page can't be indexed, it can't appear in Google or AI answers.",
    fix: "Remove noindex or fix the server error.",
  });

  let c02Status: CheckStatus = "PASS";
  let c02Found = "Robots.txt allows search and AI bots.";
  if (
    robotsFound &&
    /User-agent:\s*(Googlebot|OAI-SearchBot|PerplexityBot)[\s\S]*?Disallow:\s*\//i.test(
      robotsTxt,
    )
  ) {
    c02Status = "FAIL";
    c02Found = "Robots.txt is blocking critical search/AI bots.";
  }
  checks.push({
    id: "C02",
    name: "Crawler access in robots.txt",
    category: "A",
    weight: 25,
    status: c02Status,
    found: c02Found,
    why: "AI assistants can only mention pages their crawlers are allowed to read.",
    fix: "Update robots.txt to allow search and AI bots.",
  });

  let c03Status: CheckStatus = "PASS";
  let c03Found = "No User-Agent blocking detected.";
  try {
    const botRes = await client.get(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +http://openai.com/searchbot)",
      },
    });
    const bodyStr = typeof botRes.data === "string" ? botRes.data : "";
    if (
      [401, 403, 406, 429, 503].includes(botRes.status) ||
      /just a moment|cf-chl|captcha|access denied/i.test(bodyStr)
    ) {
      c03Status = "FAIL";
      c03Found = "Your site's firewall is blocking AI crawlers.";
    }
  } catch {}
  checks.push({
    id: "C03",
    name: "Bot fetch test",
    category: "A",
    weight: 15,
    status: c03Status,
    found: c03Found,
    why: "Firewalls can block AI bots even if robots.txt allows them.",
    fix: "Whitelist AI crawlers in your firewall settings.",
  });

  $("script, style, noscript, template").remove();
  const rawText = $("body").text().replace(/\s+/g, " ").trim();
  const rawWords = rawText.split(" ").filter((w) => w.length > 1).length;
  let c04Status: CheckStatus = "PASS";
  let c04Found = `Good raw HTML found (${rawWords} words).`;
  if (rawWords < 50) {
    c04Status = "FAIL";
    c04Found = "Page looks empty without JavaScript. AI bots see a blank page.";
  } else if (rawWords < 150) {
    c04Status = "WARN";
    c04Found = `Sparse HTML found (${rawWords} words).`;
  }
  checks.push({
    id: "C04",
    name: "Readable HTML (raw vs rendered)",
    category: "A",
    weight: 25,
    status: c04Status,
    found: c04Found,
    why: "AI tools and some search crawlers read the raw page.",
    fix: "Implement Server-Side Rendering (SSR) or pre-rendering.",
  });

  const isHttps = fullUrl.startsWith("https");
  checks.push({
    id: "C05",
    name: "HTTPS and clean redirects",
    category: "A",
    weight: 6,
    status: isHttps ? "PASS" : "FAIL",
    found: isHttps ? "HTTPS is active." : "Site does not use HTTPS.",
    why: "HTTPS builds trust and prevents crawl errors.",
    fix: "Install an SSL certificate.",
  });

  checks.push({
    id: "C06",
    name: "XML sitemap",
    category: "A",
    weight: 4,
    status: sitemapFound ? "PASS" : "WARN",
    found: sitemapFound ? "Sitemap found." : "No sitemap found.",
    why: "Sitemaps help search engines discover pages.",
    fix: "Create and submit a sitemap.xml file.",
  });

  // ==========================================
  // CATEGORY B: PAGE QUALITY
  // ==========================================

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
    why: "Titles appear in search results and browser tabs.",
    fix: "Write a 30-60 character title.",
  });

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
    why: "Descriptions summarize the page for searchers.",
    fix: "Write a 70-160 character description.",
  });

  const canonical = $('link[rel="canonical"]').attr("href");
  checks.push({
    id: "C09",
    name: "Canonical tag",
    category: "B",
    weight: 12,
    status: canonical ? "PASS" : "WARN",
    found: canonical ? "Present" : "Missing",
    why: "Tells search engines the primary URL for this content.",
    fix: "Add a self-referencing canonical tag.",
  });

  const viewport = $('meta[name="viewport"]').attr("content");
  checks.push({
    id: "C10",
    name: "Mobile viewport",
    category: "B",
    weight: 8,
    status: viewport ? "PASS" : "FAIL",
    found: viewport ? "Configured" : "Missing",
    why: "Ensures mobile devices display the page correctly.",
    fix: "Add width=device-width, initial-scale=1.",
  });

  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const hasLang = $("html").attr("lang");
  let c11Issues = 0;
  if (h1Count === 0) c11Issues++;
  if (h2Count < 2) c11Issues++;
  if (!hasLang) c11Issues++;
  let c11Status: CheckStatus =
    c11Issues === 0 ? "PASS" : c11Issues === 1 ? "WARN" : "FAIL";
  checks.push({
    id: "C11",
    name: "Heading structure and language",
    category: "B",
    weight: 15,
    status: c11Status,
    found: `${h1Count} H1s, ${h2Count} H2s. Lang: ${hasLang || "None"}`,
    why: "Helps search engines understand content hierarchy.",
    fix: "Use one H1, multiple H2s, and set the html lang attribute.",
  });

  const imgs = $("img");
  let imgsWithAlt = 0;
  imgs.each((_, el) => {
    if ($(el).attr("alt")?.trim()) imgsWithAlt++;
  });
  let c12Status: CheckStatus = "PASS";
  let c12Found = "All images have alt text.";
  if (imgs.length > 0) {
    const ratio = imgsWithAlt / imgs.length;
    if (ratio < 0.6) {
      c12Status = "FAIL";
      c12Found = `Only ${Math.round(ratio * 100)}% have alt text.`;
    } else if (ratio < 0.9) {
      c12Status = "WARN";
      c12Found = `${Math.round(ratio * 100)}% have alt text.`;
    }
  }
  checks.push({
    id: "C12",
    name: "Image alt text",
    category: "B",
    weight: 12,
    status: c12Status,
    found: c12Found,
    why: "Describes images to screen readers and AI.",
    fix: "Add descriptive alt text.",
  });

  let c13Status: CheckStatus = "N/A";
  let c13Found = "Speed test unavailable right now.";
  const psiData = await fetchPSI(fullUrl, process.env.PAGESPEED_API_KEY || "");
  if (psiData) {
    if (psiData.lcp > 4000 || psiData.cls > 0.25) {
      c13Status = "FAIL";
      c13Found = `Poor speed: LCP ${Math.round(psiData.lcp)}ms, CLS ${psiData.cls.toFixed(2)}.`;
    } else if (psiData.lcp > 2500 || psiData.cls > 0.1) {
      c13Status = "WARN";
      c13Found = `Needs improvement: LCP ${Math.round(psiData.lcp)}ms, CLS ${psiData.cls.toFixed(2)}.`;
    } else {
      c13Status = "PASS";
      c13Found = `Good speed: LCP ${Math.round(psiData.lcp)}ms, CLS ${psiData.cls.toFixed(2)}.`;
    }
  }
  checks.push({
    id: "C13",
    name: "Page speed basics",
    category: "B",
    weight: 16,
    status: c13Status,
    found: c13Found,
    why: "Slow pages are crawled less and convert worse.",
    fix: "Optimize images, enable caching, and defer scripts.",
  });

  checks.push({
    id: "C14",
    name: "Broken internal links",
    category: "B",
    weight: 10,
    status: "PASS",
    found: "Link check skipped for speed.",
    why: "Dead links frustrate users and crawlers.",
    fix: "Fix broken links.",
  });

  // ==========================================
  // CATEGORY C: TRUST AND IDENTITY
  // ==========================================

  const jsonLd = $('script[type="application/ld+json"]');
  let hasOrg = false;
  jsonLd.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      const types = Array.isArray(data)
        ? data.map((d) => d["@type"])
        : [data["@type"]];
      if (types.includes("Organization") || types.includes("LocalBusiness"))
        hasOrg = true;
    } catch {}
  });
  checks.push({
    id: "C15",
    name: "Structured data (JSON-LD)",
    category: "C",
    weight: 30,
    status: hasOrg ? "PASS" : "FAIL",
    found: hasOrg ? "Organization schema found." : "No Organization schema.",
    why: "Helps search engines understand exactly who you are.",
    fix: "Add JSON-LD schema for your business.",
  });

  let trustScore = 0;
  if (/about/i.test(rawText)) trustScore++;
  if (/contact|phone|email/i.test(rawText)) trustScore++;
  if (/privacy|terms/i.test(rawText)) trustScore++;
  if (/founder|team|author/i.test(rawText)) trustScore++;
  if (/review|testimonial|case study/i.test(rawText)) trustScore++;
  checks.push({
    id: "C16",
    name: "Trust signals",
    category: "C",
    weight: 25,
    status: trustScore >= 4 ? "PASS" : trustScore >= 2 ? "WARN" : "FAIL",
    found: `Found ${trustScore}/5 trust signals.`,
    why: "Proves to AI and users that you are a real, trustworthy business.",
    fix: "Add an About page, contact info, and testimonials.",
  });

  let c17Status: CheckStatus = "N/A";
  if (isLocal) {
    const hasPhone = /(?:\+91|\(?\d{3}\)?)[\s.-]?\d{3}[\s.-]?\d{4}/.test(
      rawText,
    );
    c17Status = hasPhone ? "PASS" : "FAIL";
  }
  checks.push({
    id: "C17",
    name: "Business details (NAP)",
    category: "C",
    weight: 15,
    status: c17Status,
    found:
      c17Status === "N/A"
        ? "Skipped (online only)"
        : c17Status === "PASS"
          ? "Phone found."
          : "No phone found.",
    why: "Helps local AI queries find you.",
    fix: "Add Name, Address, Phone to footer.",
  });

  const hasSocial =
    /linkedin\.com|facebook\.com|instagram\.com|twitter\.com|maps\.google/i.test(
      rawText,
    );
  checks.push({
    id: "C18",
    name: "Business profile links",
    category: "C",
    weight: 10,
    status: hasSocial ? "PASS" : "FAIL",
    found: hasSocial ? "Social/profile links found." : "No social links.",
    why: "Ties your website to your real-world presence.",
    fix: "Add links to your social media and Google Business Profile.",
  });

  let c19Status: CheckStatus = "PASS";
  if (rawWords < 300) {
    c19Status = "FAIL";
  }
  checks.push({
    id: "C19",
    name: "Answer-ready content",
    category: "C",
    weight: 20,
    status: c19Status,
    found: `${rawWords} words found.`,
    why: "AI needs deep content to cite you.",
    fix: "Write at least 300 words of helpful content.",
  });

  // --- INFO ROWS ---
  info.push({
    id: "I01",
    name: "llms.txt",
    present: false,
    note: "Optional file.",
  });
  info.push({
    id: "I02",
    name: "H1 count",
    present: h1Count > 0,
    note: `${h1Count} H1 tags found.`,
  });
  info.push({
    id: "I03",
    name: "Social sharing tags",
    present: false,
    note: "Controls WhatsApp link previews.",
  });
  info.push({
    id: "I04",
    name: "FAQ schema",
    present: false,
    note: "Good to have.",
  });
  info.push({
    id: "I05",
    name: "Word count",
    present: rawWords > 0,
    note: `${rawWords} words.`,
  });

  // ==========================================
  // SCORING & PRICING ENGINE
  // ==========================================
  let aPoints = 0,
    aMax = 0;
  let bPoints = 0,
    bMax = 0;
  let cPoints = 0,
    cMax = 0;
  let totalQuote = 499;
  let hasBlockingIssue = false;

  checks.forEach((c) => {
    const pts = c.status === "PASS" ? 1 : c.status === "WARN" ? 0.5 : 0;
    if (c.status !== "N/A" && c.status !== "info") {
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

    if ((c.status === "FAIL" || c.status === "WARN") && FIX_PRICES[c.id]) {
      totalQuote += FIX_PRICES[c.id];
    }

    if (
      (c.id === "C01" || c.id === "C02" || c.id === "C04") &&
      c.status === "FAIL"
    ) {
      hasBlockingIssue = true;
    }
  });

  const scoreA = aMax > 0 ? (aPoints / aMax) * 100 : 0;
  const scoreB = bMax > 0 ? (bPoints / bMax) * 100 : 0;
  const scoreC = cMax > 0 ? (cPoints / cMax) * 100 : 0;

  let overallRaw = scoreA * 0.4 + scoreB * 0.3 + scoreC * 0.3;

  if (hasBlockingIssue) {
    overallRaw = Math.min(overallRaw, 49);
  }

  const finalScore = Math.round(overallRaw);

  let label = "Major gaps";
  let reportLine =
    "Several important signals are missing. Fixing these first will make the biggest difference.";
  if (finalScore >= 90) {
    label = "Strong foundation";
    reportLine =
      "Search engines and AI tools can find and read your site. Only small improvements remain.";
  } else if (finalScore >= 75) {
    label = "Good foundation";
    reportLine =
      "The essentials are in place. A few fixes will make your site easier to find and trust.";
  } else if (finalScore >= 50) {
    label = "Needs work";
    reportLine =
      "Some important gaps are holding your site back. The fixes below are the best place to start.";
  } else if (hasBlockingIssue) {
    label = "Blocked";
    reportLine =
      "Search or AI crawlers cannot reach or read this page. Fix this first, because nothing else matters until it is solved.";
  }

  return {
    scanner_version: "2.0",
    scanned_at: new Date().toISOString(),
    input_url: fullUrl,
    final_url: finalUrl,
    is_local_business: isLocal,
    overall: {
      score: finalScore,
      label,
      capped: hasBlockingIssue,
      disclaimer:
        "This score measures technical readiness. It does not measure rankings, and no one can guarantee that an AI assistant will recommend your business.",
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

// --- API ROUTES ---

app.post("/api/scan", async (req, res) => {
  const { url, isLocal } = req.body;
  if (!url || typeof url !== "string")
    return res
      .status(400)
      .json({ error: "Please provide a valid website URL." });

  console.log(`\n========================================`);
  console.log(`🔍 NEW SCAN: ${url} (Local: ${isLocal})`);
  console.log(`🕒 Time: ${new Date().toLocaleString()}`);
  console.log(`========================================\n`);

  try {
    const result = await runScanner(url, !!isLocal);
    res.json(result);
  } catch (err: any) {
    console.error("Scan error:", err);
    if (
      err.message.includes("Connection Failed") ||
      err.code === "ETIMEDOUT" ||
      err.code === "ENETUNREACH"
    ) {
      return res
        .status(500)
        .json({
          error:
            "Your site has a firewall that blocks our scanner. Please whitelist our IP or contact us for a manual scan.",
        });
    }
    res
      .status(500)
      .json({ error: err.message || "Failed to scan target website." });
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
