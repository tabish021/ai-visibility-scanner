import { jsPDF } from 'jspdf';
import { ScanResult, CheckItem } from '../types';

export function generatePdfReport(result: ScanResult): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
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
    // Subtle top line
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`AI Visibility Scanner • Audit Report for ${result.domain}`, margin, y);
    doc.text(new Date(result.scannedAt).toLocaleDateString(), pageWidth - margin, y, { align: 'right' });
    y += 6;
  };

  // --- COVER / HEADER BANNER (Page 1) ---
  // Top Banner Box
  doc.setFillColor(3, 7, 18); // Dark gray-950
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'F');

  // Accent left border
  doc.setFillColor(34, 197, 94); // Emerald
  doc.roundedRect(margin, y, 3, 34, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('AI VISIBILITY AUDIT REPORT', margin + 8, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('17-Point Audit: SEO (Search), GEO (Generative AI) & AEO (Answer Engines)', margin + 8, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(74, 222, 128); // Emerald 400
  doc.text(`Target: ${result.url}`, margin + 8, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Scanned: ${new Date(result.scannedAt).toLocaleString()}`, margin + 8, y + 29);

  y += 40;

  // --- SCORE & EXECUTIVE SUMMARY CARD ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'FD');

  // Score Box inside Summary
  const isHigh = result.score >= 85;
  const isMed = result.score >= 60 && result.score < 85;
  const scoreBg = isHigh ? [34, 197, 94] : isMed ? [245, 158, 11] : [239, 68, 68];

  doc.setFillColor(scoreBg[0], scoreBg[1], scoreBg[2]);
  doc.roundedRect(margin + 5, y + 4, 30, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`${result.score}`, margin + 20, y + 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('OUT OF 100', margin + 20, y + 21, { align: 'center' });

  // Summary Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Readiness Status: ${result.grade.toUpperCase()}`, margin + 40, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const descLines = doc.splitTextToSize(result.gradeDescription, contentWidth - 45);
  doc.text(descLines, margin + 40, y + 15);

  // Counters pills
  const pY = y + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  // Passed
  doc.setTextColor(22, 101, 52);
  doc.text(`[PASS: ${result.summary.pass}/17]`, margin + 40, pY);

  // Warnings
  doc.setTextColor(180, 83, 9);
  doc.text(`[WARN: ${result.summary.warn}]`, margin + 78, pY);

  // Failed
  doc.setTextColor(185, 28, 28);
  doc.text(`[FAIL: ${result.summary.fail}]`, margin + 110, pY);

  // Category scores
  doc.setTextColor(51, 65, 85);
  doc.text(`SEO: ${result.categories.seo.score}%   GEO: ${result.categories.geo.score}%   AEO: ${result.categories.aeo.score}%`, margin + 140, pY);

  y += 38;

  // --- RENDER CATEGORY CHECKS ---
  const renderCategory = (title: string, categorySubtitle: string, checks: CheckItem[], catScore: number) => {
    checkPageBreak(18);

    // Category Header Banner
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(categorySubtitle, margin + 65, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(74, 222, 128);
    doc.text(`Score: ${catScore}%`, pageWidth - margin - 4, y + 6, { align: 'right' });

    y += 12;

    checks.forEach((chk, index) => {
      // Calculate height for check details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const detailLines = doc.splitTextToSize(chk.detail, contentWidth - 28);
      const itemHeight = 10 + detailLines.length * 3.6;

      checkPageBreak(itemHeight + 2);

      // Card container
      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, itemHeight, 1.5, 1.5, 'FD');

      // Status Badge
      let badgeBg = [34, 197, 94]; // Green
      let badgeText = 'PASS';
      if (chk.status === 'warn') {
        badgeBg = [245, 158, 11]; // Amber
        badgeText = 'WARN';
      } else if (chk.status === 'fail') {
        badgeBg = [239, 68, 68]; // Red
        badgeText = 'FAIL';
      }

      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
      doc.roundedRect(margin + 3, y + 3, 14, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(badgeText, margin + 10, y + 6.6, { align: 'center' });

      // Check Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(chk.name, margin + 20, y + 6.5);

      // Detail text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(detailLines, margin + 20, y + 10.5);

      y += itemHeight + 2;
    });

    y += 4;
  };

  // 1. SEO
  const seoChecks = result.checks.filter((c) => c.category === 'SEO');
  renderCategory('1. SEO Diagnostics', '(5 Search Engine Fundamentals)', seoChecks, result.categories.seo.score);

  // 2. GEO
  const geoChecks = result.checks.filter((c) => c.category === 'GEO');
  renderCategory('2. GEO Diagnostics', '(6 AI Search Visibility Signals)', geoChecks, result.categories.geo.score);

  // 3. AEO
  const aeoChecks = result.checks.filter((c) => c.category === 'AEO');
  renderCategory('3. AEO Diagnostics', '(6 Answer Engine Optimization Triggers)', aeoChecks, result.categories.aeo.score);

  y += 32;

  // --- FOOTER ON ALL PAGES ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(
      `AI Visibility Scanner • Report for ${result.domain} • Confidential Audit`,
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
  }

  // Sanitize filename
  const safeDomain = result.domain.replace(/[^a-zA-Z0-9.-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`ai-visibility-report-${safeDomain}-${dateStr}.pdf`);
}
