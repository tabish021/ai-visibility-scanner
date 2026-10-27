import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  Sparkles,
  Zap,
  Bot,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Download,
  FileCheck,
  Tag,
  X,
  Check,
  Copy,
  MessageSquare,
  Share2,
  TrendingUp,
  History,
  ChevronRight,
  CheckCircle2,
  CheckSquare,
  Phone,
  FileText,
  Code,
  Award,
} from "lucide-react";
import axios from "axios";
import { ScanResult, CheckCategory } from "./types";
import { ScoreGauge } from "./components/ScoreGauge";
import { CheckCard } from "./components/CheckCard";
import { ScanSkeleton } from "./components/ScanSkeleton";
import { CursorGlow } from "./components/CursorGlow";
import { RocketCursor } from "./components/RocketCursor";
import { generatePdfReport } from "./utils/generatePdfReport";
import { LiquidMetalButton } from "./components/liquid-metal-button";
import { StarfieldBackground } from "./components/StarfieldBackground";
import { Confetti } from "./components/Confetti";

const SAMPLE_URLS = [
  "stripe.com",
  "linear.app",
  "openai.com",
  "github.com",
  "supabase.com",
];

const RECENT_SCAN_URLS = [
  "dianasseafood.com",
  "apocalypsecroasters.com",
  "trofo.com",
  "closetworld.co",
  "srapilatesfitness.com",
  "mumbaiboxing.com",
  "gitman.com",
  "shape2run.com",
  "nitrro.in",
  "danzofit.com",
  "phhotyoga.com",
  "vlcc.com",
  "apollohospitals.com",
  "thenewdigital.com",
  "rhythmandflow.in",
  "tillysveaas.co",
  "keysfitness.in",
  "kravejerky.com",
  "mountstreetprinters.com",
  "mintonetteplus.com",
  "ivoryphysiotherapy.in",
  "crossfitmyden.co.in",
  "poketo.com",
  "saturdaysnyc.com",
  "club90.co.in",
  "trexfitnessfactory.com",
  "mcccricket.com",
  "stridestudio.in",
  "gleamcarwash.com",
  "letterfolk.com",
  "thesill.com",
  "bellroy.com",
  "artifactuprising.com",
  "asburyparkbrewery.com",
  "voodoodoughnut.com",
  "partnerscoffee.com",
  "socksmith.com",
  "uglydrinks.com",
  "terraintrees.com",
  "nativecos.com",
  "brooklinen.com",
  "shhhowercap.com",
  "hardgraft.com",
  "sweetgreen.com",
  "snacknation.com",
];

// --- PRICING LOGIC ---
const TECHNICAL_IDS = [
  "seo-title",
  "seo-h1",
  "seo-h2",
  "seo-canonical",
  "seo-viewport",
  "geo-spa-shell",
  "geo-llms-txt",
  "geo-og-tags",
  "geo-img-alt",
  "aeo-json-ld",
  "aeo-local-business",
  "aeo-robots-ai",
  "aeo-nap",
  "aeo-broken-links",
];
const CONTENT_IDS = ["geo-word-count", "geo-trust-signals", "aeo-faq"];

const FIX_PRICES: Record<string, number> = {
  "seo-title": 100,
  "seo-h1": 100,
  "seo-h2": 100,
  "seo-canonical": 100,
  "seo-viewport": 100,
  "aeo-robots-ai": 500,
  "geo-og-tags": 500,
  "geo-img-alt": 500,
  "aeo-nap": 500,
  "geo-llms-txt": 500,
  "aeo-broken-links": 500,
  "aeo-json-ld": 1000,
  "aeo-local-business": 1200,
  "geo-spa-shell": 1800,
};

