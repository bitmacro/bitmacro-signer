import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import type { VaultPayload } from "@/lib/vault";

import {
  buildOfflineVaultBundle,
  serializeOfflineBundleForQr,
} from "./offline-bundle";

export type BackupPdfCopy = {
  fileNamePrefix: string;
  title: string;
  subtitle: string;
  criticalTitle: string;
  criticalBullets: string[];
  didacticTitle: string;
  didacticBullets: string[];
  npubLabel: string;
  passphraseReminder: string;
  codeTitle: string;
  codeBody: string;
  downloadCheck: string;
  qrSectionLead: string;
  qrTitle: string;
  jsonSectionTitle: string;
  jsonSectionWarning: string;
  jsonTitle: string;
  recoveryTitle: string;
  recoveryWebStep: string;
  recoverySteps: string[];
  stewardshipTitle: string;
  /** Pipe-separated short paragraphs (same guidance as /recover after decrypt). */
  stewardshipParagraphs: string[];
  footer: string;
};

function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

/** Center-aligned paragraph; returns Y after last line (mm). */
function drawCenteredLines(
  doc: jsPDF,
  lines: string[],
  centerX: number,
  y: number,
  lineStep: number,
): number {
  let yy = y;
  for (const line of lines) {
    doc.text(line, centerX, yy, { align: "center" });
    yy += lineStep;
  }
  return yy;
}

/**
 * Single-page A4 backup PDF: centered title, rule, compact sections, QR + recovery
 * side-by-side, minified JSON (small type) — fits one page for typical bundles.
 */
