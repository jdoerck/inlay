#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve, basename } from 'path';
import { parse } from './parser.js';
import { render as renderAscii } from './renderers/ascii.js';
import { render as renderHtml } from './renderers/html.js';

const USAGE = `Usage: chord-pro <file.md> [options]

Options:
  --instrument  guitar | ukulele   (default: guitar)
  --format      ascii | html       (default: ascii)
  --no-diagrams                    suppress chord diagrams
  --transpose   N                  shift all chords N semitones (not yet impl)
  --output      <path>             write to file instead of stdout
  --help                           show this help
`;

function parseArgs(argv) {
  const args = { file: null, instrument: 'guitar', format: 'ascii', diagrams: true, output: null };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { process.stdout.write(USAGE); process.exit(0); }
    else if (a === '--instrument') { args.instrument = argv[++i]; }
    else if (a === '--format')     { args.format = argv[++i]; }
    else if (a === '--no-diagrams'){ args.diagrams = false; }
    else if (a === '--output')     { args.output = argv[++i]; }
    else if (a === '--transpose')  { args.transpose = parseInt(argv[++i], 10); }
    else if (!a.startsWith('--')) { args.file = a; }
    else { process.stderr.write(`Unknown option: ${a}\n`); process.exit(1); }
    i++;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.file) {
  process.stderr.write('Error: no input file specified.\n\n' + USAGE);
  process.exit(1);
}

if (!['guitar', 'ukulele'].includes(args.instrument)) {
  process.stderr.write(`Error: unknown instrument "${args.instrument}". Use guitar or ukulele.\n`);
  process.exit(1);
}

if (!['ascii', 'html'].includes(args.format)) {
  process.stderr.write(`Error: unknown format "${args.format}". Use ascii or html.\n`);
  process.exit(1);
}

let source;
try {
  source = readFileSync(args.file, 'utf8');
} catch (e) {
  process.stderr.write(`Error: cannot read file "${args.file}": ${e.message}\n`);
  process.exit(1);
}

const song = parse(source);
const renderer = args.format === 'html' ? renderHtml : renderAscii;
const output = renderer(song, { instrument: args.instrument, diagrams: args.diagrams });

if (args.format === 'html') {
  const outFile = args.output || join('output', basename(args.file, '.md') + '.html');
  const outDir = dirname(resolve(outFile));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, output, 'utf8');
  process.stderr.write(`Written to ${outFile}\n`);
} else if (args.output) {
  writeFileSync(args.output, output, 'utf8');
  process.stderr.write(`Written to ${args.output}\n`);
} else {
  process.stdout.write(output);
}