const getCategoryScore = (checks: any[], fixedIds: string[]) => {
  if (!checks || checks.length === 0) return 0;
  let pass = 0,
    warn = 0;
  checks.forEach((c) => {
    if (c.status === "pass" || fixedIds.includes(c.id)) pass++;
    else if (c.status === "warn") warn++;
  });
  return Math.round((pass * 100 + warn * 50) / checks.length);
};

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const [tickerUrl, setTickerUrl] = useState(RECENT_SCAN_URLS[0]);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [fixedChecks, setFixedChecks] = useState<string[]>([]);

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareUrl, setCompareUrl] = useState("");
  const [compareResult, setCompareResult] = useState<ScanResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [contactMode, setContactMode] = useState<
    "tech" | "content" | "perfect" | null
  >(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerUrl(
        RECENT_SCAN_URLS[Math.floor(Math.random() * RECENT_SCAN_URLS.length)],
      );
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("scanHistory");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const currentScore = useMemo(() => {
    if (!scanResult) return 0;
    let score = scanResult.score;
    fixedChecks.forEach((id) => {
      const check = scanResult.checks.find((c) => c.id === id);
      if (check && check.status === "fail") score += 100 / 17;
      if (check && check.status === "warn") score += 50 / 17;
    });
    return Math.min(100, Math.round(score));
  }, [scanResult, fixedChecks]);

  const currentSeo = useMemo(
    () =>
      scanResult
        ? getCategoryScore(scanResult.categories.seo.checks, fixedChecks)
        : 0,
    [scanResult, fixedChecks],
  );
  const currentGeo = useMemo(
    () =>
      scanResult
        ? getCategoryScore(scanResult.categories.geo.checks, fixedChecks)
        : 0,
    [scanResult, fixedChecks],
  );
  const currentAeo = useMemo(
    () =>
      scanResult
        ? getCategoryScore(scanResult.categories.aeo.checks, fixedChecks)
        : 0,
    [scanResult, fixedChecks],
  );

  const techErrors = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.checks.filter(
      (c) => c.status !== "pass" && TECHNICAL_IDS.includes(c.id),
    );
  }, [scanResult]);

  const contentErrors = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.checks.filter(
      (c) => c.status !== "pass" && CONTENT_IDS.includes(c.id),
    );
  }, [scanResult]);

  const dynamicPrice = useMemo(() => {
    if (techErrors.length === 0) return 0;
    let price = 499;
    techErrors.forEach((err) => {
      price += FIX_PRICES[err.id] || 500;
    });
    return Math.min(7999, price);
  }, [techErrors]);

  const handleScan = async (targetUrlToScan?: string) => {
    const rawTarget = targetUrlToScan || urlInput;
    if (!rawTarget || !rawTarget.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setScanResult(null);
    setFixedChecks([]);
    setCompareResult(null);

    try {
      const response = await axios.post<ScanResult>("/api/scan", {
        url: rawTarget.trim(),
      });
      setScanResult(response.data);
      setUrlInput(response.data.url);

      const newHistory = [
        response.data,
        ...history.filter((h) => h.domain !== response.data.domain),
      ].slice(0, 3);
      setHistory(newHistory);
      localStorage.setItem("scanHistory", JSON.stringify(newHistory));
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to connect.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetClick = (sample: string) => {
    setUrlInput(sample);
    handleScan(sample);
  };
  const toggleFix = (id: string) =>
    setFixedChecks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const initiatePdfDownload = () => setIsLeadModalOpen(true);
  const confirmLeadAndDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail) return;
    setIsLeadModalOpen(false);
    setIsDownloadingPdf(true);
    setTimeout(() => {
      if (scanResult) generatePdfReport({ ...scanResult, score: currentScore });
      setIsDownloadingPdf(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 500);
  };

  const handleCompare = async () => {
    if (!compareUrl) return;
    setIsComparing(true);
    setCompareResult(null);
    try {
      const res = await axios.post<ScanResult>("/api/scan", {
        url: compareUrl,
      });
      setCompareResult(res.data);
    } catch {
      alert("Failed to scan competitor.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleShare = () => {
    const text = `My website ${scanResult?.domain} scored ${currentScore}/100 on AI Visibility! Check yours at aivisibility.in`;
    if (navigator.share) {
      navigator.share({
        title: "AI Visibility Scanner",
        text,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${text} ${window.location.href}`);
      alert("Link copied to clipboard!");
    }
  };

  const seoChecks =
    scanResult?.checks.filter((c) => c.category === "SEO") || [];
  const geoChecks =
    scanResult?.checks.filter((c) => c.category === "GEO") || [];
  const aeoChecks =
    scanResult?.checks.filter((c) => c.category === "AEO") || [];

  return (
    <div className="min-h-screen text-gray-200 flex flex-col font-sans relative bg-gray-950">
      <StarfieldBackground />
      <CursorGlow />
      <RocketCursor />
      <Confetti active={currentScore === 100} />

      <div className="w-full bg-emerald-950/80 border-b border-emerald-500/20 text-emerald-400 text-[10px] font-mono py-1.5 flex items-center justify-center gap-2 z-50 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>
          Recently scanned:{" "}
          <span className="text-white font-bold">{tickerUrl}</span> via Live
          Scanner
        </span>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b border-gray-900/50 bg-gray-950/60 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-white text-base">
                AI Visibility Scanner
              </span>
            </div>
            {scanResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={initiatePdfDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all hover:bg-emerald-500 hover:text-gray-950 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Free Report
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-gray-300 border border-gray-800 text-xs font-semibold transition-all hover:bg-gray-800 hover:text-white"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 flex flex-col items-center">
          <div className="w-full text-center max-w-3xl mb-8">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Is your business invisible to AI?
            </h1>
            <p className="text-lg text-gray-400">
              Free 17-point scan. See exactly what ChatGPT, Perplexity and
              Google can read.
            </p>
          </div>

          <div className="w-full max-w-2xl mb-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScan();
              }}
              className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl bg-gray-900/80 backdrop-blur-md border border-gray-800"
            >
              <div className="flex-1 flex items-center pl-3">
                <Globe className="w-5 h-5 text-gray-400 mr-2.5" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter URL (e.g. yourcompany.com)"
                  className="w-full bg-transparent text-white focus:outline-none"
                  disabled={isLoading}
                />
              </div>
              <LiquidMetalButton
                label={isLoading ? "Scanning..." : "Run free scan"}
                onClick={() => {
                  if (!isLoading && urlInput.trim()) handleScan();
                }}
              />
            </form>

            <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Try sample:</span>
                {SAMPLE_URLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handlePresetClick(s)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 font-mono text-[11px] transition-all hover:bg-gray-800 hover:text-white"
                  >
                    <span>{s}</span>
                  </button>
                ))}
              </div>
              {history.length > 0 && (
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent:</span>
                  {history.map((h) => (
                    <button
                      key={h.domain}
                      onClick={() => setScanResult(h)}
                      className="px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 transition-all hover:bg-gray-700 hover:text-white"
                    >
                      {h.domain}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950 text-rose-300 text-xs border border-rose-500/40">
                {error}
              </div>
            )}
          </div>

          {isLoading && <ScanSkeleton targetUrl={urlInput} />}

          {!isLoading && scanResult && (
            <div className="w-full flex flex-col items-center animate-in fade-in">
              <div className="w-full max-w-3xl mb-8 p-4 rounded-2xl bg-gray-900/80 backdrop-blur-md border border-gray-800 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-white font-mono">
                    {scanResult.domain}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({scanResult.loadTimeMs}ms load)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCompareModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-bold text-white transition-all hover:bg-gray-700"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Compare
                  </button>
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-gray-950 text-xs font-bold transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> AI Fix Guide
                  </button>
                </div>
              </div>

              <div className="w-full max-w-3xl mb-12">
                <ScoreGauge result={{ ...scanResult, score: currentScore }} />
              </div>

              <div className="w-full max-w-4xl mb-4 flex items-center justify-between bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl">
                <p className="text-xs text-blue-300 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Tip: Developers can check
                  off items below as you fix them to watch your score go up!
                </p>
              </div>

              <div className="w-full max-w-4xl space-y-8">
                {[
                  { cat: "SEO", data: seoChecks },
                  { cat: "GEO", data: geoChecks },
                  { cat: "AEO", data: aeoChecks },
                ].map(({ cat, data }) => (
                  <div key={cat}>
                    <h3 className="text-lg font-bold text-white mb-3">
                      {cat} Diagnostics
                    </h3>
                    <div className="space-y-3">
                      {data.map((check) => (
                        <CheckCard
                          key={check.id}
                          check={check}
                          isFixed={fixedChecks.includes(check.id)}
                          onToggleFix={toggleFix}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full max-w-4xl mt-10 space-y-4">
                {techErrors.length > 0 && (
                  <div className="p-5 rounded-2xl bg-gray-900/80 border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Code className="w-4 h-4 text-emerald-400" /> Technical
                        Foundation
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        You have{" "}
                        <span className="text-rose-400 font-bold">
                          {techErrors.length} technical errors
                        </span>{" "}
                        blocking AI from reading your site. I can fix all of
                        these within 24 hours.
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      <button
                        onClick={initiatePdfDownload}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 text-xs font-bold transition-all hover:bg-gray-700 hover:text-white"
                      >
                        <Download className="w-3.5 h-3.5" /> Free Report
                      </button>
                      <button
                        onClick={() => setContactMode("tech")}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-gray-950 font-bold text-xs transition-all hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                      >
                        <Code className="w-3.5 h-3.5" /> Fix My Tech (₹
                        {dynamicPrice})
                      </button>
                    </div>
                  </div>
                )}

                {contentErrors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" /> Content
                        & Authority
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        You have {contentErrors.length} content errors (e.g.,
                        missing FAQ, no author bio). These require a custom
                        monthly strategy.
                      </p>
                    </div>
                    <button
                      onClick={() => setContactMode("content")}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 underline"
                    >
                      Discuss Content Strategy
                    </button>
                  </div>
                )}

                {techErrors.length === 0 && contentErrors.length === 0 && (
                  <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
                      <Award className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        Your website foundation is fully optimized!
                      </h4>
                      <p className="text-sm text-gray-400 max-w-lg mx-auto">
                        You passed all 17 technical and content checks. Now
                        let's work on building your authority and ranking it to
                        the top.
                      </p>
                    </div>
                    <button
                      onClick={() => setContactMode("perfect")}
                      className="mt-2 px-6 py-3 rounded-xl bg-emerald-500 text-gray-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-105"
                    >
                      Discuss Content Strategy
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && !scanResult && (
            <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-gray-800/80">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  5-Point SEO Foundation
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Evaluates H1/H2 hierarchy, canonical integrity, mobile
                  viewports, and clean document metadata required for indexing.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-gray-800/80">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  6-Point GEO Protocol
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Checks raw HTML visibility without JS, the emerging /llms.txt
                  standard, OpenGraph cards, image alt ratios, and E-E-A-T trust
                  signals.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-gray-900/60 backdrop-blur-sm border border-gray-800/80">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  6-Point AEO Answer Engine
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Audits JSON-LD schema, LocalBusiness entities, FAQ patterns,
                  robots.txt AI permissions (GPTBot/PerplexityBot), and NAP
                  signals.
                </p>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-gray-900/50 bg-gray-950/60 py-10 text-center text-xs text-gray-400 backdrop-blur-md mt-auto">
          <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center gap-1">
            <p className="text-gray-200 font-bold text-base tracking-tight">
              AI Visibility Scanner
            </p>
            <p className="font-caveat text-3xl sm:text-4xl text-emerald-400 font-bold tracking-wider">
              Created by Tabish
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              © {new Date().getFullYear()} Generative Engine Optimization
              Engine • All rights reserved
            </p>
          </div>
        </footer>
      </div>

      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-gray-950 border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm relative">
            <button
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2">
              Where should we send it?
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Enter your email to download the PDF report.
            </p>
            <form onSubmit={confirmLeadAndDownload}>
              <input
                required
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white mb-3 focus:border-emerald-500 outline-none"
              />
              <button className="w-full bg-emerald-500 text-gray-950 font-bold py-3 rounded-lg hover:bg-emerald-400 transition-colors">
                Download PDF
              </button>
            </form>
          </div>
        </div>
      )}

      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-gray-950 border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setIsCompareModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" /> Competitor
              Comparison
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              See how your score stacks up in every category.
            </p>
            <div className="flex gap-2 mb-6">
              <input
                value={compareUrl}
                onChange={(e) => setCompareUrl(e.target.value)}
                placeholder="competitor.com"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
              />
              <button
                onClick={handleCompare}
                disabled={isComparing}
                className="bg-purple-500 text-white font-bold px-4 rounded-lg disabled:opacity-50 hover:bg-purple-400 transition-colors"
              >
                {isComparing ? "Scanning..." : "Scan"}
              </button>
            </div>
            {compareResult && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-800">
                  <div className="text-center w-1/3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                      You
                    </p>
                    <p
                      className={`text-3xl font-extrabold ${currentScore >= compareResult.score ? "text-emerald-400" : "text-white"}`}
                    >
                      {currentScore}
                    </p>
                  </div>
                  <div className="text-gray-600 font-bold text-sm">VS</div>
                  <div className="text-center w-1/3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 truncate">
                      {compareResult.domain}
                    </p>
                    <p
                      className={`text-3xl font-extrabold ${compareResult.score > currentScore ? "text-emerald-400" : "text-white"}`}
                    >
                      {compareResult.score}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-emerald-400">SEO Foundation</span>
                      <div className="flex gap-4">
                        <span
                          className={
                            currentSeo >= compareResult.categories.seo.score
                              ? "text-emerald-400 font-bold"
                              : "text-gray-400"
                          }
                        >
                          You: {currentSeo}%
                        </span>
                        <span
                          className={
                            compareResult.categories.seo.score > currentSeo
                              ? "text-emerald-400 font-bold"
                              : "text-gray-400"
                          }
                        >
                          {compareResult.categories.seo.score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${currentSeo}%` }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-700 transition-all"
                          style={{
                            width: `${compareResult.categories.seo.score}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-cyan-400">AI Visibility (GEO)</span>
                      <div className="flex gap-4">
                        <span
                          className={
                            currentGeo >= compareResult.categories.geo.score
                              ? "text-cyan-400 font-bold"
                              : "text-gray-400"
                          }
                        >
                          You: {currentGeo}%
                        </span>
                        <span
                          className={
                            compareResult.categories.geo.score > currentGeo
                              ? "text-cyan-400 font-bold"
                              : "text-gray-400"
                          }
                        >
                          {compareResult.categories.geo.score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 transition-all"
                          style={{ width: `${currentGeo}%` }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-700 transition-all"
                          style={{
                            width: `${compareResult.categories.geo.score}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-purple-400">
                        Answer Engine (AEO)
                      </span>
                      <div className="flex gap-4">
                        <span
                          className={
                            currentAeo >= compareResult.categories.aeo.score
                              ? "text-purple-400 font-bold"
                              : "text-gray-400"
                          }
                        >
                          You: {currentAeo}%
                        </span>
                        <span
                          className={
                            compareResult.categories.aeo.score > currentAeo
                              ? "text-purple-400 font-bold"
                              : "text-gray-400"
                          }
                        >
                          {compareResult.categories.aeo.score}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${currentAeo}%` }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-700 transition-all"
                          style={{
                            width: `${compareResult.categories.aeo.score}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAiModalOpen && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-gray-950 border border-emerald-500/30 rounded-2xl p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">
                AI-Generated Fix Guide
              </h3>
            </div>
            <div className="space-y-4">
              {scanResult.checks
                .filter((c) => c.status !== "pass")
                .map((check) => (
                  <div
                    key={check.id}
                    className="p-4 bg-gray-900 rounded-xl border border-gray-800"
                  >
                    <h4 className="text-sm font-bold text-rose-400 mb-1">
                      {check.name}
                    </h4>
                    <p className="text-xs text-gray-400 mb-2">{check.detail}</p>
                    <div className="bg-gray-950 p-2 rounded text-xs text-emerald-300 font-mono border border-gray-800 overflow-x-auto">
                      {check.fixTip ||
                        "Review the page source and update the relevant tags."}
                    </div>
                  </div>
                ))}
              {techErrors.length > 0 && (
                <div className="p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/30 mt-6 text-center">
                  <p className="text-sm text-white font-bold mb-2">
                    Want me to fix all of this for you?
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    I can implement all {techErrors.length} technical fixes
                    within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsAiModalOpen(false);
                      setContactMode("tech");
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-6 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    Fix My Technical Foundation (₹{dynamicPrice})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {contactMode && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-gray-950 border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm relative text-center">
            <button
              onClick={() => setContactMode(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              {contactMode === "tech" ? (
                <Code className="w-8 h-8 text-emerald-400" />
              ) : (
                <FileText className="w-8 h-8 text-purple-400" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {contactMode === "tech"
                ? "Let's Fix Your Foundation"
                : contactMode === "content"
                  ? "Discuss Content Strategy"
                  : "Rank to the Top"}
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              {contactMode === "tech"
                ? `Contact me to get all ${techErrors.length} technical fixes implemented within 24 hours.`
                : contactMode === "content"
                  ? `Contact me to discuss how to build your authority and fix your ${contentErrors.length} content issues.`
                  : "Your foundation is perfect. Let's build your authority to rank higher."}
            </p>
            {contactMode === "tech" && (
              <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                  Dynamic Quote
                </p>
                <p className="text-2xl font-mono font-bold text-emerald-400 tracking-widest">
                  ₹{dynamicPrice}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <a
                href="tel:+919987455707"
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-700 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Now
              </a>
              <a
                href={`https://wa.me/919987455707?text=${encodeURIComponent(contactMode === "tech" ? `Hi Tabish, I want to hire you for the Foundation Fix for ${scanResult.domain}. The quoted price is ₹${dynamicPrice}.` : contactMode === "content" ? `Hi Tabish, I want to discuss a content strategy for my website (${scanResult.domain}).` : `Hi Tabish, my website (${scanResult.domain}) passed all tests! I want to discuss ranking it to the top.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <MessageSquare className="w-4 h-4" /> Message on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