export async function buildVaultBackupPdfBlob(
  args: {
    npub: string;
    identityId: string;
    vault: VaultPayload;
    confirmationCode: string;
    recoverUrl: string;
    copy: BackupPdfCopy;
  },
): Promise<Blob> {
  const { npub, identityId, vault, confirmationCode, recoverUrl, copy } = args;
  const bundle = buildOfflineVaultBundle(identityId, npub, vault);
  const qrPayload = serializeOfflineBundleForQr(bundle);
  const minifiedJson = qrPayload;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW =
    (doc.internal.pageSize as { width?: number; getWidth?: () => number })
      .width ??
    doc.internal.pageSize.getWidth?.() ??
    210;
  const pageH =
    (doc.internal.pageSize as { height?: number; getHeight?: () => number })
      .height ??
    doc.internal.pageSize.getHeight?.() ??
    297;
  const margin = 10;
  const maxW = pageW - margin * 2;
  const centerX = pageW / 2;
  let y = margin;

  /* ——— Title block (centered) ——— */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(28, 28, 28);
  const titleLines = splitLines(doc, copy.title, maxW);
  y = drawCenteredLines(doc, titleLines, centerX, y, 5.5);
  y += 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 75, 75);
  const subLines = splitLines(doc, copy.subtitle, maxW - 8);
  y = drawCenteredLines(doc, subLines, centerX, y, 4.2);
  y += 3;

  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  /* ——— Critical warnings (measure → box → text) ——— */
  const critTop = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const critTitleLines = splitLines(doc, copy.criticalTitle, maxW - 6);
  let critInnerH = 4 + critTitleLines.length * 4 + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  for (const bullet of copy.criticalBullets) {
    critInnerH += splitLines(doc, `• ${bullet}`, maxW - 8).length * 3.3;
  }
  const critH = critInnerH + 5;
  doc.setDrawColor(200, 90, 90);
  doc.setLineWidth(0.35);
  doc.setFillColor(255, 250, 250);
  doc.rect(margin, critTop, maxW, critH, "FD");

  let critPen = critTop + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(145, 25, 25);
  for (const line of critTitleLines) {
    doc.text(line, margin + 3, critPen);
    critPen += 4;
  }
  critPen += 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(55, 25, 25);
  for (const bullet of copy.criticalBullets) {
    for (const line of splitLines(doc, `• ${bullet}`, maxW - 8)) {
      doc.text(line, margin + 4, critPen);
      critPen += 3.3;
    }
  }
  y = critTop + critH + 4;

  /* ——— Didactic ——— */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(35, 45, 120);
  doc.text(copy.didacticTitle, margin, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(45, 45, 45);
  for (const bullet of copy.didacticBullets) {
    for (const line of splitLines(doc, `• ${bullet}`, maxW - 4)) {
      doc.text(line, margin + 2, y);
      y += 3.2;
    }
  }
  y += 3;

  /* ——— npub ——— */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(28, 28, 28);
  doc.text(copy.npubLabel, margin, y);
  y += 4;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  for (const line of splitLines(doc, npub, maxW)) {
    doc.text(line, margin, y);
    y += 3.2;
  }
  y += 2;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  for (const line of splitLines(doc, copy.passphraseReminder, maxW)) {
    doc.text(line, margin, y);
    y += 3.3;
  }
  y += 4;

  /* ——— Confirmation code (centered) ——— */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(28, 28, 28);
  const codeTitleLines = splitLines(doc, copy.codeTitle, maxW);
  y = drawCenteredLines(doc, codeTitleLines, centerX, y, 3.8);
  y += 2;
  doc.setFont("courier", "bold");
  doc.setFontSize(16);
  doc.text(confirmationCode, centerX, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  const codeBodyLines = splitLines(doc, copy.codeBody, maxW - 6);
  y = drawCenteredLines(doc, codeBodyLines, centerX, y, 3.2);
  y += 5;

  /* ——— QR (centered, large) + recovery + stewardship ——— */
  const qrSize = 54;
  const qrLeft = centerX - qrSize / 2;

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 420,
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(28, 28, 28);
  const qrHeadLines = splitLines(doc, copy.qrTitle, maxW);
  y = drawCenteredLines(doc, qrHeadLines, centerX, y, 4.2);
  y += 3;

  const qrImgTop = y;
  doc.addImage(qrDataUrl, "PNG", qrLeft, qrImgTop, qrSize, qrSize);
  y = qrImgTop + qrSize + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  const qrLeadLines = splitLines(doc, copy.qrSectionLead, maxW - 10);
  y = drawCenteredLines(doc, qrLeadLines, centerX, y, 3.4);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(28, 28, 28);
  doc.text(copy.recoveryTitle, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  let n = 1;
  const webStepText = copy.recoveryWebStep.replace(/\{url\}/g, recoverUrl);
  for (const line of splitLines(doc, `${n}. ${webStepText}`, maxW)) {
    doc.text(line, margin, y);
    y += 3.4;
  }
  n += 1;
  for (const step of copy.recoverySteps) {
    for (const line of splitLines(doc, `${n}. ${step}`, maxW)) {
      doc.text(line, margin, y);
      y += 3.4;
    }
    n += 1;
  }
  y += 4;

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(35, 50, 95);
  for (const line of splitLines(doc, copy.stewardshipTitle, maxW)) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(45, 45, 50);
  for (const para of copy.stewardshipParagraphs) {
    for (const line of splitLines(doc, para, maxW)) {
      doc.text(line, margin, y);
      y += 3.3;
    }
    y += 2;
  }
  y += 3;

  /* ——— JSON block (minified, small type) ——— */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(28, 28, 28);
  doc.text(copy.jsonSectionTitle, margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  for (const line of splitLines(doc, copy.jsonSectionWarning, maxW)) {
    doc.text(line, margin, y);
    y += 3;
  }
  y += 2;
  doc.setTextColor(28, 28, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(copy.jsonTitle, margin, y);
  y += 4;

  doc.setFont("courier", "normal");
  let jsonFs = 4.5;
  doc.setFontSize(jsonFs);
  let jsonLines = doc.splitTextToSize(minifiedJson, maxW);
  const jsonLineH = 2.15;
  const footerReserve = 10;
  while (
    y + jsonLines.length * jsonLineH > pageH - footerReserve &&
    jsonFs >= 3.5
  ) {
    jsonFs -= 0.25;
    doc.setFontSize(jsonFs);
    jsonLines = doc.splitTextToSize(minifiedJson, maxW);
  }
  doc.setTextColor(35, 35, 40);
  for (const jl of jsonLines) {
    doc.text(jl, margin, y);
    y += jsonLineH;
  }
  y += 3;

  /* ——— Footer ——— */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 115);
  for (const line of splitLines(doc, copy.footer, maxW)) {
    doc.text(line, centerX, y, { align: "center" });
    y += 3;
  }

  return doc.output("blob");
}

export function triggerPdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
