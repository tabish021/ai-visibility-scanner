import React, { useState } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Layers,
  Download,
  FileCheck,
  FileDown
} from 'lucide-react';
import axios from 'axios';
import { ScanResult, CheckCategory } from './types';
import { ScoreGauge } from './components/ScoreGauge';
import { CheckCard } from './components/CheckCard';
import { ScanSkeleton } from './components/ScanSkeleton';
import { ReportModal } from './components/ReportModal';
import { CursorGlow } from './components/CursorGlow';
import { generatePdfReport } from './utils/generatePdfReport';

const SAMPLE_URLS = [
  'stripe.com',
  'linear.app',
  'openai.com',
  'github.com',
  'supabase.com',
];

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | CheckCategory>('ALL');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleDownloadPdf = () => {
    if (!scanResult) return;
    setIsDownloadingPdf(true);
    try {
      generatePdfReport(scanResult);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleScan = async (targetUrlToScan?: string) => {
    const rawTarget = targetUrlToScan || urlInput;
    if (!rawTarget || !rawTarget.trim()) {
      setError('Please enter a website URL to scan.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await axios.post<ScanResult>('/api/scan', {
        url: rawTarget.trim(),
      });
      setScanResult(response.data);
      setUrlInput(response.data.url);
    } catch (err: any) {
      console.error('Scan error:', err);
      const errMsg =
        err.response?.data?.error ||
        err.message ||
        'Failed to connect to the target website. Please check the URL and try again.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetClick = (sample: string) => {
    setUrlInput(sample);
    handleScan(sample);
  };

  // Grouped checks for categorized views
  const seoChecks = scanResult?.checks.filter((c) => c.category === 'SEO') || [];
  const geoChecks = scanResult?.checks.filter((c) => c.category === 'GEO') || [];
  const aeoChecks = scanResult?.checks.filter((c) => c.category === 'AEO') || [];

  // WhatsApp link for RIFAH Members:
  // "Hi, I am a Member of RIFAH, please send the Feedback Report for - (their website name)"
  const rifahWhatsappUrl = scanResult
    ? `https://wa.me/919987455707?text=${encodeURIComponent(
        `Hi, I am a Member of RIFAH, please send the Feedback Report for - ${scanResult.domain || scanResult.url}`
      )}`
    : `https://wa.me/919987455707?text=${encodeURIComponent(
        'Hi, I am a Member of RIFAH, please send the Feedback Report'
      )}`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col font-sans selection:bg-emerald-500 selection:text-gray-950 relative">
      {/* Subtle cursor-following green neon ambient glow */}
      <CursorGlow />

      {/* Top Navbar */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 glow-green-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
                AI Visibility Scanner
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.4
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              17 Checks: SEO • GEO • AEO
            </span>
            {scanResult && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                  title="Order custom Feedback Report"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Report</span>
                </button>
                <a
                  href={rifahWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-water btn-water-emerald hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                  title="Direct WhatsApp access for RIFAH Members"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RIFAH Member</span>
                </a>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="btn-water btn-water-emerald hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-gray-300 border border-gray-800 text-xs font-medium cursor-pointer"
                  title="Download PDF report"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 md:py-16 flex flex-col items-center">
        {/* Hero Section */}
        <div className="w-full text-center max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs font-medium text-gray-300 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generative Engine Optimization (GEO) & Answer Engines</span>
          </div>

          {/* Specified Headlines */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-4">
            Is AI invisible to your website?
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Free 17-point scan. See exactly what ChatGPT, Perplexity and Google can read.
          </p>
        </div>

        {/* Input & Form Container */}
        <div className="w-full max-w-2xl mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan();
            }}
            className="relative flex flex-col sm:flex-row items-stretch gap-2.5 p-2 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-2xl focus-within:border-emerald-500/60 transition-all glow-green-sm"
          >
            <div className="relative flex-1 flex items-center pl-3">
              <Globe className="w-5 h-5 text-gray-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter URL (e.g., yourcompany.com)"
                className="w-full bg-transparent text-white placeholder-gray-500 text-sm sm:text-base focus:outline-none py-2"
                disabled={isLoading}
              />
            </div>

            {/* Specified Neon Green Button with water hover effect */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-water btn-water-dark flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm sm:text-base tracking-wide transition-all shadow-lg shadow-emerald-500/25 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Run free scan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Chips */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-gray-400">
            <span className="text-gray-400">Try sample:</span>
            {SAMPLE_URLS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handlePresetClick(sample)}
                disabled={isLoading}
                className="btn-water btn-water-emerald px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 font-mono text-[11px] transition-all cursor-pointer"
              >
                <span>{sample}</span>
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-rose-200 mb-0.5">Scan Error</span>
                <p>{error}</p>
                <div className="mt-2 text-[11px] text-gray-400">
                  Tip: Ensure the domain is public and allows HTTPS requests. Or click one of the sample presets above.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic State: Skeleton vs Results vs Initial empty placeholder */}
        {isLoading && <ScanSkeleton targetUrl={urlInput} />}

        {!isLoading && scanResult && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            {/* Scanned URL Title Card */}
            <div className="w-full max-w-3xl mb-8 p-4 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-mono">{scanResult.domain}</h3>
                    <a
                      href={scanResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white"
                      title="Visit scanned website"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-400">
                    Scanned at {new Date(scanResult.scannedAt).toLocaleTimeString()} • 17 Diagnostics Complete
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="btn-water btn-water-dark flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-gray-950 font-bold text-xs tracking-wide shadow-md shadow-emerald-500/20 cursor-pointer"
                  title="Order Feedback Report"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Report</span>
                </button>

                <a
                  href={rifahWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold tracking-wide cursor-pointer"
                  title="Direct WhatsApp access for RIFAH Members"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RIFAH Member</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  title="Generate and download full PDF report"
                >
                  {isDownloadingPdf ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleScan(scanResult.url)}
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-200 border border-gray-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-scan</span>
                </button>
              </div>
            </div>

            {/* Circular Score Gauge */}
            <div className="w-full max-w-3xl mb-12">
              <ScoreGauge result={scanResult} />
            </div>

            {/* Filter Tabs for Checks */}
            <div className="w-full max-w-4xl mb-6 flex items-center justify-between flex-wrap gap-3 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-1.5 bg-gray-900 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('ALL')}
                  className={`btn-water btn-water-emerald px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedFilter === 'ALL'
                      ? 'bg-emerald-500 text-gray-950 shadow-sm'
                      : 'text-gray-400'
                  }`}
                >
                  <span>All Checks (17)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('SEO')}
                  className={`btn-water btn-water-emerald px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedFilter === 'SEO'
                      ? 'bg-emerald-500 text-gray-950 shadow-sm'
                      : 'text-gray-400'
                  }`}
                >
                  <span>SEO (5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('GEO')}
                  className={`btn-water btn-water-cyan px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedFilter === 'GEO'
                      ? 'bg-cyan-500 text-gray-950 shadow-sm'
                      : 'text-gray-400'
                  }`}
                >
                  <span>GEO (6)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('AEO')}
                  className={`btn-water btn-water-purple px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedFilter === 'AEO'
                      ? 'bg-purple-500 text-gray-950 shadow-sm'
                      : 'text-gray-400'
                  }`}
                >
                  <span>AEO (6)</span>
                </button>
              </div>

              <div className="text-xs text-gray-400">
                17 Diagnostics: SEO • GEO • AEO Results
              </div>
            </div>

            {/* Categorized Checks Sections */}
            <div className="w-full max-w-4xl space-y-10">
              {/* SECTION 1: SEO (5 Checks) */}
              {(selectedFilter === 'ALL' || selectedFilter === 'SEO') && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                        1
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          SEO Diagnostics (Search Engine Crawlers)
                        </h3>
                        <p className="text-xs text-gray-400">
                          Standard crawlability, document structure, and indexing signals
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-1 rounded bg-gray-900 border border-gray-800">
                      {scanResult.categories.seo.score}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {seoChecks.map((check) => (
                      <CheckCard key={check.id} check={check} />
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: GEO (6 Checks) */}
              {(selectedFilter === 'ALL' || selectedFilter === 'GEO') && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
                        2
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          GEO Diagnostics (AI Search Visibility)
                        </h3>
                        <p className="text-xs text-gray-400">
                          Raw HTML visibility, llms.txt protocol, multimodal assets, and trust signals
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-1 rounded bg-gray-900 border border-gray-800">
                      {scanResult.categories.geo.score}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {geoChecks.map((check) => (
                      <CheckCard key={check.id} check={check} />
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: AEO (6 Checks) */}
              {(selectedFilter === 'ALL' || selectedFilter === 'AEO') && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/30">
                        3
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          AEO Diagnostics (Answer Engine Optimization)
                        </h3>
                        <p className="text-xs text-gray-400">
                          JSON-LD schema, LocalBusiness entities, FAQ snippets, AI bot permissions, and NAP signals
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400 px-2 py-1 rounded bg-gray-900 border border-gray-800">
                      {scanResult.categories.aeo.score}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {aeoChecks.map((check) => (
                      <CheckCard key={check.id} check={check} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* End of Results Action Buttons Bar */}
            <div className="w-full max-w-4xl mt-10 p-5 sm:p-6 rounded-2xl bg-gray-900/80 border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Need an Expert Review & Feedback?</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    TAT: 2-4 hrs
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Get a comprehensive human-audited Feedback Report with actionable fixes for {scanResult.domain}.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="btn-water btn-water-dark flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-gray-950 font-bold text-xs tracking-wide shadow-md shadow-emerald-500/20 cursor-pointer"
                  title="Order Feedback Report"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Report</span>
                </button>

                <a
                  href={rifahWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-emerald-300 border border-emerald-500/40 font-bold text-xs tracking-wide cursor-pointer shadow-sm"
                  title="Direct WhatsApp access for RIFAH Members"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RIFAH Member</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  title="Generate and download full PDF report"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => handleScan(scanResult.url)}
                  className="btn-water btn-water-emerald flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-800 text-xs text-gray-200 border border-gray-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-scan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Explainer when no results yet */}
        {!isLoading && !scanResult && (
          <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">5-Point SEO Foundation</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Evaluates H1/H2 hierarchy, canonical integrity, mobile viewports, and clean document metadata required for indexing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/80">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">6-Point GEO Protocol</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Checks raw HTML visibility without JS, the emerging /llms.txt standard, OpenGraph cards, image alt ratios, and E-E-A-T trust signals.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/80">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">6-Point AEO Answer Engine</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Audits JSON-LD schema, LocalBusiness entities, FAQ patterns, robots.txt AI permissions (GPTBot/PerplexityBot), and NAP signals.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Feedback Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        domain={scanResult?.domain}
        targetUrl={scanResult?.url}
      />

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-gray-950 py-10 text-center text-xs text-gray-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center gap-1">
          <p className="text-gray-200 font-bold text-base tracking-tight">AI Visibility Scanner</p>
          <p className="font-caveat text-3xl sm:text-4xl text-emerald-400 font-bold tracking-wider">
            Created by Tabish
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            © {new Date().getFullYear()} Generative Engine Optimization Engine • All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
