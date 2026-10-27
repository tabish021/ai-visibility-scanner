import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- SCANNER LOGIC ---
// (I've kept your scanner logic exactly the same, just shorter for this snippet)
export type CheckCategory = "SEO" | "GEO" | "AEO";
export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckItem {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  detail: string;
  fixTip: string;
  fixCode?: string;
}

export interface ScanResult {
  url: string;
  domain: string;
  scannedAt: string;
  loadTimeMs: number;
  score: number;
  grade: string;
  gradeDescription: string;
  summary: { total: number; pass: number; warn: number; fail: number };
  categories: {
    seo: { checks: CheckItem[]; score: number; maxScore: number };
    geo: { checks: CheckItem[]; score: number; maxScore: number };
    aeo: { checks: CheckItem[]; score: number; maxScore: number };
  };
  checks: CheckItem[];
  metadata: {
    title: string;
    description: string;
    wordCount: number;
    headingsCount: { h1: number; h2: number };
    imagesCount: { total: number; withAlt: number };
    linksCount: { total: number; tested: number; broken: number };
    hasSchema: boolean;
    hasRobots: boolean;
    hasLlmsTxt: boolean;
  };
}

function normalizeUrl(input: string): URL {
  let cleaned = input.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }
  return new URL(cleaned);
}

