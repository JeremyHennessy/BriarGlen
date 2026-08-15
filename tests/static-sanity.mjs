import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const rel = file => path.relative(root, file).replaceAll(path.sep, '/');
const isLocalRef = value => value && !/^(?:https?:|data:|#|\/\/)/i.test(value);

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function requireFile(ref, source) {
  const clean = ref.split(/[?#]/, 1)[0];
  const full = path.resolve(root, clean);
  if (!full.startsWith(root + path.sep) && full !== root) {
    failures.push(`${source}: reference escapes repository root: ${ref}`);
    return;
  }
  if (!fs.existsSync(full)) {
    failures.push(`${source}: missing referenced file: ${clean}`);
    return;
  }
  if (!fs.statSync(full).isFile() || fs.statSync(full).size === 0) {
    failures.push(`${source}: referenced file is empty or not a file: ${clean}`);
  }
}

const indexPath = path.join(root, 'index.html');
if (!fs.existsSync(indexPath) || fs.statSync(indexPath).size === 0) {
  failures.push('index.html is missing or empty');
} else {
  const html = fs.readFileSync(indexPath, 'utf8');
  const refs = [
    ...[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]),
    ...[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]),
  ].filter(isLocalRef);
  for (const ref of refs) requireFile(ref, 'index.html');

  if (!html.includes('src/v12/17-release-info.js')) {
    failures.push('index.html does not activate src/v12/17-release-info.js');
  }
  if (!html.includes('viewport-fit=cover') || !html.includes('user-scalable=no')) {
    failures.push('index.html lost the mobile viewport/zoom guard');
  }
}

const runtimeFiles = walk(path.join(root, 'src'), file => file.endsWith('.js'));
const testFiles = walk(path.join(root, 'tests'), file => file.endsWith('.mjs'));
const syntaxFiles = [...runtimeFiles, ...testFiles];

for (const file of syntaxFiles) {
  if (fs.statSync(file).size === 0) {
    failures.push(`${rel(file)} is empty`);
    continue;
  }
  const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (checked.status !== 0) {
    failures.push(`${rel(file)} syntax check failed:\n${checked.stderr || checked.stdout}`);
  }
}

for (const file of runtimeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const dynamicRefs = [
    ...[...text.matchAll(/\b(?:script|style)\.src\s*=\s*["']([^"']+)["']/g)].map(match => match[1]),
    ...[...text.matchAll(/\b(?:script|style)\.href\s*=\s*["']([^"']+)["']/g)].map(match => match[1]),
  ].filter(isLocalRef);
  for (const ref of dynamicRefs) requireFile(ref, rel(file));
}

const releasePath = path.join(root, 'src/v12/17-release-info.js');
if (fs.existsSync(releasePath)) {
  const release = fs.readFileSync(releasePath, 'utf8');
  if (!release.includes("version: '12.1'")) failures.push('release metadata is not Build 12.1');
  if (!release.includes('getBuildInfo')) failures.push('release metadata does not expose getBuildInfo');
}

if (failures.length) {
  console.error(`STATIC SANITY FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS static sanity: ${runtimeFiles.length} runtime JS + ${testFiles.length} test JS syntax-clean; local runtime references resolve`);
