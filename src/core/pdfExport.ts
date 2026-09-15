// ─────────────────────────────────────────────────────────────────────────────
// MoodMap — PDF Export
//
// Generates a formatted PDF report from entry data and opens
// the native share sheet so users can save or send it.
// ─────────────────────────────────────────────────────────────────────────────

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { DailyAggregate, MonthlyStats } from '../data/storageTypes';

// ── Color helpers ─────────────────────────────────────────────────────────────

function scoreToColor(score: number): string {
  if (score >= 2)  return '#4CAF50';
  if (score >= -2) return '#C8973A';
  return '#EF5350';
}

function scoreToLabel(score: number): string {
  if (score >= 8)   return 'Exceptional';
  if (score >= 5)   return 'Very Positive';
  if (score >= 2)   return 'Generally Positive';
  if (score >= -1.99) return 'Neutral / Mixed';
  if (score >= -4.99) return 'Generally Negative';
  if (score >= -7.99) return 'Very Negative';
  return 'Difficult Day';
}

// ── Emotion color map ─────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  Joy:          '#FFD700',
  Trust:        '#90C97A',
  Anticipation: '#FFA500',
  Surprise:     '#A8D8EA',
  Fear:         '#7BC67E',
  Sadness:      '#6B9FD4',
  Disgust:      '#9B59B6',
  Anger:        '#E74C3C',
};

// ── SVG mini graph ────────────────────────────────────────────────────────────

function buildGraphSVG(entries: DailyAggregate[]): string {
  if (entries.length < 2) return '';

  const W    = 600;
  const H    = 180;
  const padX = 40;
  const padY = 20;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const scores = sorted.map(e => e.dailyScore);
  const n      = scores.length;

  const px = (i: number) => padX + (i / Math.max(n - 1, 1)) * innerW;
  const py = (s: number) => padY + (1 - (s + 10) / 20) * innerH;

  // Path
  const path = scores.map((s, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(s)}`).join(' ');

  // Trend line
  const meanX = scores.reduce((a, _, i) => a + px(i), 0) / n;
  const meanY = scores.reduce((a, s) => a + py(s), 0) / n;
  const slope = scores.reduce((a, s, i) => a + (px(i) - meanX) * (py(s) - meanY), 0) /
                scores.reduce((a, _, i) => a + (px(i) - meanX) ** 2, 1);
  const intercept = meanY - slope * meanX;
  const ty1 = slope * px(0) + intercept;
  const ty2 = slope * px(n - 1) + intercept;

  // Dots
  const dots = scores.map((s, i) =>
    `<circle cx="${px(i)}" cy="${py(s)}" r="5"
      fill="${s >= 0 ? '#4CAF50' : '#EF5350'}"
      stroke="white" stroke-width="2"/>`
  ).join('');

  // Y axis labels
  const yLabels = [10, 5, 0, -5, -10].map(v =>
    `<text x="${padX - 8}" y="${py(v) + 4}"
      font-size="10" fill="#666" text-anchor="end">${v > 0 ? '+' : ''}${v}</text>`
  ).join('');

  // X axis date labels (first, middle, last)
  const xLabels = [0, Math.floor(n / 2), n - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map(i => {
      const d = new Date(sorted[i].date + 'T12:00:00');
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<text x="${px(i)}" y="${H - 2}"
        font-size="10" fill="#666" text-anchor="middle">${label}</text>`;
    }).join('');

  return `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${W}" height="${H}" fill="#252540" rx="8"/>
      <!-- Zero line -->
      <line x1="${padX}" y1="${py(0)}" x2="${W - padX}" y2="${py(0)}"
        stroke="#3A3A5C" stroke-width="1"/>
      <!-- Trend line -->
      <line x1="${px(0)}" y1="${ty1}" x2="${px(n-1)}" y2="${ty2}"
        stroke="#C8973A" stroke-width="2" stroke-dasharray="4 3"/>
      <!-- Score line -->
      <path d="${path}" fill="none" stroke="white"
        stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Dots -->
      ${dots}
      <!-- Y labels -->
      ${yLabels}
      <!-- X labels -->
      ${xLabels}
    </svg>`;
}

// ── HTML report builder ───────────────────────────────────────────────────────

