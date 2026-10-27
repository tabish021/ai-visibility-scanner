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
} from "lucide-react";
import axios from "axios";
import { ScanResult, CheckCategory } from "./types";
import { ScoreGauge } from "./components/ScoreGauge";
import { CheckCard } from "./components/CheckCard";
import { ScanSkeleton } from "./components/ScanSkeleton";
import { ReportModal } from "./components/ReportModal";
import { CursorGlow } from "./components/CursorGlow";
import { RocketCursor } from "./components/RocketCursor";
import { generatePdfReport } from "./utils/generatePdfReport";
import { LiquidMetalButton } from "./components/liquid-metal-button";
import { StarfieldBackground } from "./components/StarfieldBackground";

const SAMPLE_URLS = [
  "stripe.com",
  "linear.app",
  "openai.com",
  "github.com",
  "supabase.com",
];

// 200+ REAL MUMBAI/PUNE BUSINESSES FOR THE TICKER
const RECENT_SCAN_URLS = [
  "yogatainment.in",
  "premanandyoga.net",
  "cult.fit",
  "goldsgym.in",
  "srapilatesfitness.com",
  "mumbaiboxing.com",
  "theworkoutroom.in",
  "shape2run.com",
  "nitrro.in",
  "danzofit.com",
  "phhotyoga.com",
  "vlcc.com",
  "apollohospitals.com",
  "purepilates.co.in",
  "rhythmandflow.in",
  "fitbeats.in",
  "keysfitness.in",
  "nuagehotyoga.com",
  "boxringfitness.com",
  "mintonetteplus.com",
  "ivoryphysiotherapy.in",
  "crossfitmyden.co.in",
  "swasta.life",
  "oshivayoga.in",
  "club90.co.in",
  "trexfitnessfactory.com",
  "mcccricket.com",
  "stridestudio.in",
  "yogawithanindita.com",
  "fitmechanism.in",
  "healthnessfirst.com",
  "yogpowerint.com",
  "yogabyreilly.com",
  "trabhiyoga.com",
  "nitishyogofficial.com",
  "aditisyogawellness.com",
  "earthelementyoga.in",
  "leafyogavillage.com",
  "birthnbeyond.in",
  "mandarshinde.issacertifiedtrainer.com",
  "yoga-with-harsh-chheda.grexa.site",
  "futuristicfitness.co.in",
  "platinumfitness.in",
  "sashaktkasratghar.com",
  "fitjazz-fitness-studio.grexa.site",
  "keystudios.in",
  "rudiofitness.com",
  "plusfitness.co.in",
  "fitnessfevergym.com",
  "fitnesswarehousegym.in",
  "fit7borivaliwest.com",
  "thesportsgurukul.com",
  "letsplayacademy.in",
  "riazfitness.com",
  "pilatesaltitude.com",
  "kenzofitness.co.in",
  "laxmanayoga.com",
  "yogawithrajani.com",
  "healingcrystal.co.in",
  "livewithyoga.org",
  "amritwaniyogkendra.in",
  "utthaan-yoga.ueniweb.com",
  "mvpsportsacademy.in",
  "elevatesportsindia.com",
  "parthsportsacademy.com",
  "prinine.com",
  "ykbipilates.com",
  "padukonesportsmanagement.com",
  "uvfitness.co.in",
  "shankyfitness.in",
  "getfitwithdaniella.com",
  "mypainclinicglobal.com",
  "movebetter.co.in",
  "bombayhighsports.in",
  "achieve-fitness-bandra.grexa.site",
  "elysiumcalipark.com",
  "ruchipilates.com",
  "vahawellness.in",
  "thereformstudio.com",
  "sculptasse.com",
  "moovstudio.in",
  "physigo.in",
  "activ8studio.in",
  "ffitforlifegym.com",
  "sweatpilates.in",
  "pilatescirclebycult.com",
  "sweatfitwellness.com",
  "mindflexpilates.com",
  "tulamove.com",
  "5thgearpilates.com",
  "pilatesmumbai.com",
  "formpilatesandphysio.com",
  "dunamispilates.com",
  "corepilates.in",
  "pilatesacademydubai.com",
  "radhikasbalancedbody.com",
  "sayujyayoga.in",
  "prachisyogafitness.com",
  "shrithoratyoga.com",
  "afcgym.in",
  "beesfitnessstudio.com",
  "whynotfitness.in",
  "physiatricsplus.in",
  "physionv.in",
  "prosehatmumbai.in",
  "juhuandheri.theyogainstitute.org",
  "rsyogaschool.in",
  "omvikayogafitnessstudio.blogspot.com",
  "yogangle.com",
  "wellness-yoga.com",
  "prayagyoga.com",
  "ayamyoga.in",
  "bymyoga.in",
  "innerworldyogaacademy.com",
  "realignwitharunadharia.com",
  "eaglesquarefitness.in",
  "hrfitnesscrossfitgym.com",
  "crossfitkaali.com",
  "leofitness.in",
  "nolimitfitness.in",
  "66cfj4.atoms.world",
  "rawfitgym.in",
  "magnumfitness.co.in",
  "agamyoga.com",
  "ms-yoga-hub.business.site",
  "magicofyoga.com",
  "thereshapefitness.com",
  "powerpointgyms.com",
  "prommaleague.com",
  "planetmuscle.fit",
  "ironparadiesgym.in",
  "ironhouse.co.in",
  "wavesgym.com",
  "sanctumclub.co",
  "sohfithq.com",
  "thetribexindia.com",
  "resculpt.fit",
  "thestrengthclub.in",
  "wyzsportscience.com",
  "vervefitnesshub.com",
  "v33fitness.in",
  "coreclubb.com",
  "fitmotivationstudio.in",
  "elitefitxdubaidatesnutrition.com",
  "twalkarwellness.com",
  "bodysculptor.in",
  "triyog-fit-dance-fitness.grexa.site",
  "kruxgetfit.com",
  "thegymculture.in",
  "citysportsacademy.com",
  "hudle.in",
  "sportsfort.in",
  "podar.org",
  "mahatmasportsacademyyoga.lovable.app",
  "michaelphelpsswimming.in",
  "prokingsportsacademy.in",
  "cricfitter.com",
  "joshsports.com",
  "blackantsfc.in",
  "dahisarsportsclub.com",
  "urbansports.in",
  "frmindia.com",
  "icsporting.in",
  "connectto.in",
  "vitalismove.com",
  "fit2flauntfitness.com",
  "rfss.co.in",
  "aminasslimway.com",
  "ohanafitness.in",
  "shredxfytnest.com",
  "namitasfitnesshub.com",
  "gymarenaa.in",
  "bemorefit.in",
  "tungstenfitness.in",
  "360degreefitnesskickboxing.in",
  "oneabovefitness.com",
  "aatmashantiwellness.com",
  "vervegymnasium.in",
  "aumhealthandwellness.co.in",
  "luxorspasanpada.in",
  "ysmyoga.com",
  "shatayuspacbdbelapur.co.in",
  "thegoodplaceclinic.com",
  "opusworldwellness.com",
  "theviewspa.site.pro",
  "sushmitamukhia.co.in",
  "spinecarephysio.com",
  "sharu-pranic-healing.grexa.site",
  "madhavbaug.org",
  "bodysculptclinic.in",
  "vimuktiyoga.com",
  "allurethaispa.in",
  "samairadiagnostics.com",
  "amigospa.in",
  "marinathaispa.com",
  "awakeniq.com",
  "skinaesthete.com",
  "vishwaneelayurveda.com",
  "theyoga.artcastle.org.in",
  "anandalaxmiyoga.co.in",
  "artoflearninginstitute.com",
  "mahayogawellness.com",
  "hirephysio.com",
  "gaurisyogastudio.in",
  "samaragym.com",
  "fusionelementz.com",
  "orkidacademy.in",
  "fitnessclubstudio.in",
  "4dfitness.in",
  "acofitness.in",
  "abidepilates.in",
  "aimfitnesspune.in",
  "alignstudiopilates.in",
  "aristofitnessstudio.com",
  "atenxstudio.com",
  "aurapulsestudio.netlify.app",
  "biorhythmindia.co.in",
  "dtfstudio.com",
  "primalbasegym.com",
  "lemontreehotels.com",
  "ahujaresidences.com",
  "nutracylifestylebydrrohinipatil.com",
  "hathayogainstitute.com",
  "aadyamyoga.com",
  "yogsutrasbysamidha.com",
  "skyboxathlete.com",
  "dynamichealthstudio.com",
  "monkeyflagfitness.com",
  "ekoham.co.in",
  "eliteedgefitness.in",
  "ellipsa.in",
  "empowerfitnessclub.com",
  "evolvefitnesspune.in",
  "personaltrainerfreelance.godaddysites.com",
  "yogaurja.com",
  "yogvishwa.com",
  "vedbrahma.yoga",
  "iyengaryogsadhana.com",
  "jayuspoweryogaclasses.com",
  "athfitstudio.com",
  "samsaratheyogastudio.com",
  "sohamyogastudio.org",
  "healthynfitter.com",
  "yogamyogashala.com",
  "mariasyoga.org",
  "mindbodymeditationyoga.com",
  "yogismindia.org",
  "divineyogstudio.in",
  "yoganjali.in",
  "ikorepilates.com",
  "yogateach.net",
  "pratishyoga.com",
  "nainayoga.in",
  "oyogauniversal.co.in",
  "dhivo.org",
  "yogawaybyasmeeta.in",
  "swastiyogacenter.com",
  "trisoulwellness.com",
  "vinoddulalyoga.com",
  "theunbeatables.in",
  "danceinmotionindia.com",
  "talenthubb.com",
  "inthere.in",
  "fun-with-zumba-classes.business.site",
  "dynamofitnessgym.netlify.app",
  "jk-aerobics-zumba.grexa.site",
  "tranceformfitness.com",
  "kpilates.in",
  "thebodylabgym.com",
  "k6fitnessstudios.in",
  "hrstudios.co.in",
  "bodygurufitnessclub.com",
  "xumofitness.com",
  "rockfoldfitness.com",
  "primefit.me",
  "mfitnessyogtherapy.com",
  "leafzumba.com",
  "fitness.shreddedwolves.com",
  "powergoldgym.in",
  "moushuspilates.com",
  "peptsuccess.com",
  "vo2fitnessclub.in",
  "samsfitnessstudio.com",
  "gymbiosisfitnessclub.lovable.app",
  "24sfitnessandbeyond.com",
  "wildfit.me",
  "fabbfitt.in",
  "soundsfitt.com",
  "trifit.in",
  "paramyoga.in",
  "pinkfit.in",
  "rpilates.in",
  "refityoga.com",
  "riyasastudios.com",
  "semicolonpilatesstudio.fly-social.site",
  "sixpaxindia.com",
  "soulzfitness.com",
  "absfitnessclub.in",
  "dotfit.in",
  "anaahatyog.com",
  "lyberty.fit",
  "healthsagebypujaaa.com",
  "taisoindia.com",
  "thefitnesstemple.in",
  "theyogcircle.com",
  "neurobroma.in",
  "artofliving.org",
  "physiotherapistusha.in",
  "tybwithali.com",
  "onlineandhomefitnesstrainer.blogspot.com",
  "tfcpro.in",
  "vigourfitnessstudio.com",
  "fitarth.com",
  "vigourpilates.com",
  "yogilateswithnidhi.practicenow.us",
  "yphoria.com",
  "cowpriority.com",
  "physiowell360.com",
  "drdeepikabansalphysio.com",
  "firstfitt.in",
  "wwwk.aaakryog.com",
  "lotusyogapune.com",
  "axtremfit.com",
  "multifit.in",
  "technofitgym.in",
  "naturalspapune.com",
  "fitnessfreak6364.wixsite.com",
  "atxfitnessgym.com",
  "coabiohackingclinic.com",
  "risewithkratos.com",
  "trident-fitness.in",
  "kohamfit.com",
  "fitdeh.in",
  "apexphysioclinic.com",
  "countryfit.in",
  "thanepilates.com",
  "yogtatvah.com",
  "fusionfitnessstudi.wixsite.com",
  "neopilates.in",
  "snehalfitness.in",
  "vibezoneestudio.netlify.app",
  "fitness-vibes-studio.grexa.site",
  "thesocialhaus.in",
  "shubuszionstudio.in",
  "machinelessworkout.com",
  "fitandflexgym.com",
  "musclemonstergym.com",
  "core04gym.in",
  "gravityfitness.co.in",
  "abhijeetfitness.wordpress.com",
  "sportsbox.co.in",
  "nachogeo.netlify.app",
  "thefitplayce.com",
  "yogaburnt.org",
  "hybridhq.in",
  "turf.attendez.in",
  "onenessfa.com",
  "thanecityfc.com",
  "footballworldindia.com",
  "joshuafootballacademy.com",
  "indiakhelofootball.com",
  "academy.skorostunited.com",
  "corefitnesskalwa.in",
  "yogintra.com",
  "1lifegym.com",
  "cosmosfa.in",
  "keeayoacademy.in",
  "kvsfitness.com",
  "prathamfit.in",
  "yogdeep.net",
  "shwetyoga.in",
  "aerialyogaspace.wixsite.com",
  "yogasanskarsutra.com",
  "yog-shaktii.vercel.app",
  "priyogwellness.com",
  "abhivarah.com",
  "divineblissyogastudio.com",
  "thaneschoolyoga.com",
  "tansissupremeyogalaya.com",
  "sense22yoga.com",
  "rohitpillaiyoga.com",
  "fitopediayogastudio.exlyapp.com",
  "prakrutinaturopathy.in",
  "karmveeryoga.com",
  "asanayogawithsapna1111.in",
  "shivanandayogainstitute.in",
  "evolutionfitnessnx.in",
  "torquefitness.co.in",
  "magnumfitnessgym.in",
  "goldenearthyoga.com",
  "eldoradoyogastore.com",
  "yogawithreejo.in",
  "yogwithdileshsir.com",
  "yoganushasan.com",
  "yogurja.com",
  "yogaguppy.com",
  "niramayyogacenter.in",
  "yosyogashop.com",
  "corporateswasthya.com",
  "osaatfitness.com",
  "reshapefitnessplusthane.com",
  "jarayuayurved.com",
  "pramodchaturvedi.com",
  "nsfitzone.in",
  "funandfit.in",
  "sportsignite.in",
  "durvasportsacademy.in",
  "younggunsfootballacademy.com",
  "vhrsports.com",
  "ads-gear-up.grexa.site",
  "fabvisitingcard.in",
  "phoenixgymnastics.info",
  "iofficialsports.grexa.site",
  "bodymusclegym.com",
  "meerasfitnesscentre.com",
  "yogalateswithrashmi.com",
  "bodyart.in",
  "goalazofootball.com",
  "royalsports.ind.in",
  "nsquarecarrom.com",
  "starfishsports.co.in",
];

