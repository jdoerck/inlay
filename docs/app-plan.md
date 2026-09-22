# Inlay — macOS / iOS app plan

Status: draft, 2026-09-22
Scope: native app that reads the existing `.md` song format and presents it as a playable chart on Mac, iPhone and iPad.

---

## 1. Premise

The CLI already parses the format and renders it ([src/parser.js](../src/parser.js), [src/renderers/html.js](../src/renderers/html.js)). The app is the same parse plus a screen you can read from six feet away while holding an instrument.

The thing that makes it not-another-songbook-app: **the folder of `.md` files is the library**. No import, no app-owned database, no account. Edit in Obsidian on the laptop, open on the iPad, same file.

---

## 2. Market

Checked 2026-09-22.

Existing iOS/iPadOS competitors:

| App | Model | Notes |
|---|---|---|
| OnSong 2026 | subscription | deepest features, MIDI, pedals, external display. Users angry about the subscription conversion; iOS 26 crash reports |
| SongbookPro | ~$7 one-time (Groups is subscription) | cheap, cross-platform, billing complaints |
| SongSheet Pro | free + lifetime unlock IAP | long-lived, loyal users, imports ChordPro/PDF/RTF |
| SongBook Chordpro | paid | original ChordPro app, transpose/autoscroll/MIDI |
| MySongbook | paid | widest instrument coverage (guitar, bass, uke, banjo, mandolin, cuatro) |

Obsidian-side plugins: Chord Sheets, ChordPro Viewer, Markdown Chords, Chord Lyrics. All render inside the vault on desktop. None is a stage app.

**Read:** the performance-app category is saturated and has a decade of feature moat. The gap is between the two groups - vault-native files on one side, stage-ready presentation on the other. Nobody bridges it.

Secondary opening: OnSong churn from the subscription move. One-time price is table stakes here.

Position: small tool, plain files, no account, one-time purchase. Do not compete on feature count.

Sources:
- https://onsongapp.com/pricing/
- https://songbook-pro.com/pricing/
- https://songsheetapp.com/en-US/
- https://apps.apple.com/us/app/songbook-chordpro/id392888837
- https://apps.apple.com/app/id504497717
- https://community.obsidian.md/plugins/chord-sheets
- https://community.obsidian.md/plugins/chopro-viewer
- https://community.obsidian.md/plugins/markdown-chords

---

## 3. Build path

Two options considered.

**A - Swift native.** Port the parser and chord DB to Swift, draw diagrams with SwiftUI `Canvas`, lay out chord-over-lyric natively. 3-4 weeks to usable. Full control of autoscroll, gestures, phone reflow.

**B - WebView wrapper.** Run the existing JS in JavaScriptCore, render the existing HTML into `WKWebView`. ~3 days to usable. Fights the webview for every native interaction.

**Decision: B as a week-one spike, A as the actual app.**

The spike proves folder access, security-scoped bookmarks, and on-device legibility without rewriting 900 lines. Then port module by module, renderer last, and delete the webview.

---

## 4. Architecture

One SwiftUI multiplatform target, macOS + iOS + iPadOS.

| Module | Ports from | Notes |
|---|---|---|
| `ChordProParser` | [src/parser.js](../src/parser.js) | frontmatter, `[Chord]` segments, `##` sections, `>` blockquotes, `define:` |
| `ChordDB` | [src/chords/guitar.js](../src/chords/guitar.js), [src/chords/ukulele.js](../src/chords/ukulele.js) | ship as a JSON resource, not code |
| `ChordDiagram` | [src/renderers/html.js](../src/renderers/html.js) SVG geometry | SwiftUI `Canvas`, 1:1 with the existing grid/dot/open-circle layout |
| `SongLayout` | new | the only genuinely new work - see 4.1 |
| `Library` | new | FileManager scan, security-scoped bookmark, `NSFilePresenter` live reload |
| `Index` | new | disposable cache, see 6 |

### 4.1 The layout problem

The HTML renderer emits inline `<span>` segments. Works at print width, breaks on a phone. The app needs measured-width line wrapping that keeps a chord glued to the syllable it sits on, and breaks between segments rather than through them.

Keep the distinction the HTML already makes between lyric lines, chord-only lines (`[B] [B/A] [G7]`), and lyrics-only lines - it drives three different layout rules.

---

## 5. Library browser

