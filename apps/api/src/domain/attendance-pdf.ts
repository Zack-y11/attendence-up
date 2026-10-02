import PDFDocument from 'pdfkit';

export type AttendancePdfHeading = {
  university: string;
  faculty: string;
  career: string;
  attendanceLine: string;
  instructorLine: string;
  logo: Buffer | null;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

const INK = '#1c2430';
const MUTED = '#5c6675';
const RULE = '#e4ddd0';
const CARD_FILL = '#fbfaf8';
const CARD_STROKE = '#d9d1c3';
const GRID_COLUMNS = 2;
const GRID_GAP = 8;
const CARD_PAD_X = 7;
const CARD_PAD_Y = 5;
const FIELD_GAP = 3;
const LABEL_FONT = 7;
const VALUE_FONT = 8.5;
const LABEL_SHARE = 0.4;
const SIGNATURE_HEIGHT = 26;

type FieldLayout = {
  labelLines: string[];
  valueLines: string[];
  signature: Buffer | null;
  height: number;
};

type CardLayout = {
  fields: FieldLayout[];
  height: number;
  labelWidth: number;
  valueWidth: number;
};

function drawBrandMark(doc: PdfDoc, x: number, y: number, size: number) {
  const scale = size / 40;
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  doc.roundedRect(0, 0, 40, 40, 10).fill('#2563EB');
  doc.save();
  doc.lineWidth(3.5).lineCap('round').lineJoin('round').strokeColor('#ffffff');
  doc.moveTo(12, 21).lineTo(17, 26).lineTo(28, 14).stroke();
  doc.restore();
  doc.circle(28, 14, 2.5).fill('#14B8A6');
  doc.save();
  doc.lineWidth(2).lineCap('round').strokeColor('#ffffff').opacity(0.6);
  doc.moveTo(22, 28).lineTo(15, 28).stroke();
  doc.restore();
  doc.restore();
}

function drawUniversityHeader(doc: PdfDoc, heading: AttendancePdfHeading) {
  const pageLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const logoSize = 72;
  const top = doc.y;
  if (heading.logo) {
    doc.image(heading.logo, pageLeft, top, { fit: [logoSize, logoSize] });
  } else {
    drawBrandMark(doc, pageLeft, top, logoSize);
  }
  const textX = pageLeft + logoSize + 16;
  const textWidth = pageWidth - logoSize - 16;
  const institution = [heading.university, heading.faculty, heading.career].filter(
    (line) => line.trim() !== '',
  );
  let textY = top;
  institution.forEach((line, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(index === 0 ? 14 : 11)
      .fillColor(INK)
      .text(line, textX, textY, { width: textWidth, align: 'center' });
    textY = doc.y + 2;
  });
  doc.y = Math.max(textY, top + logoSize) + 10;
  doc.x = pageLeft;
  if (heading.attendanceLine) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(heading.attendanceLine, {
      align: 'left',
      width: pageWidth,
    });
  }
  if (heading.instructorLine) {
    doc.font('Helvetica').fontSize(11).fillColor(INK).text(heading.instructorLine, {
      align: 'left',
      width: pageWidth,
    });
  }
}

function wrapLines(measure: (value: string) => number, text: string, width: number): string[] {
  const source = text.length > 0 ? text : '—';
  const lines: string[] = [];
  const limit = Math.max(width, 8);
  for (const paragraph of source.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (word.length === 0) continue;
      if (measure(candidate) <= limit) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word) <= limit) {
        line = word;
        continue;
      }
      let chunk = '';
      for (const char of word) {
        const next = chunk + char;
        if (chunk.length === 0 || measure(next) <= limit) chunk = next;
        else {
          lines.push(chunk);
          chunk = char;
        }
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : ['—'];
}

function lineHeight(doc: PdfDoc): number {
  return doc.currentLineHeight(true);
}

function paint(doc: PdfDoc, draw: () => void) {
  const bottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  draw();
  doc.page.margins.bottom = bottom;
}

