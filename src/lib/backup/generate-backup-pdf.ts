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
  npubLabel: string;
  passphraseReminder: string;
  codeTitle: string;
  codeBody: string;
  downloadCheck: string;
  qrTitle: string;
  jsonTitle: string;
  recoveryTitle: string;
  recoverySteps: string[];
  footer: string;
};

function splitLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * Builds a client-side PDF with npub, warnings, confirmation code, QR of encrypted bundle, and full JSON text.
 */
export async function buildVaultBackupPdfBlob(
  args: {
    npub: string;
    identityId: string;
    vault: VaultPayload;
    confirmationCode: string;
    copy: BackupPdfCopy;
  },
): Promise<Blob> {
  const { npub, identityId, vault, confirmationCode, copy } = args;
  const bundle = buildOfflineVaultBundle(identityId, npub, vault);
  const qrPayload = serializeOfflineBundleForQr(bundle);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW =
    (doc.internal.pageSize as { width?: number; getWidth?: () => number })
      .width ??
    doc.internal.pageSize.getWidth?.() ??
    210;
  const margin = 14;
  const maxW = pageW - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(copy.title, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of splitLines(doc, copy.subtitle, maxW)) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  doc.setDrawColor(180, 40, 40);
  doc.setLineWidth(0.4);
  const critTop = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(120, 20, 20);
  doc.text(copy.criticalTitle, margin + 2, y + 5);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const bullet of copy.criticalBullets) {
    for (const line of splitLines(doc, `• ${bullet}`, maxW - 4)) {
      doc.text(line, margin + 2, y);
      y += 4;
    }
  }
  doc.rect(margin, critTop, maxW, y - critTop + 2);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(copy.npubLabel, margin, y);
  y += 6;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  for (const line of splitLines(doc, npub, maxW)) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  for (const line of splitLines(doc, copy.passphraseReminder, maxW)) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(copy.codeTitle, margin, y);
  y += 7;
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text(confirmationCode, margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const line of splitLines(doc, copy.codeBody, maxW)) {
    doc.text(line, margin, y);
    y += 4;
  }
  y += 6;

  if (y > 240) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(copy.qrTitle, margin, y);
  y += 6;

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
  const qrSize = 55;
  doc.addImage(qrDataUrl, "PNG", margin, y, qrSize, qrSize);
  y += qrSize + 8;

  doc.setFont("helvetica", "bold");
  doc.text(copy.jsonTitle, margin, y);
  y += 6;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  const jsonLines = splitLines(doc, qrPayload, maxW);
  for (const line of jsonLines) {
    if (y > 285) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 3.2;
  }
  y += 6;

  if (y > 250) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(copy.recoveryTitle, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let n = 1;
  for (const step of copy.recoverySteps) {
    for (const line of splitLines(doc, `${n}. ${step}`, maxW)) {
      doc.text(line, margin, y);
      y += 4.5;
    }
    n += 1;
  }
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  for (const line of splitLines(doc, copy.footer, maxW)) {
    doc.text(line, margin, y);
    y += 4;
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
