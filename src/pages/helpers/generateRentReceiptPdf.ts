import jsPDF from "jspdf";
import { parseReferenceMonthToDate } from "../utils";

type ReceiptArgs = {
  propertyName: string;
  propertyAddress?: string;
  responsibleName: string;
  referenceMonth: string;
  amount: number;
  paidAt: Date;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatBR = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

const formatDateExtensoBR = (d: Date) =>
  d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatMoneyBR = (v: number) => v.toFixed(2).replace(".", ",");

function drawJustifiedParagraph(opts: {
  doc: jsPDF;
  text: string;
  x: number;
  y: number;
  width: number;
  lineHeight: number;
}) {
  const { doc, text, x, y, width, lineHeight } = opts;
  const lines = doc.splitTextToSize(text, width) as string[];

  let cursorY = y;

  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i]).trim();
    const isLast = i === lines.length - 1;

    if (isLast || !line.includes(" ")) {
      doc.text(line, x, cursorY);
      cursorY += lineHeight;
      continue;
    }

    const words = line.split(/\s+/).filter(Boolean);
    const gaps = words.length - 1;
    if (gaps <= 0) {
      doc.text(line, x, cursorY);
      cursorY += lineHeight;
      continue;
    }

    const wordsWidth = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
    const extra = Math.max(0, width - wordsWidth);
    const gapWidth = extra / gaps;

    let cursorX = x;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      doc.text(word, cursorX, cursorY);
      cursorX += doc.getTextWidth(word);
      if (w < words.length - 1) cursorX += gapWidth;
    }

    cursorY += lineHeight;
  }
}

function drawRubrica(opts: {
  doc: jsPDF;
  name: string;
  marginX: number;
  yFromBottom: number;
}) {
  const { doc, name, marginX, yFromBottom } = opts;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const y = pageH - yFromBottom;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(18);
  doc.setTextColor(40);

  const textW = doc.getTextWidth(name);
  const x = Math.max(marginX, pageW - marginX - textW);

  doc.text(name, x, y, { angle: -6 });

  // “swoosh” embaixo
  doc.setDrawColor(40);
  doc.setLineWidth(0.6);
  doc.lines(
    [[textW * 0.35, 2, textW * 0.65, -2, textW, 0]],
    x,
    y + 4,
    [1, 1],
    "S"
  );

  doc.setTextColor(0);
}

export function downloadRentReceiptPdf(args: ReceiptArgs) {
  const {
    propertyName,
    propertyAddress,
    responsibleName,
    referenceMonth,
    amount,
    paidAt,
  } = args;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a6",
  });

  const title = "RECIBO DE PAGAMENTO DE ALUGUEL";

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const marginX = 20;
  const marginTop = 8;
  const width = pageW - marginX * 2;

  const refDate = parseReferenceMonthToDate(referenceMonth);

  const referenceMonthExtenso = refDate
    ? formatDateExtensoBR(refDate).replace(/^\d+\s+de\s+/i, "")
    : referenceMonth;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, pageW / 2, marginTop, { align: "center" });

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const paragraph =
    `Recebemos de ${responsibleName} a quantia de R$ ${formatMoneyBR(
      amount
    )}, ` +
    `referente ao pagamento do aluguel do mês de ${referenceMonthExtenso}, ` +
    `do imóvel ${propertyName}, situado em ${
      propertyAddress || "endereço não informado"
    }. ` +
    `O pagamento foi realizado em ${formatBR(paidAt)}. ` +
    `Para os devidos fins, firmo o presente recibo, dando plena e geral quitação para este mês.`;

  const startY = marginTop + 18;

  const lineHeight = 7;

  drawJustifiedParagraph({
    doc,
    text: paragraph,
    x: marginX,
    y: startY,
    width,
    lineHeight,
  });

  // ---- Local e data (2 linhas acima da rubrica) ----
  const rubricaYFromBottom = 18;
  const rubricaY = pageH - rubricaYFromBottom;
  const locationDateY = rubricaY - lineHeight * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Manaus, ${formatDateExtensoBR(paidAt)}`, marginX, locationDateY);

  // Rubrica
  drawRubrica({
    doc,
    name: "Residencial Olimpio",
    marginX,
    yFromBottom: rubricaYFromBottom,
  });

  const fileSafeMonth = referenceMonth.replace(/[^\w-]/g, "_");
  const fileName = `recibo_aluguel_${fileSafeMonth}_${propertyName
    .slice(0, 30)
    .replace(/[^\w-]/g, "_")}.pdf`;

  doc.save(fileName);
}
