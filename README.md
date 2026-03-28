# Inlay

A Markdown-based musical tablature parser inspired by [ChordPro](https://github.com/ChordPro/chordpro). Write songs in plain `.md` files — compatible with [Obsidian](https://obsidian.md) vaults — and render them as printable chord sheets with diagrams for guitar or ukulele.

---

## Features

- Inline chord markers (`[C]`, `[G7]`, `[Bm]`) rendered above lyrics
- YAML frontmatter for song metadata
- Guitar (EADGBE) and ukulele (GCEA) chord diagram databases
- Custom chord definitions per song
- SVG chord diagrams in HTML output
- 2-column print layout — fits most songs on one page
- ASCII output for terminal use
- Obsidian-compatible: `.md` files render naturally in the vault

---

## Quick Start

```bash
# ASCII output (guitar, stdout)
node src/cli.js examples/wonderwall.md

# HTML output (auto-saved to ./output/)
node src/cli.js examples/wonderwall.md --format html

# Ukulele chord diagrams
node src/cli.js examples/wonderwall.md --format html --instrument ukulele

# Open the result
open output/wonderwall.html
```

---

## CLI

```
node src/cli.js <file.md> [options]

Options:
  --instrument  guitar | ukulele     default: guitar
  --format      ascii | html         default: ascii
  --no-diagrams                      suppress chord diagrams
  --output      <path>               override output path (HTML only)
  --help
```

HTML files are written to `./output/<name>.html` by default, with `song.css` copied alongside them.

---

## Song File Format

Files are standard Markdown with a YAML frontmatter block. They open and display correctly in Obsidian.

### Frontmatter

```yaml
---
title: Wonderwall
artist: Oasis
key: F#m
capo: 2
tempo: 87
time: 4/4
---
```

| Field      | Description                  |
|------------|------------------------------|
| `title`    | Song title                   |
| `artist`   | Artist / composer            |
| `key`      | Key signature (e.g. `F#m`)   |
| `capo`     | Capo fret number             |
| `tempo`    | BPM                          |
| `time`     | Time signature (e.g. `4/4`)  |

### Sections

Use `##` headings to define sections. The type is inferred from the label:

```md
## Verse 1

## Chorus

## Pre-Chorus

## Bridge

## Interlude

## Outro
```

### Chords

Embed chords inline using square brackets immediately before the syllable they land on:

```md
[Em7]Today is gonna be the day that they're [G]gonna throw it back to [Dsus4]you
```

Lines with no chord markers are treated as pure lyrics.

### Blockquotes

Prefix lines with `> ` to mark them as a chorus or highlighted passage. They render with a distinct left-border style in HTML.

```md
## Chorus

> It can [E]hit you, it can [D]hurt you
> [A]Make you [F#m]sore and what is [Bm]more
```

To reference a section later without repeating the lyrics, use a single blockquote line whose text matches the section heading exactly:

```md
## Verse 2

Some lyrics here...

> Chorus
```

This renders as a `↻ Chorus` repeat marker.

### Custom Chord Definitions

Define non-standard or slash chords in the frontmatter using ChordPro-style `define` strings. Custom definitions take priority over the built-in database.

```yaml
---
title: Beware of Darkness
artist: George Harrison
instrument: ukulele
define:
  - "B/A frets 4 3 2 0 fingers 3 2 1 0"
  - "C#m/B frets 1 1 0 2 fingers 1 2 0 3"
  - "E frets 1 4 0 2 fingers 1 4 0 2"
---
```

Define string format: `<name> frets <f1> <f2> ... fingers <n1> <n2> ...`

Fret values: `0` = open string, `-1` = muted (×).

---

## Example

```md
---
title: Wonderwall
artist: Oasis
key: F#m
capo: 2
tempo: 87
---

## Verse 1

[Em7]Today is gonna be the day that they're [G]gonna throw it back to [Dsus4]you
[Em7]By now you should've somehow real[G]ized what you gotta [Dsus4]do

## Chorus

> [C]And all the roads we have to [Em7]walk are winding
> [C]And all the lights that lead us [Em7]there are blinding
```

---

## Styling

HTML output uses an external `song.css` (copied to the output directory). Edit it directly to customise fonts, colours, and layout.

Key classes:

| Class               | Element                          |
|---------------------|----------------------------------|
| `.song-title`       | Title heading                    |
| `.chord`            | Chord name above lyric           |
| `.lyric`            | Lyric text                       |
| `.song-blockquote`  | Blockquoted passage (chorus)     |
| `.section-ref`      | `↻ Section` repeat marker        |
| `.chord-diagrams`   | Diagram grid                     |
| `.song-body`        | 2-column song content area       |

The stylesheet includes a `@media print` block that tightens spacing and scales diagrams for single-page printing.

---

## Chord Database

Built-in chords cover the most common voicings across all 12 keys:

`maj` `m` `7` `maj7` `m7` `sus2` `sus4` `dim` `aug`

For both **guitar** (EADGBE) and **ukulele** (GCEA).

Slash chords and unusual voicings can be added per-song via `define:` in frontmatter (see above).

---

## Project Structure

```
src/
  cli.js                 Entry point
  parser.js              Markdown + frontmatter parser
  song.js                Song data model
  chords/
    index.js             Chord lookup (with enharmonic fallback)
    guitar.js            Guitar chord database
    ukulele.js           Ukulele chord database
  renderers/
    ascii.js             Plain-text renderer
    html.js              HTML + SVG renderer
    song.css             Stylesheet (edit to customise)
examples/
  wonderwall.md
  Beware_of_Darkness.md
output/                  Generated HTML files (gitignored)
```

---

## Requirements

Node.js 18+. No npm dependencies.
