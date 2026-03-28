import { lookupChord, stringCount, stringNames } from '../chords/index.js';
import { extractChords } from '../song.js';

const FRETS_SHOWN = 4;
const SVG_STRING_GAP = 18;
const SVG_FRET_GAP = 20;
const SVG_MARGIN = 20;
const SVG_NUT_HEIGHT = 6;
const SVG_DOT_R = 7;

function svgDiagram(chordName, instrument, customChords) {
  const def = lookupChord(chordName, instrument, customChords);
  const nStrings = stringCount(instrument);
  const strNames = stringNames(instrument);

  const svgW = SVG_MARGIN * 2 + (nStrings - 1) * SVG_STRING_GAP;
  const svgH = SVG_MARGIN + SVG_NUT_HEIGHT + FRETS_SHOWN * SVG_FRET_GAP + SVG_MARGIN + 16;

  if (!def) {
    return `<div class="chord-diagram"><div class="chord-name">${esc(chordName)}</div><div class="chord-unknown">?</div></div>`;
  }

  const x = (s) => SVG_MARGIN + s * SVG_STRING_GAP;
  const y = (f) => SVG_MARGIN + SVG_NUT_HEIGHT + f * SVG_FRET_GAP;

  let svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">`;

  // Fret lines
  for (let f = 0; f <= FRETS_SHOWN; f++) {
    const ly = y(f);
    const strokeW = (f === 0 && def.baseFret === 1) ? SVG_NUT_HEIGHT : 1;
    svg += `<line x1="${x(0)}" y1="${ly}" x2="${x(nStrings-1)}" y2="${ly}" stroke="#333" stroke-width="${strokeW}"/>`;
  }

  // String lines
  for (let s = 0; s < nStrings; s++) {
    svg += `<line x1="${x(s)}" y1="${y(0)}" x2="${x(s)}" y2="${y(FRETS_SHOWN)}" stroke="#333" stroke-width="1.5"/>`;
  }

  // Barre
  if (def.barre) {
    const barreY = y(def.barre.fret - def.baseFret + 1) - SVG_FRET_GAP / 2;
    svg += `<rect x="${x(def.barre.from)}" y="${barreY - SVG_DOT_R}" width="${(def.barre.to - def.barre.from) * SVG_STRING_GAP}" height="${SVG_DOT_R * 2}" rx="${SVG_DOT_R}" fill="#333"/>`;
  }

  // Finger dots
  for (let s = 0; s < nStrings; s++) {
    const fret = def.frets[s];
    if (fret <= 0) continue;
    const cx = x(s);
    const cy = y(fret - def.baseFret + 1) - SVG_FRET_GAP / 2;
    if (def.barre && fret === def.barre.fret && s >= def.barre.from && s <= def.barre.to) continue;
    svg += `<circle cx="${cx}" cy="${cy}" r="${SVG_DOT_R}" fill="#333"/>`;
  }

  // Open/muted above nut
  for (let s = 0; s < nStrings; s++) {
    const fret = def.frets[s];
    const cx = x(s);
    const topY = SVG_MARGIN - 4;
    if (fret === -1) {
      svg += `<text x="${cx}" y="${topY}" text-anchor="middle" font-size="12" font-family="monospace" fill="#333">x</text>`;
    } else if (fret === 0) {
      svg += `<circle cx="${cx}" cy="${topY - 4}" r="4" fill="none" stroke="#333" stroke-width="1.5"/>`;
    }
  }

  // baseFret label
  if (def.baseFret > 1) {
    svg += `<text x="${x(nStrings-1) + 6}" y="${y(0) + 4}" font-size="11" font-family="monospace" fill="#555">${def.baseFret}fr</text>`;
  }

  // String names at bottom
  for (let s = 0; s < nStrings; s++) {
    svg += `<text x="${x(s)}" y="${y(FRETS_SHOWN) + 14}" text-anchor="middle" font-size="10" font-family="monospace" fill="#555">${strNames[s]}</text>`;
  }

  svg += '</svg>';

  return `<div class="chord-diagram">
  <div class="chord-name">${esc(chordName)}</div>
  ${svg}
</div>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMeta(meta) {
  let html = '<header class="song-meta">';
  if (meta.title)  html += `<h1 class="song-title">${esc(meta.title)}</h1>`;
  if (meta.artist) html += `<p class="song-artist">${esc(meta.artist)}</p>`;
  const details = [];
  if (meta.key)   details.push(`Key: ${esc(meta.key)}`);
  if (meta.capo)  details.push(`Capo: fret ${meta.capo}`);
  if (meta.tempo) details.push(`Tempo: ${meta.tempo} BPM`);
  if (meta.time)  details.push(`Time: ${esc(meta.time)}`);
  if (details.length) {
    html += '<ul class="song-directives">' + details.map(d => `<li>${d}</li>`).join('') + '</ul>';
  }
  html += '</header>';
  return html;
}

function renderLyricsLine(line) {
  if (line.type === 'blank_line')   return '<div class="song-blank"></div>';
  if (line.type === 'comment_line') return `<div class="song-comment">${esc(line.text)}</div>`;

  const hasChords = line.segments.some(seg => seg.chord);

  const segs = line.segments.map(seg => {
    const chord = hasChords
      ? (seg.chord
          ? `<span class="chord">${esc(seg.chord)}</span>`
          : `<span class="chord chord--empty"></span>`)
      : '';
    const text = seg.text
      ? `<span class="lyric">${esc(seg.text)}</span>`
      : `<span class="lyric lyric--empty"> </span>`;
    return `<span class="segment">${chord}${text}</span>`;
  });

  return `<div class="song-line${hasChords ? '' : ' song-line--lyrics-only'}">${segs.join('')}</div>`;
}

// Group consecutive blockquote_lines together; everything else is a solo item
function groupLines(lines) {
  const groups = [];
  for (const line of lines) {
    if (line.type === 'blockquote_line') {
      if (groups.length && groups[groups.length - 1].isBlockquote) {
        groups[groups.length - 1].lines.push(line);
      } else {
        groups.push({ isBlockquote: true, lines: [line] });
      }
    } else {
      groups.push({ isBlockquote: false, lines: [line] });
    }
  }
  return groups;
}

function isSectionRef(group, sectionLabels) {
  if (group.lines.length !== 1) return false;
  const { segments } = group.lines[0];
  if (segments.length !== 1 || segments[0].chord) return false;
  return sectionLabels.has(segments[0].text.trim());
}

const SECTION_LABELS = {
  chorus: 'Chorus', verse: 'Verse', bridge: 'Bridge',
  tab: 'Tab', grid: 'Grid',
};

function renderSection(section, sectionLabels) {
  const label = section.label
    || (section.type !== 'default' ? SECTION_LABELS[section.type] || section.type : '');

  let html = `<section class="song-section song-section--${esc(section.type)}">`;
  if (label) html += `<h2 class="section-label">${esc(label)}</h2>`;

  for (const group of groupLines(section.lines)) {
    if (!group.isBlockquote) {
      html += renderLyricsLine(group.lines[0]);
    } else if (isSectionRef(group, sectionLabels)) {
      const refName = group.lines[0].segments[0].text.trim();
      html += `<div class="section-ref">↻ ${esc(refName)}</div>`;
    } else {
      html += '<blockquote class="song-blockquote">';
      html += group.lines.map(renderLyricsLine).join('');
      html += '</blockquote>';
    }
  }

  html += '</section>';
  return html;
}


export function render(song, options = {}) {
  const instrument = options.instrument || 'guitar';
  const showDiagrams = options.diagrams !== false;

  let body = renderMeta(song.meta);

  const customChords = song.meta.customChords || null;

  if (showDiagrams) {
    const chords = extractChords(song);
    if (chords.length > 0) {
      body += '<div class="chord-diagrams">';
      body += chords.map(c => svgDiagram(c, instrument, customChords)).join('\n');
      body += '</div>';
    }
  }

  const sectionLabels = new Set(song.sections.map(s => s.label).filter(Boolean));

  body += '<div class="song-body">';
  body += song.sections.map(s => renderSection(s, sectionLabels)).join('\n');
  body += '</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(song.meta.title || 'ChordPro Song')}</title>
<link rel="stylesheet" href="song.css">
</head>
<body>
<article class="song">
${body}
</article>
</body>
</html>
`;
}
