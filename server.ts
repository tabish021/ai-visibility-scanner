import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Category types
export type CheckCategory = 'SEO' | 'GEO' | 'AEO';
export type CheckStatus = 'pass' | 'warn' | 'fail';

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
  score: number;
  grade: string;
  gradeDescription: string;
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
  };
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

// Helper to normalize and validate URL
function normalizeUrl(input: string): URL {
  let cleaned = input.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return new URL(cleaned);
}

// Helper to check links asynchronously with timeout
async function testLink(href: string, baseUrl: string): Promise<boolean> {
  try {
    const resolved = new URL(href, baseUrl).toString();
    const res = await axios.get(resolved, {
      timeout: 3500,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIVisibilityBot/1.0; +https://aivisibilityscanner.app)'
      },
      validateStatus: (status) => status < 400
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

// Scanner execution logic
async function runScanner(targetUrl: string): Promise<ScanResult> {
  const parsedUrl = normalizeUrl(targetUrl);
  const fullUrl = parsedUrl.toString();
  const domain = parsedUrl.hostname;
  const origin = parsedUrl.origin;

  // 1. Fetch Main Page HTML
  const client = axios.create({
    timeout: 9000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; AIVisibilityBot/1.0)'
    },
    maxRedirects: 5,
    validateStatus: () => true
  });

  let html = '';
  let httpStatus = 200;

  try {
    const pageRes = await client.get(fullUrl);
    httpStatus = pageRes.status;
    html = typeof pageRes.data === 'string' ? pageRes.data : JSON.stringify(pageRes.data);
  } catch (err: any) {
    throw new Error(`Could not connect to ${domain}: ${err.message || 'Connection timed out or host unreachable'}`);
  }

  const $ = cheerio.load(html);

  // 2. Fetch /llms.txt in parallel with /robots.txt
  let llmsTxtFound = false;
  let llmsTxtContent = '';
  let robotsTxtContent = '';
  let robotsTxtFound = false;

  const [llmsRes, robotsRes] = await Promise.allSettled([
    client.get(`${origin}/llms.txt`),
    client.get(`${origin}/robots.txt`)
  ]);

  if (llmsRes.status === 'fulfilled' && llmsRes.value.status === 200 && typeof llmsRes.value.data === 'string' && llmsRes.value.data.trim().length > 10) {
    llmsTxtFound = true;
    llmsTxtContent = llmsRes.value.data;
  }

  if (robotsRes.status === 'fulfilled' && robotsRes.value.status === 200 && typeof robotsRes.value.data === 'string') {
    robotsTxtFound = true;
    robotsTxtContent = robotsRes.value.data;
  }

  // Raw HTML body metrics
  const rawBodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const rawBodyLength = rawBodyText.length;
  const hasRootDiv = html.includes('id="root"') || html.includes('id="__next"') || html.includes('id="app"');

  // Word count extraction
  const cleanContentText = $('p, h1, h2, h3, h4, h5, h6, li, article, section, main, td, th, blockquote')
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  const wordsArray = cleanContentText.split(' ').filter(w => w.length > 1);
  const wordCount = wordsArray.length;

  // Headings
  const h1Tags = $('h1');
  const h1Count = h1Tags.length;
  const firstH1 = h1Tags.first().text().replace(/\s+/g, ' ').trim();

  const h2Tags = $('h2');
  const h2Count = h2Tags.length;

  // Images and Alt text
  const imgElements = $('img');
  const totalImgs = imgElements.length;
  let imgsWithAlt = 0;
  imgElements.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim().length > 0) {
      imgsWithAlt++;
    }
  });

  // Schema parsing
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const jsonLdCount = jsonLdScripts.length;
  let hasLocalBusiness = false;
  let localBusinessTypeFound = '';
  let hasFaqSchema = false;

  jsonLdScripts.each((_, el) => {
    try {
      const rawJson = $(el).contents().text();
      if (!rawJson) return;
      const parsed = JSON.parse(rawJson);
      const examine = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        const type = obj['@type'];
        if (typeof type === 'string') {
          if (/(LocalBusiness|Store|Restaurant|ProfessionalService|Organization|MedicalBusiness|FinancialService|Dentist|Plumber|RealEstateAgent)/i.test(type)) {
            hasLocalBusiness = true;
            localBusinessTypeFound = type;
          }
          if (/FAQPage/i.test(type)) {
            hasFaqSchema = true;
          }
        } else if (Array.isArray(type)) {
          type.forEach(t => {
            if (/(LocalBusiness|Store|Restaurant|ProfessionalService|Organization)/i.test(t)) {
              hasLocalBusiness = true;
              localBusinessTypeFound = t;
            }
            if (/FAQPage/i.test(t)) hasFaqSchema = true;
          });
        }
        if (Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach(examine);
        }
      };
      if (Array.isArray(parsed)) parsed.forEach(examine);
      else examine(parsed);
    } catch {
      // Ignored malformed script
    }
  });

  // Broken links sampling: grab first 5 valid <a> tags
  const candidateHrefs: string[] = [];
  $('a[href]').each((_, el) => {
    if (candidateHrefs.length >= 5) return;
    const href = $(el).attr('href')?.trim();
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
      candidateHrefs.push(href);
    }
  });

  const linkResults = await Promise.all(
    candidateHrefs.map(href => testLink(href, origin))
  );
  const brokenLinksCount = linkResults.filter(ok => !ok).length;

  // Checks evaluation
  const checks: CheckItem[] = [];

  // =====================
  // SEO CHECKS (5)
  // =====================

  // 1. Title tag exists
  const rawTitle = $('title').first().text().replace(/\s+/g, ' ').trim();
  if (!rawTitle) {
    checks.push({
      id: 'seo-title',
      name: 'Title Tag Exists',
      category: 'SEO',
      status: 'fail',
      detail: 'No <title> tag found in HTML. Search engines and AI models use this as the primary anchor for content indexing.',
      fixTip: 'Add a descriptive <title> tag between 40-60 characters containing your brand and core value proposition.',
      fixCode: `<title>${domain} - Leading Solutions for Modern Teams</title>`
    });
  } else if (rawTitle.length < 10) {
    checks.push({
      id: 'seo-title',
      name: 'Title Tag Exists',
      category: 'SEO',
      status: 'warn',
      detail: `Title tag exists ("${rawTitle}") but is too short (${rawTitle.length} chars). Aim for 40 to 60 characters for maximum search clarity.`,
      fixTip: 'Expand title with primary keyword and brand name.',
      fixCode: `<title>${rawTitle} | Comprehensive Services & Official Platform</title>`
    });
  } else {
    checks.push({
      id: 'seo-title',
      name: 'Title Tag Exists',
      category: 'SEO',
      status: 'pass',
      detail: `Optimal title detected: "${rawTitle}" (${rawTitle.length} characters).`,
      fixTip: 'Title tag is well-configured. Ensure it is refreshed whenever core positioning changes.'
    });
  }

  // 2. Exactly one H1 tag
  if (h1Count === 1) {
    checks.push({
      id: 'seo-h1',
      name: 'Single H1 Heading',
      category: 'SEO',
      status: 'pass',
      detail: `Found exactly one H1 tag: "${firstH1.slice(0, 70)}${firstH1.length > 70 ? '...' : ''}". Clear semantic anchor for crawlers.`,
      fixTip: 'Heading structure is semantically sound.'
    });
  } else if (h1Count === 0) {
    checks.push({
      id: 'seo-h1',
      name: 'Single H1 Heading',
      category: 'SEO',
      status: 'fail',
      detail: 'No H1 tag found on page. AI bots and search engines require a single primary H1 to identify the core topic.',
      fixTip: 'Wrap your main headline in a single <h1> tag.',
      fixCode: `<h1>Transform Your Workflow with ${domain}</h1>`
    });
  } else {
    checks.push({
      id: 'seo-h1',
      name: 'Single H1 Heading',
      category: 'SEO',
      status: 'warn',
      detail: `Found ${h1Count} H1 tags. Multiple H1 tags dilute topical authority and confuse AI entity extractors.`,
      fixTip: 'Consolidate headings so there is only one <h1>, and demote secondary headlines to <h2>.',
      fixCode: `<!-- Demote secondary H1s to H2 -->\n<h2>Secondary Section Topic</h2>`
    });
  }

  // 3. H2 tags exist (at least 1)
  if (h2Count >= 1) {
    checks.push({
      id: 'seo-h2',
      name: 'H2 Subheadings Present',
      category: 'SEO',
      status: 'pass',
      detail: `Found ${h2Count} H2 subheadings. This breaks content into digestable sections for LLM retrieval chunks.`,
      fixTip: 'Maintain logical section hierarchy with H2 and H3 tags.'
    });
  } else {
    checks.push({
      id: 'seo-h2',
      name: 'H2 Subheadings Present',
      category: 'SEO',
      status: 'fail',
      detail: 'No H2 tags found. AI bots require section headings (H2) to chunk content for RAG answer generation.',
      fixTip: 'Divide page content into distinct topic blocks using <h2> tags.',
      fixCode: `<h2>Key Features & Capabilities</h2>\n<h2>Why Industry Leaders Choose Us</h2>`
    });
  }

  // 4. Canonical tag exists
  const canonicalHref = $('link[rel="canonical"]').attr('href')?.trim();
  if (canonicalHref && canonicalHref.startsWith('http')) {
    checks.push({
      id: 'seo-canonical',
      name: 'Canonical Tag Declared',
      category: 'SEO',
      status: 'pass',
      detail: `Canonical URL declared: ${canonicalHref}. Prevents duplicate content confusion across mirrors.`,
      fixTip: 'Canonical tag is correctly pointed.'
    });
  } else if (canonicalHref) {
    checks.push({
      id: 'seo-canonical',
      name: 'Canonical Tag Declared',
      category: 'SEO',
      status: 'warn',
      detail: `Canonical tag exists ("${canonicalHref}") but is a relative path. An absolute HTTPS URL is strongly recommended.`,
      fixTip: 'Use full absolute HTTPS URL in the canonical tag.',
      fixCode: `<link rel="canonical" href="${origin}${canonicalHref.startsWith('/') ? '' : '/'}${canonicalHref}" />`
    });
  } else {
    checks.push({
      id: 'seo-canonical',
      name: 'Canonical Tag Declared',
      category: 'SEO',
      status: 'fail',
      detail: 'Canonical tag is missing. AI crawlers may index duplicate URLs or query strings.',
      fixTip: 'Add a self-referencing canonical tag in the <head>.',
      fixCode: `<link rel="canonical" href="${origin}/" />`
    });
  }

  // 5. Viewport meta tag exists (mobile friendly)
  const viewportContent = $('meta[name="viewport"]').attr('content')?.trim();
  if (viewportContent && viewportContent.toLowerCase().includes('width=')) {
    checks.push({
      id: 'seo-viewport',
      name: 'Mobile Viewport Meta Tag',
      category: 'SEO',
      status: 'pass',
      detail: `Mobile viewport configured: "${viewportContent}". Mobile-friendly pages are prioritized in AI answers.`,
      fixTip: 'Viewport is optimized for mobile crawlers.'
    });
  } else {
    checks.push({
      id: 'seo-viewport',
      name: 'Mobile Viewport Meta Tag',
      category: 'SEO',
      status: 'fail',
      detail: 'Missing standard mobile viewport meta tag. Non-responsive pages receive lower ranking in AI mobile overviews.',
      fixTip: 'Include standard viewport meta tag in your HTML <head>.',
      fixCode: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
    });
  }

  // =====================
  // GEO CHECKS (6) - Generative Engine Optimization
  // =====================

  // 6. Content visible in raw HTML (SPA Shell check)
  if (rawBodyLength < 200 && hasRootDiv) {
    checks.push({
      id: 'geo-spa-shell',
      name: 'Raw HTML Content Visibility (SPA Shell)',
      category: 'GEO',
      status: 'fail',
      detail: `SPA Shell detected! Raw HTML body has only ${rawBodyLength} characters with a client-render container (#root). AI crawlers (GPTBot, ClaudeBot) do not execute heavy JS and will see a blank page!`,
      fixTip: 'Implement Server-Side Rendering (SSR), Static Site Generation (SSG), or Pre-rendering so raw HTML contains readable text without JavaScript.',
      fixCode: `// Example Vite SSG / Pre-render configuration:\n// Use vite-plugin-prerender or Next.js static export so crawlers receive full static HTML.`
    });
  } else if (rawBodyLength < 350) {
    checks.push({
      id: 'geo-spa-shell',
      name: 'Raw HTML Content Visibility (SPA Shell)',
      category: 'GEO',
      status: 'warn',
      detail: `Sparse raw HTML body text (${rawBodyLength} characters). Ensure critical content is rendered in initial HTML rather than loaded asynchronously.`,
      fixTip: 'Pre-render page templates to serve static paragraph copy directly in HTML.',
      fixCode: `<!-- Ensure main copy exists directly in server response -->\n<p>Comprehensive description of ${domain} services...</p>`
    });
  } else {
    checks.push({
      id: 'geo-spa-shell',
      name: 'Raw HTML Content Visibility (SPA Shell)',
      category: 'GEO',
      status: 'pass',
      detail: `Rich raw HTML detected (${rawBodyLength} characters of pre-rendered body text). AI bots can immediately parse and ingest content without running JavaScript.`,
      fixTip: 'Excellent server-side content delivery.'
    });
  }

  // 7. llms.txt exists
  if (llmsTxtFound) {
    checks.push({
      id: 'geo-llms-txt',
      name: 'llms.txt AI Knowledge File',
      category: 'GEO',
      status: 'pass',
      detail: `llms.txt file is live and accessible at /llms.txt (${llmsTxtContent.length} bytes). Perplexity, Claude, and ChatGPT can parse your curated site structure.`,
      fixTip: 'Keep llms.txt updated with links to your core documentation and API summaries.'
    });
  } else {
    checks.push({
      id: 'geo-llms-txt',
      name: 'llms.txt AI Knowledge File',
      category: 'GEO',
      status: 'fail',
      detail: 'llms.txt is missing (returned 404). llms.txt is the new open standard created for LLMs to read site summary, markdown files, and key documentation.',
      fixTip: 'Deploy an /llms.txt file at the root of your domain following the llms.txt specification.',
      fixCode: `# ${domain} - LLM Context File\n> Concise summary of what ${domain} does.\n\n## Core Services\n- [About Us](/about): Company overview\n- [Features](/features): Complete platform breakdown\n- [Pricing](/pricing): Transparent tier details`
    });
  }

  // 8. OG Tags (og:title and og:image exist)
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || $('meta[name="og:title"]').attr('content')?.trim();
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || $('meta[name="og:image"]').attr('content')?.trim();
  if (ogTitle && ogImage) {
    checks.push({
      id: 'geo-og-tags',
      name: 'OpenGraph Rich Media Tags',
      category: 'GEO',
      status: 'pass',
      detail: `Both og:title ("${ogTitle.slice(0, 35)}...") and og:image configured. Enables rich preview cards in AI citations.`,
      fixTip: 'OpenGraph configuration is optimal.'
    });
  } else if (ogTitle || ogImage) {
    checks.push({
      id: 'geo-og-tags',
      name: 'OpenGraph Rich Media Tags',
      category: 'GEO',
      status: 'warn',
      detail: `Partial OpenGraph: ${ogTitle ? 'og:title present, but missing og:image preview' : 'og:image present, but missing og:title'}.`,
      fixTip: 'Provide both og:title and an absolute og:image URL (1200x630px recommended).',
      fixCode: `<meta property="og:title" content="${ogTitle || domain}" />\n<meta property="og:image" content="${origin}/og-preview.png" />`
    });
  } else {
    checks.push({
      id: 'geo-og-tags',
      name: 'OpenGraph Rich Media Tags',
      category: 'GEO',
      status: 'fail',
      detail: 'Missing both og:title and og:image tags. Modern AI search cards display thumbnail citations which require OpenGraph tags.',
      fixTip: 'Add OpenGraph metadata to your <head> section.',
      fixCode: `<meta property="og:title" content="${rawTitle || domain}" />\n<meta property="og:description" content="Official platform for ${domain}" />\n<meta property="og:image" content="${origin}/og-banner.jpg" />\n<meta property="og:url" content="${origin}" />`
    });
  }

  // 9. Image Alt Text (more than 50% of img tags have alt text)
  if (totalImgs === 0) {
    checks.push({
      id: 'geo-img-alt',
      name: 'Image Alt Text Coverage',
      category: 'GEO',
      status: 'pass',
      detail: 'No <img> elements found on page. No missing alt tags detected.',
      fixTip: 'Ensure any future images added include contextual alt descriptions.'
    });
  } else {
    const altRatio = (imgsWithAlt / totalImgs);
    const altPct = Math.round(altRatio * 100);
    if (altRatio > 0.5) {
      checks.push({
        id: 'geo-img-alt',
        name: 'Image Alt Text Coverage',
        category: 'GEO',
        status: 'pass',
        detail: `${altPct}% of images have alt text (${imgsWithAlt}/${totalImgs} images). Multimodal AI models (GPT-4o, Gemini) can interpret your visual content.`,
        fixTip: 'Alt text ratio meets standards. Continue labeling decorative icons as alt="" and diagrams with descriptive alt.'
      });
    } else {
      checks.push({
        id: 'geo-img-alt',
        name: 'Image Alt Text Coverage',
        category: 'GEO',
        status: 'fail',
        detail: `Only ${altPct}% of images have alt text (${imgsWithAlt}/${totalImgs} images). Failed the >50% threshold required for multimodal AI indexers.`,
        fixTip: 'Add descriptive alt text to all informative images.',
        fixCode: `<!-- Bad: <img src="chart.png"> -->\n<!-- Good: -->\n<img src="chart.png" alt="Annual customer growth graph illustrating 45% increase" />`
      });
    }
  }

  // 10. Word count (page has at least 300 words of text)
  if (wordCount >= 300) {
    checks.push({
      id: 'geo-word-count',
      name: 'Substantive Word Count (300+ Words)',
      category: 'GEO',
      status: 'pass',
      detail: `Page contains ${wordCount} words of readable body text. Meets the 300+ word threshold required for LLM semantic chunking and embedding.`,
      fixTip: 'Sufficient content depth.'
    });
  } else if (wordCount >= 180) {
    checks.push({
      id: 'geo-word-count',
      name: 'Substantive Word Count (300+ Words)',
      category: 'GEO',
      status: 'warn',
      detail: `Page has ${wordCount} words (threshold is 300 words). LLMs and Perplexity answer bots may deem this content thin.`,
      fixTip: 'Add comprehensive explanations, customer FAQs, or feature breakdowns to reach 300+ words.',
      fixCode: `<!-- Add 2-3 detailed paragraphs explaining unique differentiators, specifications, and outcomes -->`
    });
  } else {
    checks.push({
      id: 'geo-word-count',
      name: 'Substantive Word Count (300+ Words)',
      category: 'GEO',
      status: 'fail',
      detail: `Low text density: only ${wordCount} words detected. AI search algorithms prioritize in-depth source material with rich context.`,
      fixTip: 'Expand content with descriptive copy, case studies, or methodology details.',
      fixCode: `<!-- Expand body text to provide rich contextual depth for embedding models -->`
    });
  }

  // 11. Author/Trust signals (HTML contains an 'About' link or words like 'Founder', 'Team', 'About Us')
  const authorKeywords = /(about us|our team|meet the team|founder|co-founder|leadership|author|written by|reviewed by|about the company)/i;
  const hasAboutLink = $('a').filter((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text() || '';
    return /about|team|founder|leadership|who-we-are/i.test(href) || authorKeywords.test(text);
  }).length > 0;
  const hasTrustInBody = authorKeywords.test(cleanContentText);

  if (hasAboutLink || hasTrustInBody) {
    checks.push({
      id: 'geo-trust-signals',
      name: 'Author & E-E-A-T Trust Signals',
      category: 'GEO',
      status: 'pass',
      detail: 'Detected explicit trust & authority markers (About/Founder/Team references). Perplexity and Google AI Overviews favor verified entities.',
      fixTip: 'E-E-A-T signals are active.'
    });
  } else {
    checks.push({
      id: 'geo-trust-signals',
      name: 'Author & E-E-A-T Trust Signals',
      category: 'GEO',
      status: 'fail',
      detail: 'No Author, Founder, Team, or About Us references found. AI answer engines heavily filter anonymous sites lacking verified provenance.',
      fixTip: 'Add an "About Us" or "Leadership" link in navigation, and include author bylines or founder credentials.',
      fixCode: `<div class="author-attribution">\n  <p>Published by <strong>Founder / Lead Specialist</strong> at ${domain}</p>\n  <a href="/about">Learn about our team</a>\n</div>`
    });
  }

  // =====================
  // AEO CHECKS (6) - Answer Engine Optimization
  // =====================

  // 12. JSON-LD Schema exists (script type="application/ld+json")
  if (jsonLdCount > 0) {
    checks.push({
      id: 'aeo-json-ld',
      name: 'JSON-LD Structured Data Schema',
      category: 'AEO',
      status: 'pass',
      detail: `Found ${jsonLdCount} JSON-LD structured data block(s). This gives AI answer engines machine-readable facts and entity relationships.`,
      fixTip: 'Maintain clean, validated schema using Schema.org validator.'
    });
  } else {
    checks.push({
      id: 'aeo-json-ld',
      name: 'JSON-LD Structured Data Schema',
      category: 'AEO',
      status: 'fail',
      detail: 'No <script type="application/ld+json"> tag found. Answer engines rely heavily on JSON-LD to confirm prices, entities, and answers.',
      fixTip: 'Inject a JSON-LD structured data block into your page <head>.',
      fixCode: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "${domain}",\n  "url": "${origin}"\n}\n</script>`
    });
  }

  // 13. LocalBusiness Schema specifically exists
  if (hasLocalBusiness) {
    checks.push({
      id: 'aeo-local-business',
      name: 'LocalBusiness / Organization Schema',
      category: 'AEO',
      status: 'pass',
      detail: `Local entity schema detected: "@type": "${localBusinessTypeFound || 'LocalBusiness'}". Enables direct location grounding in ChatGPT Local and Google Maps.`,
      fixTip: 'Ensure openingHours, telephone, and geo coordinates are populated.'
    });
  } else {
    checks.push({
      id: 'aeo-local-business',
      name: 'LocalBusiness / Organization Schema',
      category: 'AEO',
      status: 'fail',
      detail: 'Missing LocalBusiness schema. Conversational AI queries like "best service near me" or company inquiries cannot verify your entity.',
      fixTip: 'Add LocalBusiness / Organization JSON-LD markup.',
      fixCode: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "${domain}",\n  "image": "${origin}/logo.png",\n  "telephone": "+91-9876543210",\n  "address": {\n    "@type": "PostalAddress",\n    "streetAddress": "Tech Hub Street",\n    "addressLocality": "Bengaluru",\n    "addressCountry": "IN"\n  }\n}\n</script>`
    });
  }

  // 14. FAQ Content (HTML contains 'FAQPage' schema or 'Frequently Asked Questions')
  const hasFaqText = /(frequently asked questions|faq\b|q&a\b|common questions)/i.test(cleanContentText);
  if (hasFaqSchema && hasFaqText) {
    checks.push({
      id: 'aeo-faq',
      name: 'FAQ Content & FAQPage Schema',
      category: 'AEO',
      status: 'pass',
      detail: 'Both FAQPage JSON-LD schema and FAQ text detected. Question-and-answer pairs are the #1 source for Perplexity & ChatGPT direct answers.',
      fixTip: 'Keep FAQ answers concise (under 50 words per question) for direct AI citation.'
    });
  } else if (hasFaqSchema || hasFaqText) {
    checks.push({
      id: 'aeo-faq',
      name: 'FAQ Content & FAQPage Schema',
      category: 'AEO',
      status: 'warn',
      detail: hasFaqSchema
        ? 'FAQPage JSON-LD schema exists, but visible FAQ text is minimal.'
        : 'FAQ text found, but missing corresponding FAQPage JSON-LD schema for machine readability.',
      fixTip: 'Sync your visible FAQ questions with a JSON-LD FAQPage schema block.',
      fixCode: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "How does ${domain} work?",\n    "acceptedAnswer": {\n      "@type": "Answer",\n      "text": "We provide automated AI visibility audits and instant remediation."\n    }\n  }]\n}\n</script>`
    });
  } else {
    checks.push({
      id: 'aeo-faq',
      name: 'FAQ Content & FAQPage Schema',
      category: 'AEO',
      status: 'fail',
      detail: 'No FAQ content or FAQPage schema found. Perplexity and ChatGPT rely on question-answering formats to cite direct solutions.',
      fixTip: 'Add a Frequently Asked Questions section with 3-5 high-intent customer questions and structured FAQPage schema.',
      fixCode: `<section id="faq">\n  <h2>Frequently Asked Questions</h2>\n  <div>\n    <h3>What is ${domain}?</h3>\n    <p>Comprehensive service explanation...</p>\n  </div>\n</section>`
    });
  }

  // 15. Robots.txt allows AI bots (fetch /robots.txt, check for GPTBot or PerplexityBot)
  if (!robotsTxtFound) {
    checks.push({
      id: 'aeo-robots-ai',
      name: 'Robots.txt AI Bot Permissions',
      category: 'AEO',
      status: 'warn',
      detail: 'robots.txt not found (404). While AI bots default to scraping, having an explicit robots.txt granting access to GPTBot and PerplexityBot is recommended.',
      fixTip: 'Deploy a robots.txt file that explicitly welcomes AI crawlers.',
      fixCode: `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`
    });
  } else {
    const isGptBotBlocked = /User-agent:\s*GPTBot[\s\S]*?Disallow:\s*\//i.test(robotsTxtContent);
    const isPerplexityBlocked = /User-agent:\s*PerplexityBot[\s\S]*?Disallow:\s*\//i.test(robotsTxtContent);
    const isWildcardBlocked = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*($|\n)/i.test(robotsTxtContent) && !/User-agent:\s*(GPTBot|PerplexityBot)[\s\S]*?Allow:\s*\//i.test(robotsTxtContent);

    if (isGptBotBlocked || isPerplexityBlocked) {
      checks.push({
        id: 'aeo-robots-ai',
        name: 'Robots.txt AI Bot Permissions',
        category: 'AEO',
        status: 'fail',
        detail: `AI crawlers are explicitly blocked in robots.txt! (${isGptBotBlocked ? 'GPTBot blocked' : ''} ${isPerplexityBlocked ? 'PerplexityBot blocked' : ''}). Your site is invisible to ChatGPT and Perplexity.`,
        fixTip: 'Remove Disallow rules for GPTBot and PerplexityBot in robots.txt.',
        fixCode: `User-agent: GPTBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /`
      });
    } else if (isWildcardBlocked) {
      checks.push({
        id: 'aeo-robots-ai',
        name: 'Robots.txt AI Bot Permissions',
        category: 'AEO',
        status: 'warn',
        detail: 'Wildcard "Disallow: /" detected for all bots without explicit allow rules for GPTBot or PerplexityBot.',
        fixTip: 'Whitelist AI search crawlers explicitly in robots.txt.',
        fixCode: `User-agent: GPTBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /`
      });
    } else {
      checks.push({
        id: 'aeo-robots-ai',
        name: 'Robots.txt AI Bot Permissions',
        category: 'AEO',
        status: 'pass',
        detail: 'robots.txt found and permits AI crawlers (GPTBot and PerplexityBot are not blocked).',
        fixTip: 'AI crawl access is properly configured.'
      });
    }
  }

  // 16. NAP (Name, Address, Phone)
  // Phone regex: +91 or standard 10 digit, or international format
  const phoneRegex = /(?:\+91[\s.-]?[6-9]\d{9}|\b[6-9]\d{9}\b|\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|tel:[+\d]+|\(\d{3}\)\s*\d{3}-\d{4})/i;
  const addressRegex = /(address|location|headquarters|office location|our studio|registered office|pincode|zip code|street)/i;

  const hasPhone = phoneRegex.test(html);
  const hasAddress = addressRegex.test(html);

  if (hasPhone && hasAddress) {
    checks.push({
      id: 'aeo-nap',
      name: 'NAP (Name, Address, Phone) Signals',
      category: 'AEO',
      status: 'pass',
      detail: 'Complete NAP indicators detected (valid phone number and physical address/location keywords). Answer engines use NAP to authenticate real-world credibility.',
      fixTip: 'NAP consistency is verified.'
    });
  } else if (hasPhone || hasAddress) {
    checks.push({
      id: 'aeo-nap',
      name: 'NAP (Name, Address, Phone) Signals',
      category: 'AEO',
      status: 'warn',
      detail: `Incomplete NAP signals: ${hasPhone ? 'Phone number found, but missing clear physical Address or Location keyword' : 'Address keyword found, but missing recognizable telephone number'}.`,
      fixTip: 'Ensure both a standardized telephone number (+91 or international format) and full address appear in footer.',
      fixCode: `<footer>\n  <p><strong>Office:</strong> Tech Park, Outer Ring Road, Bengaluru 560103</p>\n  <p><strong>Phone:</strong> <a href="tel:+919876543210">+91 98765 43210</a></p>\n</footer>`
    });
  } else {
    checks.push({
      id: 'aeo-nap',
      name: 'NAP (Name, Address, Phone) Signals',
      category: 'AEO',
      status: 'fail',
      detail: 'No Name, Address, Phone (NAP) pattern found. AI models looking for verified physical operations cannot validate this business.',
      fixTip: 'Include your official corporate address and customer support phone number in the global footer.',
      fixCode: `<footer>\n  <p><strong>Address:</strong> 123 Innovation Boulevard, Suite 400</p>\n  <p><strong>Phone:</strong> +1 (555) 234-5678</p>\n</footer>`
    });
  }

  // 17. Broken Links - grab first 5 <a> tags and test
  if (candidateHrefs.length === 0) {
    checks.push({
      id: 'aeo-broken-links',
      name: 'Broken Navigation Links Audit',
      category: 'AEO',
      status: 'pass',
      detail: 'No external or internal navigation hyperlinks found to sample.',
      fixTip: 'Add structured navigation links to help AI crawlers traverse your site graph.'
    });
  } else if (brokenLinksCount === 0) {
    checks.push({
      id: 'aeo-broken-links',
      name: 'Broken Navigation Links Audit',
      category: 'AEO',
      status: 'pass',
      detail: `Verified sample of ${candidateHrefs.length} navigation links — all returned valid HTTP status codes without dead ends.`,
      fixTip: 'Navigation graph is clean and healthy.'
    });
  } else if (brokenLinksCount === 1) {
    checks.push({
      id: 'aeo-broken-links',
      name: 'Broken Navigation Links Audit',
      category: 'AEO',
      status: 'warn',
      detail: `1 of ${candidateHrefs.length} sampled links failed or timed out. AI crawlers downgrade sites with broken internal pathways.`,
      fixTip: 'Fix or redirect broken hyperlinks to valid destination pages.'
    });
  } else {
    checks.push({
      id: 'aeo-broken-links',
      name: 'Broken Navigation Links Audit',
      category: 'AEO',
      status: 'fail',
      detail: `${brokenLinksCount} of ${candidateHrefs.length} sampled links failed or returned 4xx/5xx errors. Dead links waste crawler budget.`,
      fixTip: 'Perform a comprehensive site audit and replace all dead links with 301 redirects.'
    });
  }

  // =====================
  // CALCULATE SCORE & CATEGORIES
  // =====================
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  checks.forEach(c => {
    if (c.status === 'pass') passCount++;
    else if (c.status === 'warn') warnCount++;
    else failCount++;
  });

  // Exactly 17 checks total:
  // pass: 100 / 17 = 5.8823 pts
  // warn: 2.9411 pts
  // fail: 0 pts
  const rawScore = (passCount * (100 / 17)) + (warnCount * (50 / 17));
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let grade = 'Invisible to AI';
  let gradeDescription = 'Critical gaps prevent AI search engines from indexing, citing, and grounding your brand.';
  if (finalScore >= 85) {
    grade = 'AI-Optimized';
    gradeDescription = 'High visibility! ChatGPT, Perplexity, and Google AI can easily read, parse, and cite your content.';
  } else if (finalScore >= 60) {
    grade = 'Partially Visible';
    gradeDescription = 'Moderate visibility. Some AI crawlers can read basic content, but crucial answer engine triggers are missing.';
  }

  const seoChecks = checks.filter(c => c.category === 'SEO');
  const geoChecks = checks.filter(c => c.category === 'GEO');
  const aeoChecks = checks.filter(c => c.category === 'AEO');

  const calcCatScore = (items: CheckItem[]) => {
    const p = items.filter(i => i.status === 'pass').length;
    const w = items.filter(i => i.status === 'warn').length;
    return Math.round((p * 100 + w * 50) / items.length);
  };

  return {
    url: fullUrl,
    domain,
    scannedAt: new Date().toISOString(),
    score: finalScore,
    grade,
    gradeDescription,
    summary: {
      total: 17,
      pass: passCount,
      warn: warnCount,
      fail: failCount
    },
    categories: {
      seo: { checks: seoChecks, score: calcCatScore(seoChecks), maxScore: 100 },
      geo: { checks: geoChecks, score: calcCatScore(geoChecks), maxScore: 100 },
      aeo: { checks: aeoChecks, score: calcCatScore(aeoChecks), maxScore: 100 }
    },
    checks,
    metadata: {
      title: rawTitle,
      description: $('meta[name="description"]').attr('content') || '',
      wordCount,
      headingsCount: { h1: h1Count, h2: h2Count },
      imagesCount: { total: totalImgs, withAlt: imgsWithAlt },
      linksCount: { total: candidateHrefs.length, tested: candidateHrefs.length, broken: brokenLinksCount },
      hasSchema: jsonLdCount > 0,
      hasRobots: robotsTxtFound,
      hasLlmsTxt: llmsTxtFound
    }
  };
}

// API Routes
app.post('/api/scan', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Please provide a valid website URL.' });
  }

  try {
    const result = await runScanner(url);
    res.json(result);
  } catch (err: any) {
    console.error('Scan error:', err);
    res.status(500).json({
      error: err.message || 'Failed to scan target website. Make sure the domain is accessible.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Setup Vite or Static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
