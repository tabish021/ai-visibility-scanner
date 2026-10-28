import { jsPDF } from "jspdf";
import { ScanResult, CheckItem } from "../types";

export function generatePdfReport(result: ScanResult): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `AI Visibility Scanner • Audit Report for ${result.input_url}`,
      margin,
      y,
    );
    doc.text(
      new Date(result.scanned_at).toLocaleDateString(),
      pageWidth - margin,
      y,
      { align: "right" },
    );
    y += 6;
  };

  // --- TOP BANNER ---
  doc.setFillColor(3, 7, 18);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");

  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin, y, 3, 34, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("AI VISIBILITY AUDIT REPORT", margin + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text("19-Point Audit: Access, Quality & Trust", margin + 8, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(74, 222, 128);
  doc.text(`Target: ${result.input_url}`, margin + 8, y + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Scanned: ${new Date(result.scanned_at).toLocaleString()}`,
    margin + 8,
    y + 29,
  );

  y += 40;

  // --- SCORE SUMMARY ---
  const score = result.overall.score;
  const label = result.overall.label;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, "FD");

  const isHigh = score >= 75 && !result.overall.capped;
  const isMed = score >= 50 && score < 75 && !result.overall.capped;
  const scoreBg = isHigh
    ? [34, 197, 94]
    : isMed
      ? [245, 158, 11]
      : [239, 68, 68];

  doc.setFillColor(scoreBg[0], scoreBg[1], scoreBg[2]);
  doc.roundedRect(margin + 5, y + 4, 30, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`${score}`, margin + 20, y + 15, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("OUT OF 100", margin + 20, y + 21, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Readiness Status: ${label.toUpperCase()}`, margin + 40, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const descLines = doc.splitTextToSize(
    result.overall.disclaimer,
    contentWidth - 45,
  );
  doc.text(descLines, margin + 40, y + 15);

  const pY = y + 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Category A: ${result.categories.A.score}%   Category B: ${result.categories.B.score}%   Category C: ${result.categories.C.score}%`,
    margin + 40,
    pY,
  );

  y += 38;

  // --- RENDER CHECKS ---
  const renderCategory = (
    title: string,
    categorySubtitle: string,
    checks: CheckItem[],
    catScore: number,
  ) => {
    if (!checks || checks.length === 0) return;
    checkPageBreak(18);

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(categorySubtitle, margin + 65, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(74, 222, 128);
    doc.text(`Score: ${catScore}%`, pageWidth - margin - 4, y + 6, {
      align: "right",
    });

    y += 12;

    checks.forEach((chk, index) => {
      const statusStr = (chk.status || "").toUpperCase();
      const isPass = statusStr === "PASS";
      const isWarn = statusStr === "WARN";
      const isFail = statusStr === "FAIL";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const detailLines = doc.splitTextToSize(
        chk.found || "",
        contentWidth - 28,
      );

      let fixLines: string[] = [];
      if (!isPass && statusStr !== "N/A") {
        fixLines = doc.splitTextToSize(
          `Fix: ${chk.fix || ""}`,
          contentWidth - 28,
        );
      }

      const itemHeight =
        10 +
        detailLines.length * 3.6 +
        (fixLines.length > 0 ? fixLines.length * 3.6 + 4 : 0);

      checkPageBreak(itemHeight + 2);

      doc.setFillColor(
        index % 2 === 0 ? 255 : 248,
        index % 2 === 0 ? 255 : 250,
        index % 2 === 0 ? 255 : 252,
      );
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, itemHeight, 1.5, 1.5, "FD");

      let badgeBg = [34, 197, 94];
      let badgeText = "PASS";
      if (isWarn) {
        badgeBg = [245, 158, 11];
        badgeText = "WARN";
      } else if (isFail) {
        badgeBg = [239, 68, 68];
        badgeText = "FAIL";
      } else if (statusStr === "N/A") {
        badgeBg = [107, 114, 128];
        badgeText = "N/A";
      }

      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
      doc.roundedRect(margin + 3, y + 3, 14, 5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(badgeText, margin + 10, y + 6.6, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(chk.name, margin + 20, y + 6.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(detailLines, margin + 20, y + 10.5);

      if (fixLines.length > 0) {
        let currentY = y + 10.5 + detailLines.length * 3.6 + 1;
        doc.setTextColor(34, 197, 94);
        doc.text(fixLines, margin + 20, currentY);
      }

      y += itemHeight + 2;
    });

    y += 4;
  };

  const catAChecks = result.checks.filter((c) => c.category === "A");
  const catBChecks = result.checks.filter((c) => c.category === "B");
  const catCChecks = result.checks.filter((c) => c.category === "C");

  renderCategory(
    "1. Access & Indexability",
    "(Category A)",
    catAChecks,
    result.categories.A.score,
  );
  renderCategory(
    "2. Page Quality",
    "(Category B)",
    catBChecks,
    result.categories.B.score,
  );
  renderCategory(
    "3. Trust & Identity",
    "(Category C)",
    catCChecks,
    result.categories.C.score,
  );

  y += 10;

  // --- FOOTER ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(
      `AI Visibility Scanner • Report for ${result.input_url} • Confidential Audit`,
      margin,
      pageHeight - 6,
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  // Sanitize filename
  const safeDomain = result.input_url.replace(/[^a-zA-Z0-9.-]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`ai-visibility-report-${safeDomain}-${dateStr}.pdf`);
}