Three-pane on iPad and macOS: sidebar, list, chart. iPhone collapses to stack navigation.

**Sidebar:** folder tree (mirrors the vault), tag tree, smart lists, recently opened.

**List:** dense rows - title, artist, key, capo badge. Grid toggle.

**Group by:** artist / key / tag / folder / last opened.
**Sort by:** any frontmatter field (`key`, `tempo`, `time`, `instrument`, `capo`).

**Search, three kinds:**
1. title / artist - instant, index-backed
2. lyric full-text
3. **chord search** - "songs containing F#m and Bm". Falls out of the parse for free. Nobody else does this well.

---

## 6. Index cache

Scanning 500 `.md` files at every launch is too slow on an iPad.

SQLite (or plist) keyed by `path + mtime + size`, holding title, artist, key, tags, chord set, and a lyric blob for search.

Rule: **the vault is truth, the cache is disposable.** On any mismatch the file wins. Cache must be rebuildable from scratch at any time.

---

## 7. Tagging

Source of truth stays in the `.md`. Two syntaxes, both Obsidian-standard:

```md
---
tags: [gig, learning, uke/beginner]
---
```

and inline `#gig/2026` in the body.

- **Nested tags** (`uke/beginner`) render as a tree in the sidebar, same as Obsidian
- **Filter chips** with an AND/OR toggle
- **Write-back:** tagging from the app rewrites frontmatter in place. Atomic write, `NSFileCoordinator`, everything outside the touched key preserved byte-for-byte. This is the only place the app mutates a user file. Get it wrong once and Obsidian users never come back.
- **Virtual tags**, derived rather than stored: `key:E`, `instrument:ukulele`, `has:custom-chords`, `untagged`, `no-chords`. Verses 2 and 3 of [examples/Beware_of_Darkness.md](../examples/Beware_of_Darkness.md) are lyrics-only - a real state worth filtering on.
- **Smart lists** are saved tag queries, written as a `.md` file in the vault so Obsidian sees them too. No app-only store.

Setlists and tags do different jobs. A setlist is ordered and manual (a `.md` file of `[[wikilinks]]`). Tags are query-driven. Both live in the vault.

---

## 8. Feature order

1. Folder pick, song list, render one song (guitar + ukulele)
2. Live reload when Obsidian saves
3. Library browser + search (5)
4. Transpose + capo - in memory, never writes the file unless asked
5. Tag read, filter, tag tree
6. Tag write-back
7. Setlists as vault files
8. Autoscroll, stage mode (big text), dark mode, keep-screen-awake
9. Print / PDF - reuse the existing 2-column layout
10. Later: Bluetooth pedal, page-turn, external display

---

## 9. Known gotchas

- **Inline flow arrays break the frontmatter parser.** [parseFrontmatter](../src/parser.js#L17) handles block arrays but parses `tags: [gig, learning]` as the literal string `"[gig, learning]"`. Obsidian writes the inline form constantly. Fix in the JS parser before the Swift port or the bug gets inherited.
- **External CSS.** The HTML renderer links `song.css` alongside the file, but [CLAUDE.md](../CLAUDE.md) specifies self-contained output. Fix before the webview spike or the spike renders unstyled.
- **Duplicate section headings.** `Verse 2` appears twice in [examples/Beware_of_Darkness.md](../examples/Beware_of_Darkness.md). Section keys cannot be unique-by-name.
- **iCloud Drive.** Obsidian mobile keeps vaults in iCloud. Without file coordination the app reads stale or partially-downloaded files. Handle the not-yet-downloaded case explicitly.
- **Licensing.** Chord shapes and instrument data are fine. Bundled lyrics are not. User-supplied files only.

---

## 10. Rough schedule

| Week | Work |
|---|---|
| 1 | WebView spike on a real iPad against a real vault |
| 2-3 | Parser + chord DB port, native list/detail, browser skeleton |
| 4-5 | Layout engine + `Canvas` diagrams |
| 6 | Transpose / capo / autoscroll, tag write-back |
| 7 | Setlists, print, index cache hardening |
| 8 | Ship - one-time purchase, no account, no subscription |

---

## 11. Open questions

- Does the phone form factor earn its build cost, or is this iPad + Mac only for v1?
- Piano and bass diagrams, or stay with guitar and ukulele?
- Does the app ever write a song file, or is tag write-back the only mutation forever?