function buildHTML(
  entries:     DailyAggregate[],
  monthStats:  MonthlyStats[],
  dateRange:   { from: string; to: string },
  includeNotes: boolean,
): string {
  const sorted     = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const scores     = sorted.map(e => e.dailyScore);
  const avgScore   = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const highScore  = scores.length > 0 ? Math.max(...scores) : 0;
  const lowScore   = scores.length > 0 ? Math.min(...scores) : 0;

  // Most common emotion
  const allEmotions = entries.flatMap(e => e.emotions.map(em => em.coreEmotion));
  const counts      = new Map<string, number>();
  allEmotions.forEach(em => counts.set(em, (counts.get(em) ?? 0) + 1));
  const topEmotion  = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const avgIntensity = entries.length > 0
    ? entries.flatMap(e => e.emotions.map(em => em.intensity))
        .reduce((a, b) => a + b, 0) /
      entries.flatMap(e => e.emotions).length
    : 0;

  const fromDate = new Date(dateRange.from + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const toDate   = new Date(dateRange.to + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const generated = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const avgColor  = scoreToColor(avgScore);
  const avgLabel  = scoreToLabel(avgScore);
  const graphSVG  = buildGraphSVG(sorted);

  // Monthly breakdown rows
  const monthRows = monthStats.map(m => `
    <tr>
      <td>${new Date(m.yearMonth + '-01T12:00:00')
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
      <td style="color:${scoreToColor(m.avgScore)};font-weight:700;">
        ${m.avgScore > 0 ? '+' : ''}${m.avgScore.toFixed(2)}
      </td>
      <td>${m.entryCount}</td>
      <td style="color:#4CAF50;">+${m.highScore.toFixed(1)}</td>
      <td style="color:#EF5350;">${m.lowScore.toFixed(1)}</td>
      <td>${m.topEmotion || '—'}</td>
      <td>${m.longestStreak > 0 ? `${m.longestStreak} days` : '—'}</td>
    </tr>
  `).join('');

  // Individual entry (day) rows
  const entryRows = sorted.reverse().map(entry => {
    const d = new Date(entry.date + 'T12:00:00')
      .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const emotionList = entry.emotions.map(e =>
      '<span style="color:' + (EMOTION_COLORS[e.coreEmotion] ?? '#fff') + ';font-weight:600;">' +
      e.derivative + '</span>'
    ).join(', ');

    const noteDivs = entry.emotions.map(e => {
      const borderColor = EMOTION_COLORS[e.coreEmotion] ?? '#6B4FA0';
      const nameColor   = EMOTION_COLORS[e.coreEmotion] ?? '#fff';
      return '<div style="margin-top:4px;padding:8px 12px;background:#1A1A2E;' +
        'border-radius:4px;font-size:11px;color:#ccc;line-height:1.6;' +
        'border-left:3px solid ' + borderColor + ';">' +
        '<strong style="color:' + nameColor + ';">' +
        e.derivative + ' (intensity ' + e.intensity + '):</strong><br/>' +
        e.journalNote +
        '</div>';
    }).join('');

    const scoreColor  = scoreToColor(entry.dailyScore);
    const scorePrefix = entry.dailyScore > 0 ? '+' : '';
    const scoreVal    = entry.dailyScore.toFixed(2);
    const scoreLabel  = scoreToLabel(entry.dailyScore);
    const sessionNote = entry.sessionCount > 1
      ? ' <span style="color:#888;font-size:10px;">(' + entry.sessionCount + ' entries, averaged)</span>'
      : '';

    let rows = '<tr>' +
      '<td style="white-space:nowrap;">' + d + '</td>' +
      '<td style="color:' + scoreColor + ';font-weight:700;">' + scorePrefix + scoreVal + sessionNote + '</td>' +
      '<td style="font-size:12px;color:#888;">' + scoreLabel + '</td>' +
      '<td>' + emotionList + '</td>' +
      '<td>' + entry.totalIntensity + '</td>' +
      '</tr>';

    if (includeNotes) {
      rows += '<tr><td colspan="5" style="padding:4px 12px 12px;background:#1f1f38;">' +
        noteDivs +
        '</td></tr>';
    }

    return rows;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, Arial, sans-serif;
      background: #1A1A2E;
      color: #ffffff;
      padding: 32px;
      font-size: 13px;
    }
    .header {
      border-bottom: 2px solid #6B4FA0;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .app-name {
      font-size: 28px;
      font-weight: 800;
      color: #9B7DC8;
      letter-spacing: 1px;
    }
    .report-title {
      font-size: 16px;
      color: #C8973A;
      margin-top: 4px;
    }
    .meta {
      font-size: 11px;
      color: #666;
      margin-top: 8px;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #9B7DC8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 1px solid #3A3A5C;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #252540;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      border: 1px solid #3A3A5C;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.1;
    }
    .stat-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .score-badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      color: #1A1A2E;
      margin-top: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #252540;
      color: #9B7DC8;
      text-align: left;
      padding: 10px 12px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #3A3A5C;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #252540;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #1f1f38; }
    .privacy-notice {
      background: #252540;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 11px;
      color: #666;
      line-height: 1.6;
      border: 1px solid #3A3A5C;
      margin-top: 32px;
    }
    .graph-container {
      margin: 0 0 8px 0;
    }
    .legend {
      display: flex;
      gap: 20px;
      font-size: 10px;
      color: #666;
      margin-top: 8px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .legend-line {
      width: 20px;
      height: 2px;
      background: #C8973A;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="app-name">MoodMap</div>
    <div class="report-title">Emotional Wellness Report</div>
    <div class="meta">
      Period: ${fromDate} — ${toDate} &nbsp;·&nbsp;
      Generated: ${generated} &nbsp;·&nbsp;
      ${entries.length} days logged
    </div>
  </div>

  <!-- Summary stats -->
  <div class="section">
    <div class="section-title">Summary</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:${avgColor};">
          ${avgScore > 0 ? '+' : ''}${avgScore.toFixed(2)}
        </div>
        <div class="score-badge" style="background:${avgColor};">${avgLabel}</div>
        <div class="stat-label">Average Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#4CAF50;">
          +${highScore.toFixed(2)}
        </div>
        <div class="stat-label">Highest Day</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#EF5350;">
          ${lowScore.toFixed(2)}
        </div>
        <div class="stat-label">Hardest Day</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#9B7DC8;">${topEmotion}</div>
        <div class="stat-label">Most Common Emotion</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avgIntensity.toFixed(1)}</div>
        <div class="stat-label">Avg Intensity</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${entries.length}</div>
        <div class="stat-label">Total Days Logged</div>
      </div>
    </div>
  </div>

  <!-- Graph -->
  ${graphSVG ? `
  <div class="section">
    <div class="section-title">Score Over Time</div>
    <div class="graph-container">${graphSVG}</div>
    <div class="legend">
      <div class="legend-item">
        <div class="legend-dot" style="background:#4CAF50;"></div>
        Positive day
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background:#EF5350;"></div>
        Negative day
      </div>
      <div class="legend-item">
        <div class="legend-line"></div>
        Trend line
      </div>
    </div>
  </div>` : ''}

  <!-- Monthly breakdown -->
  ${monthStats.length > 0 ? `
  <div class="section">
    <div class="section-title">Monthly Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th>Avg Score</th>
          <th>Days Logged</th>
          <th>Best Day</th>
          <th>Hardest Day</th>
          <th>Top Emotion</th>
          <th>Streak</th>
        </tr>
      </thead>
      <tbody>${monthRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Entry log -->
  <div class="section">
    <div class="section-title">
      Entry Log ${includeNotes ? '(with journal notes)' : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Score</th>
          <th>Label</th>
          <th>Emotions</th>
          <th>Total Intensity</th>
        </tr>
      </thead>
      <tbody>${entryRows}</tbody>
    </table>
  </div>

  <!-- Privacy notice -->
  <div class="privacy-notice">
    <strong style="color:#9B7DC8;">Privacy Notice</strong><br/>
    This report was generated from data stored privately on the user's device.
    All emotional data and journal notes are the personal property of the user.
    This report was shared voluntarily and should be treated as confidential
    health information. MoodMap does not store, transmit, or have access to
    any user data.
  </div>

</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ReportOptions {
  entries:      DailyAggregate[];
  monthStats:   MonthlyStats[];
  dateRange:    { from: string; to: string };
  includeNotes: boolean;
}

/**
 * Generates a PDF report and opens the native share sheet.
 * Returns true if the report was generated successfully.
 */
export async function generateAndShareReport(
  options: ReportOptions,
): Promise<boolean> {
  try {
    const html = buildHTML(
      options.entries,
      options.monthStats,
      options.dateRange,
      options.includeNotes,
    );

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      console.error('Sharing not available on this device');
      return false;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share MoodMap Report',
      UTI: 'com.adobe.pdf',
    });

    return true;
  } catch (e) {
    console.error('Failed to generate report:', e);
    return false;
  }
}