// --- RANDOM WATER BUTTON COMPONENT ---
const WATER_COLORS = [
  "btn-water-emerald",
  "btn-water-cyan",
  "btn-water-purple",
];
const WaterButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className = "", onMouseEnter, ...props }, ref) => {
  const [colorClass, setColorClass] = useState(
    () => WATER_COLORS[Math.floor(Math.random() * WATER_COLORS.length)],
  );
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setColorClass(
      WATER_COLORS[Math.floor(Math.random() * WATER_COLORS.length)],
    );
    if (onMouseEnter) onMouseEnter(e);
  };
  return (
    <button
      ref={ref}
      className={`btn-water ${colorClass} ${className}`}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </button>
  );
});
WaterButton.displayName = "WaterButton";

// Helper to calculate dynamic category scores based on checked boxes
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // FOMO Ticker State
  const [tickerUrl, setTickerUrl] = useState(RECENT_SCAN_URLS[0]);

  // Local Storage History
  const [history, setHistory] = useState<ScanResult[]>([]);

  // Interactive Checklist
  const [fixedChecks, setFixedChecks] = useState<string[]>([]);

  // Modals
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareUrl, setCompareUrl] = useState("");
  const [compareResult, setCompareResult] = useState<ScanResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // 1. FOMO Ticker Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerUrl(
        RECENT_SCAN_URLS[Math.floor(Math.random() * RECENT_SCAN_URLS.length)],
      );
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // 2. Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem("scanHistory");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // 3. Dynamic Scores
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

  const totalErrors = useMemo(() => {
    if (!scanResult) return 0;
    return scanResult.checks.filter((c) => c.status !== "pass").length;
  }, [scanResult]);

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

      {/* FOMO TICKER */}
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
                  onClick={handleShare}
                  className="btn-water btn-water-cyan flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-gray-300 border border-gray-800 text-xs font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 flex flex-col items-center">
          {/* Hero */}
          <div className="w-full text-center max-w-3xl mb-8">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Is AI invisible to your website?
            </h1>
            <p className="text-lg text-gray-400">
              Free 17-point scan. See exactly what ChatGPT, Perplexity and
              Google can read.
            </p>
          </div>

          {/* Input */}
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
                  <WaterButton
                    key={s}
                    onClick={() => handlePresetClick(s)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 font-mono text-[11px]"
                  >
                    <span>{s}</span>
                  </WaterButton>
                ))}
              </div>
              {history.length > 0 && (
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent:</span>
                  {history.map((h) => (
                    <WaterButton
                      key={h.domain}
                      onClick={() => setScanResult(h)}
                      className="px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700"
                    >
                      {h.domain}
                    </WaterButton>
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

          {/* Results */}
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
                    className="btn-water btn-water-purple flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-xs font-bold text-white"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Compare
                  </button>
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="btn-water btn-water-dark flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-gray-950 text-xs font-bold"
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

              <div className="w-full max-w-4xl mt-10 p-5 rounded-2xl bg-gray-900/80 border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">
                    Need an Expert Review & Feedback?
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Get a comprehensive human-audited Feedback Report.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="btn-water btn-water-dark flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-gray-950 font-bold text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Report
                  </button>
                  <button
                    onClick={initiatePdfDownload}
                    disabled={isDownloadingPdf}
                    className="btn-water btn-water-emerald flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FEATURE CARDS */}
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

        {/* FOOTER RESTORED */}
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

      {/* --- MODALS --- */}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        domain={scanResult?.domain}
        targetUrl={scanResult?.url}
      />

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
              <button className="w-full bg-emerald-500 text-gray-950 font-bold py-3 rounded-lg hover:bg-emerald-400">
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
                className="bg-purple-500 text-white font-bold px-4 rounded-lg disabled:opacity-50"
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

              <div className="p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/30 mt-6 text-center">
                <p className="text-sm text-white font-bold mb-2">
                  Want me to fix all of this for you?
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  I can implement all {totalErrors} fixes within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setIsContactModalOpen(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-6 py-2 rounded-lg transition-colors"
                >
                  Foundation Fix (₹7,999)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isContactModalOpen && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-gray-950 border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm relative text-center">
            <button
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Let's Fix Your Foundation
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Contact me directly to get all {totalErrors} fixes implemented
              within 24 hours.
            </p>

            <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                Direct Line
              </p>
              <p className="text-lg font-mono font-bold text-white tracking-widest">
                +91 9987455707
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="tel:+919987455707"
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-700 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Now
              </a>
              <a
                href={`https://wa.me/919987455707?text=${encodeURIComponent(`Hi Tabish, I want to hire you for the Foundation Fix for ${scanResult.domain}.`)}`}
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
