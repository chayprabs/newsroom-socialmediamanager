import type { GeneratedPostData } from '../types';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function truncateText(text: string, maxChars: number) {
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

function formatValue(value: number) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return value > 0 ? `+${rounded}` : String(rounded);
}

function rowColor(row: GeneratedPostData['rows'][number]) {
  if (row.color) return row.color;
  if (row.value < 0) return '#D92D20';
  if (row.value > 0) return '#12B76A';
  return '#111111';
}

export function renderPostSvg(data: GeneratedPostData, template = '') {
  const width = 1080;
  const height = 1350;
  const maxValue = Math.max(...data.rows.map((row) => Math.abs(row.value)), 1);
  const rows = data.rows.slice(0, 8);
  const titleLines = wrapText(data.title || 'Untitled post', 34);
  const subtitleLines = wrapText(data.subtitle || '', 54);
  const chartTop = 430;
  const rowHeight = 84;
  const isDiverging = template.toLowerCase().includes('diverging') || rows.some((row) => row.value < 0);

  const rankedBars = rows
    .map((row, index) => {
      const y = chartTop + index * rowHeight;
      const barWidth = Math.max(8, (Math.abs(row.value) / maxValue) * 500);
      const color = rowColor(row);
      return `<text x="96" y="${y + 28}" fill="#333333" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(truncateText(row.label, 24))}</text>
    <rect x="380" y="${y}" width="500" height="36" rx="18" fill="#F1F1F1"/>
    <rect x="380" y="${y}" width="${barWidth}" height="36" rx="18" fill="${escapeXml(color)}"/>
    <text x="920" y="${y + 27}" fill="#111111" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(formatValue(row.value))}</text>`;
    })
    .join('\n    ');

  const divergingBars = rows
    .map((row, index) => {
      const y = chartTop + index * rowHeight;
      const axisX = 540;
      const maxBarWidth = 330;
      const barWidth = Math.max(8, (Math.abs(row.value) / maxValue) * maxBarWidth);
      const x = row.value < 0 ? axisX - barWidth : axisX;
      const valueX = row.value < 0 ? x - 16 : x + barWidth + 16;
      const anchor = row.value < 0 ? 'end' : 'start';
      return `<text x="96" y="${y + 28}" fill="#333333" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(truncateText(row.label, 28))}</text>
    <line x1="${axisX}" y1="${y - 12}" x2="${axisX}" y2="${y + 48}" stroke="#D5D5D5" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${barWidth}" height="36" rx="18" fill="${escapeXml(rowColor(row))}"/>
    <text x="${valueX}" y="${y + 27}" fill="#111111" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(formatValue(row.value))}</text>`;
    })
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#F8F8F8"/>
  <rect x="52" y="52" width="976" height="1246" rx="34" fill="#FFFFFF" stroke="#E5E5E5"/>
  ${titleLines
    .map((line, index) => `<text x="96" y="${160 + index * 62}" fill="#111111" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="500">${escapeXml(line)}</text>`)
    .join('\n  ')}
  ${subtitleLines
    .map((line, index) => `<text x="96" y="${330 + index * 34}" fill="#666666" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="400">${escapeXml(line)}</text>`)
    .join('\n  ')}
  <g>
    ${isDiverging ? divergingBars : rankedBars}
  </g>
  <text x="96" y="1234" fill="#888888" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="400">${escapeXml(data.footer || 'Data from: Crustdata')}</text>
</svg>`;
}