async function testLink(href: string, baseUrl: string): Promise<boolean> {
  try {
    const resolved = new URL(href, baseUrl).toString();
    const res = await axios.get(resolved, {
      timeout: 3500,
      maxRedirects: 3,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIVisibilityBot/1.0; +https://aivisibilityscanner.app)",
      },
      validateStatus: (status) => status < 400,
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

async function runScanner(targetUrl: string): Promise<ScanResult> {
  const parsedUrl = normalizeUrl(targetUrl);
  const fullUrl = parsedUrl.toString();
  const domain = parsedUrl.hostname;
  const origin = parsedUrl.origin;

  const client = axios.create({
    timeout: 9000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; AIVisibilityBot/1.0)",
    },
    maxRedirects: 5,
    validateStatus: () => true,
  });

  let html = "";
  const startTime = Date.now();

  try {
    const pageRes = await client.get(fullUrl);
    html =
      typeof pageRes.data === "string"
        ? pageRes.data
        : JSON.stringify(pageRes.data);
  } catch (err: any) {
    throw new Error(
      `Could not connect to ${domain}: ${err.message || "Connection timed out or host unreachable"}`,
    );
  }

  const loadTimeMs = Date.now() - startTime;
  const $ = cheerio.load(html);

  let llmsTxtFound = false;
  let llmsTxtContent = "";
  let robotsTxtContent = "";
  let robotsTxtFound = false;

  const [llmsRes, robotsRes] = await Promise.allSettled([
    client.get(`${origin}/llms.txt`),
    client.get(`${origin}/robots.txt`),
  ]);

  if (
    llmsRes.status === "fulfilled" &&
    llmsRes.value.status === 200 &&
    typeof llmsRes.value.data === "string" &&
    llmsRes.value.data.trim().length > 10
  ) {
    llmsTxtFound = true;
    llmsTxtContent = llmsRes.value.data;
  }

  if (
    robotsRes.status === "fulfilled" &&
    robotsRes.value.status === 200 &&
    typeof robotsRes.value.data === "string"
  ) {
    robotsTxtFound = true;
    robotsTxtContent = robotsRes.value.data;
  }

  const rawBodyText = $("body").text().replace(/\s+/g, " ").trim();
  const rawBodyLength = rawBodyText.length;
  const hasRootDiv =
    html.includes('id="root"') ||
    html.includes('id="__next"') ||
    html.includes('id="app"');

  const cleanContentText = $(
    "p, h1, h2, h3, h4, h5, h6, li, article, section, main, td, th, blockquote",
  )
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const wordsArray = cleanContentText.split(" ").filter((w) => w.length > 1);
  const wordCount = wordsArray.length;

  const h1Tags = $("h1");
  const h1Count = h1Tags.length;
  const firstH1 = h1Tags.first().text().replace(/\s+/g, " ").trim();
  const h2Count = $("h2").length;

  const imgElements = $("img");
  const totalImgs = imgElements.length;
  let imgsWithAlt = 0;
  imgElements.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.trim().length > 0) imgsWithAlt++;
  });

  const jsonLdScripts = $('script[type="application/ld+json"]');
  const jsonLdCount = jsonLdScripts.length;
  let hasLocalBusiness = false;
  let localBusinessTypeFound = "";
  let hasFaqSchema = false;

  jsonLdScripts.each((_, el) => {
    try {
      const rawJson = $(el).contents().text();
      if (!rawJson) return;
      const parsed = JSON.parse(rawJson);
      const examine = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        const type = obj["@type"];
        if (typeof type === "string") {
          if (
            /(LocalBusiness|Store|Restaurant|ProfessionalService|Organization|MedicalBusiness|FinancialService|Dentist|Plumber|RealEstateAgent)/i.test(
              type,
            )
          ) {
            hasLocalBusiness = true;
            localBusinessTypeFound = type;
          }
          if (/FAQPage/i.test(type)) hasFaqSchema = true;
        } else if (Array.isArray(type)) {
          type.forEach((t) => {
            if (
              /(LocalBusiness|Store|Restaurant|ProfessionalService|Organization)/i.test(
                t,
              )
            ) {
              hasLocalBusiness = true;
              localBusinessTypeFound = t;
            }
            if (/FAQPage/i.test(t)) hasFaqSchema = true;
          });
        }
        if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(examine);
      };
      if (Array.isArray(parsed)) parsed.forEach(examine);
      else examine(parsed);
    } catch {}
  });

  const candidateHrefs: string[] = [];
  $("a[href]").each((_, el) => {
    if (candidateHrefs.length >= 5) return;
    const href = $(el).attr("href")?.trim();
    if (
      href &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:") &&
      !href.startsWith("javascript:")
    )
      candidateHrefs.push(href);
  });

  const linkResults = await Promise.all(
    candidateHrefs.map((href) => testLink(href, origin)),
  );
  const brokenLinksCount = linkResults.filter((ok) => !ok).length;

  const checks: CheckItem[] = [];

  // SEO Checks
  const rawTitle = $("title").first().text().replace(/\s+/g, " ").trim();
  checks.push({
    id: "seo-title",
    name: "Title Tag Exists",
    category: "SEO",
    status: !rawTitle ? "fail" : rawTitle.length < 10 ? "warn" : "pass",
    detail: !rawTitle
      ? "No <title> tag found."
      : rawTitle.length < 10
        ? `Title is too short (${rawTitle.length} chars).`
        : `Optimal title: "${rawTitle}" (${rawTitle.length} chars).`,
    fixTip: "Add a descriptive <title> tag between 40-60 characters.",
    fixCode: `<title>${domain} - Leading Solutions</title>`,
  });
  checks.push({
    id: "seo-h1",
    name: "Single H1 Heading",
    category: "SEO",
    status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
    detail:
      h1Count === 1
        ? `Found exactly one H1: "${firstH1.slice(0, 50)}..."`
        : h1Count === 0
          ? "No H1 tag found."
          : `Found ${h1Count} H1 tags.`,
    fixTip: "Wrap your main headline in a single <h1> tag.",
    fixCode: `<h1>Transform Your Workflow</h1>`,
  });
  checks.push({
    id: "seo-h2",
    name: "H2 Subheadings Present",
    category: "SEO",
    status: h2Count >= 1 ? "pass" : "fail",
    detail:
      h2Count >= 1 ? `Found ${h2Count} H2 subheadings.` : "No H2 tags found.",
    fixTip: "Divide page content into distinct topic blocks using <h2> tags.",
    fixCode: `<h2>Key Features</h2>`,
  });
  const canonicalHref = $('link[rel="canonical"]').attr("href")?.trim();
  checks.push({
    id: "seo-canonical",
    name: "Canonical Tag Declared",
    category: "SEO",
    status:
      canonicalHref && canonicalHref.startsWith("http")
        ? "pass"
        : canonicalHref
          ? "warn"
          : "fail",
    detail: canonicalHref
      ? `Canonical URL: ${canonicalHref}`
      : "Canonical tag missing.",
    fixTip: "Add a self-referencing canonical tag in the <head>.",
    fixCode: `<link rel="canonical" href="${origin}/" />`,
  });
  const viewportContent = $('meta[name="viewport"]').attr("content")?.trim();
  checks.push({
    id: "seo-viewport",
    name: "Mobile Viewport Meta Tag",
    category: "SEO",
    status:
      viewportContent && viewportContent.toLowerCase().includes("width=")
        ? "pass"
        : "fail",
    detail: viewportContent
      ? `Viewport: "${viewportContent}"`
      : "Missing viewport meta tag.",
    fixTip: "Include standard viewport meta tag.",
    fixCode: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
  });

  // GEO Checks
  checks.push({
    id: "geo-spa-shell",
    name: "Raw HTML Content Visibility",
    category: "GEO",
    status:
      rawBodyLength < 200 && hasRootDiv
        ? "fail"
        : rawBodyLength < 350
          ? "warn"
          : "pass",
    detail:
      rawBodyLength < 200 && hasRootDiv
        ? "SPA Shell detected! AI bots see a blank page."
        : `Rich raw HTML detected (${rawBodyLength} chars).`,
    fixTip:
      "Implement Server-Side Rendering (SSR) or Static Site Generation (SSG).",
    fixCode: `// Use vite-plugin-prerender`,
  });
  checks.push({
    id: "geo-llms-txt",
    name: "llms.txt AI Knowledge File",
    category: "GEO",
    status: llmsTxtFound ? "pass" : "fail",
    detail: llmsTxtFound
      ? `llms.txt is live at /llms.txt.`
      : "llms.txt is missing (404).",
    fixTip: "Deploy an /llms.txt file at the root.",
    fixCode: `# ${domain} - LLM Context File`,
  });
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim();
  checks.push({
    id: "geo-og-tags",
    name: "OpenGraph Rich Media Tags",
    category: "GEO",
    status: ogTitle && ogImage ? "pass" : ogTitle || ogImage ? "warn" : "fail",
    detail:
      ogTitle && ogImage
        ? `Both og:title and og:image configured.`
        : "Missing og:title or og:image.",
    fixTip: "Add OpenGraph metadata to your <head>.",
    fixCode: `<meta property="og:title" content="${rawTitle || domain}" />`,
  });
  checks.push({
    id: "geo-img-alt",
    name: "Image Alt Text Coverage",
    category: "GEO",
    status:
      totalImgs === 0
        ? "pass"
        : imgsWithAlt / totalImgs > 0.5
          ? "pass"
          : "fail",
    detail:
      totalImgs === 0
        ? "No images found."
        : `${Math.round((imgsWithAlt / totalImgs) * 100)}% of images have alt text.`,
    fixTip: "Add descriptive alt text to all informative images.",
    fixCode: `<img src="chart.png" alt="Annual customer growth graph" />`,
  });
  checks.push({
    id: "geo-word-count",
    name: "Substantive Word Count",
    category: "GEO",
    status: wordCount >= 300 ? "pass" : wordCount >= 180 ? "warn" : "fail",
    detail: `Page contains ${wordCount} words.`,
    fixTip: "Expand content with descriptive copy to reach 300+ words.",
    fixCode: `<!-- Add 2-3 detailed paragraphs -->`,
  });
  const authorKeywords =
    /(about us|our team|meet the team|founder|co-founder|leadership|author|written by|reviewed by|about the company)/i;
  const hasAboutLink =
    $("a").filter((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text() || "";
      return (
        /about|team|founder|leadership|who-we-are/i.test(href) ||
        authorKeywords.test(text)
      );
    }).length > 0;
  const hasTrustInBody = authorKeywords.test(cleanContentText);
  checks.push({
    id: "geo-trust-signals",
    name: "Author & E-E-A-T Trust Signals",
    category: "GEO",
    status: hasAboutLink || hasTrustInBody ? "pass" : "fail",
    detail:
      hasAboutLink || hasTrustInBody
        ? "Detected explicit trust markers."
        : "No Author, Founder, or About Us references found.",
    fixTip: 'Add an "About Us" link and include author bylines.',
    fixCode: `<div class="author-attribution"><p>Published by <strong>Founder</strong></p></div>`,
  });

  // AEO Checks
  checks.push({
    id: "aeo-json-ld",
    name: "JSON-LD Structured Data Schema",
    category: "AEO",
    status: jsonLdCount > 0 ? "pass" : "fail",
    detail:
      jsonLdCount > 0
        ? `Found ${jsonLdCount} JSON-LD blocks.`
        : "No JSON-LD found.",
    fixTip: "Inject a JSON-LD structured data block.",
    fixCode: `<script type="application/ld+json">...</script>`,
  });
  checks.push({
    id: "aeo-local-business",
    name: "LocalBusiness / Org Schema",
    category: "AEO",
    status: hasLocalBusiness ? "pass" : "fail",
    detail: hasLocalBusiness
      ? `Local entity schema detected: "${localBusinessTypeFound}"`
      : "Missing LocalBusiness schema.",
    fixTip: "Add LocalBusiness JSON-LD markup.",
    fixCode: `<script type="application/ld+json">...</script>`,
  });
  const hasFaqText =
    /(frequently asked questions|faq\b|q&a\b|common questions)/i.test(
      cleanContentText,
    );
  checks.push({
    id: "aeo-faq",
    name: "FAQ Content & FAQPage Schema",
    category: "AEO",
    status:
      hasFaqSchema && hasFaqText
        ? "pass"
        : hasFaqSchema || hasFaqText
          ? "warn"
          : "fail",
    detail:
      hasFaqSchema && hasFaqText
        ? "Both FAQPage schema and text found."
        : hasFaqSchema
          ? "Schema exists, but no text."
          : hasFaqText
            ? "Text found, but no schema."
            : "No FAQ content found.",
    fixTip: "Add a FAQ section with structured FAQPage schema.",
    fixCode: `<section id="faq">...</section>`,
  });
  if (!robotsTxtFound) {
    checks.push({
      id: "aeo-robots-ai",
      name: "Robots.txt AI Permissions",
      category: "AEO",
      status: "warn",
      detail: "robots.txt not found (404).",
      fixTip: "Deploy a robots.txt file welcoming AI crawlers.",
      fixCode: `User-agent: GPTBot\nAllow: /`,
    });
  } else {
    const isGptBotBlocked = /User-agent:\s*GPTBot[\s\S]*?Disallow:\s*\//i.test(
      robotsTxtContent,
    );
    const isPerplexityBlocked =
      /User-agent:\s*PerplexityBot[\s\S]*?Disallow:\s*\//i.test(
        robotsTxtContent,
      );
    checks.push({
      id: "aeo-robots-ai",
      name: "Robots.txt AI Permissions",
      category: "AEO",
      status: isGptBotBlocked || isPerplexityBlocked ? "fail" : "pass",
      detail:
        isGptBotBlocked || isPerplexityBlocked
          ? "AI crawlers are blocked!"
          : "AI crawlers permitted.",
      fixTip: "Remove Disallow rules for AI bots.",
      fixCode: `User-agent: GPTBot\nAllow: /`,
    });
  }
  const phoneRegex =
    /(?:\+91[\s.-]?[6-9]\d{9}|\b[6-9]\d{9}\b|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i;
  const addressRegex =
    /(address|location|headquarters|office location|our studio|pincode)/i;
  const hasPhone = phoneRegex.test(html);
  const hasAddress = addressRegex.test(html);
  checks.push({
    id: "aeo-nap",
    name: "NAP (Name, Address, Phone)",
    category: "AEO",
    status:
      hasPhone && hasAddress
        ? "pass"
        : hasPhone || hasAddress
          ? "warn"
          : "fail",
    detail:
      hasPhone && hasAddress
        ? "Complete NAP indicators detected."
        : "Incomplete NAP signals.",
    fixTip:
      "Ensure both a standard telephone number and full address appear in footer.",
    fixCode: `<footer><p><strong>Address:</strong> 123 Innovation Boulevard</p></footer>`,
  });
  checks.push({
    id: "aeo-broken-links",
    name: "Broken Navigation Links",
    category: "AEO",
    status:
      brokenLinksCount === 0
        ? "pass"
        : brokenLinksCount === 1
          ? "warn"
          : "fail",
    detail:
      brokenLinksCount === 0
        ? `Verified ${candidateHrefs.length} links.`
        : `${brokenLinksCount} broken links found.`,
    fixTip: "Fix or redirect broken hyperlinks.",
    fixCode: `<!-- Update <a href="..."> to valid URLs -->`,
  });

  let passCount = 0,
    warnCount = 0,
    failCount = 0;
  checks.forEach((c) => {
    if (c.status === "pass") passCount++;
    else if (c.status === "warn") warnCount++;
    else failCount++;
  });

  const rawScore = passCount * (100 / 17) + warnCount * (50 / 17);
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let grade = "Invisible to AI";
  let gradeDescription =
    "Critical gaps prevent AI search engines from indexing your brand.";
  if (finalScore >= 85) {
    grade = "AI-Optimized";
    gradeDescription =
      "High visibility! AI can easily read and cite your content.";
  } else if (finalScore >= 60) {
    grade = "Partially Visible";
    gradeDescription =
      "Some AI crawlers can read content, but triggers are missing.";
  }

  const seoChecks = checks.filter((c) => c.category === "SEO");
  const geoChecks = checks.filter((c) => c.category === "GEO");
  const aeoChecks = checks.filter((c) => c.category === "AEO");
  const calcCatScore = (items: CheckItem[]) =>
    Math.round(
      (items.filter((i) => i.status === "pass").length * 100 +
        items.filter((i) => i.status === "warn").length * 50) /
        items.length,
    );

  return {
    url: fullUrl,
    domain,
    scannedAt: new Date().toISOString(),
    loadTimeMs,
    score: finalScore,
    grade,
    gradeDescription,
    summary: { total: 17, pass: passCount, warn: warnCount, fail: failCount },
    categories: {
      seo: { checks: seoChecks, score: calcCatScore(seoChecks), maxScore: 100 },
      geo: { checks: geoChecks, score: calcCatScore(geoChecks), maxScore: 100 },
      aeo: { checks: aeoChecks, score: calcCatScore(aeoChecks), maxScore: 100 },
    },
    checks,
    metadata: {
      title: rawTitle,
      description: $('meta[name="description"]').attr("content") || "",
      wordCount,
      headingsCount: { h1: h1Count, h2: h2Count },
      imagesCount: { total: totalImgs, withAlt: imgsWithAlt },
      linksCount: {
        total: candidateHrefs.length,
        tested: candidateHrefs.length,
        broken: brokenLinksCount,
      },
      hasSchema: jsonLdCount > 0,
      hasRobots: robotsTxtFound,
      hasLlmsTxt: llmsTxtFound,
    },
  };
}

// --- API ROUTES ---

app.post("/api/scan", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string")
    return res
      .status(400)
      .json({ error: "Please provide a valid website URL." });

  // LOG 1: WHO SCANNED WHAT
  console.log(`\n========================================`);
  console.log(`🔍 NEW SCAN: ${url}`);
  console.log(`🕒 Time: ${new Date().toLocaleString()}`);
  console.log(`========================================\n`);

  try {
    const result = await runScanner(url);
    res.json(result);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: err.message || "Failed to scan target website." });
  }
});

// NEW ENDPOINT: Catch the email leads
app.post("/api/lead", (req, res) => {
  const { email, domain } = req.body;

  // LOG 2: WHO DOWNLOADED THE REPORT
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