function layoutCard(
  doc: PdfDoc,
  headers: string[],
  cells: string[],
  signature: Buffer | null,
  signatureColumn: number,
  cardWidth: number,
): CardLayout {
  const inner = cardWidth - CARD_PAD_X * 2;
  const labelWidth = Math.max(72, Math.floor(inner * LABEL_SHARE));
  const valueWidth = Math.max(48, inner - labelWidth - 6);
  const fields: FieldLayout[] = headers.map((header, index) => {
    const image = signature && index === signatureColumn ? signature : null;
    doc.font('Helvetica-Bold').fontSize(LABEL_FONT);
    const labelLine = lineHeight(doc);
    const labelLines = wrapLines((value) => doc.widthOfString(value), header, labelWidth);
    doc.font('Helvetica').fontSize(VALUE_FONT);
    const valueLine = lineHeight(doc);
    const valueLines = image
      ? []
      : wrapLines((value) => doc.widthOfString(value), cells[index] ?? '', valueWidth);
    const height = Math.max(
      labelLines.length * labelLine,
      image ? SIGNATURE_HEIGHT : valueLines.length * valueLine,
    );
    return { labelLines, valueLines, signature: image, height };
  });
  const height =
    fields.length === 0
      ? CARD_PAD_Y * 2
      : CARD_PAD_Y * 2 +
        fields.reduce((sum, field) => sum + field.height, 0) +
        FIELD_GAP * (fields.length - 1);
  return { fields, height, labelWidth, valueWidth };
}

function drawLines(
  doc: PdfDoc,
  lines: string[],
  x: number,
  y: number,
  width: number,
  leading: number,
) {
  lines.forEach((line, index) => {
    paint(doc, () => {
      doc.text(line, x, y + index * leading, { width, lineBreak: false });
    });
  });
}

function drawCard(
  doc: PdfDoc,
  card: CardLayout,
  x: number,
  y: number,
  width: number,
  boxHeight: number,
) {
  doc.save();
  doc.lineWidth(0.8);
  doc.roundedRect(x, y, width, boxHeight, 3).fillAndStroke(CARD_FILL, CARD_STROKE);
  doc.restore();

  const labelX = x + CARD_PAD_X;
  const valueX = labelX + card.labelWidth + 6;
  let cursor = y + CARD_PAD_Y;
  card.fields.forEach((field, index) => {
    doc.font('Helvetica-Bold').fontSize(LABEL_FONT).fillColor(MUTED);
    const labelLeading = lineHeight(doc);
    drawLines(doc, field.labelLines, labelX, cursor, card.labelWidth, labelLeading);

    const signature = field.signature;
    if (signature) {
      paint(doc, () => {
        doc.image(signature, valueX, cursor, {
          fit: [card.valueWidth, SIGNATURE_HEIGHT],
        });
      });
    } else {
      doc.font('Helvetica').fontSize(VALUE_FONT).fillColor(INK);
      const valueLeading = lineHeight(doc);
      drawLines(doc, field.valueLines, valueX, cursor, card.valueWidth, valueLeading);
    }

    cursor += field.height;
    if (index < card.fields.length - 1) {
      const ruleY = cursor + FIELD_GAP / 2;
      doc.save();
      doc
        .moveTo(labelX, ruleY)
        .lineTo(x + width - CARD_PAD_X, ruleY)
        .lineWidth(0.4)
        .strokeColor(RULE)
        .stroke();
      doc.restore();
      cursor += FIELD_GAP;
    }
  });
}

function drawStudentGrid(
  doc: PdfDoc,
  input: {
    headers: string[];
    rows: string[][];
    signatures: (Buffer | null)[];
    signatureColumn: number;
  },
) {
  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cardWidth = (pageWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const top = () => doc.page.margins.top;
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  if (input.rows.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(INK).text('No attendance records.');
    return;
  }

  let y = doc.y;
  for (let index = 0; index < input.rows.length; index += GRID_COLUMNS) {
    const cards = input.rows
      .slice(index, index + GRID_COLUMNS)
      .map((row, offset) =>
        layoutCard(
          doc,
          input.headers,
          row,
          input.signatureColumn >= 0 ? (input.signatures[index + offset] ?? null) : null,
          input.signatureColumn,
          cardWidth,
        ),
      );
    const rowHeight = Math.max(...cards.map((card) => card.height));
    if (y + rowHeight > bottom() && y > top() + 0.5) {
      doc.addPage();
      y = top();
    }
    cards.forEach((card, offset) => {
      drawCard(doc, card, left + offset * (cardWidth + GRID_GAP), y, cardWidth, card.height);
    });
    y += rowHeight + GRID_GAP;
  }
}

export function renderAttendancePdf(input: {
  heading: AttendancePdfHeading;
  headers: string[];
  rows: string[][];
  signatures: (Buffer | null)[];
  signatureColumn: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'portrait',
      margin: 40,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawUniversityHeader(doc, input.heading);
    doc.moveDown(0.6);
    doc.fillColor(INK);
    drawStudentGrid(doc, input);
    doc.end();
  });
}
