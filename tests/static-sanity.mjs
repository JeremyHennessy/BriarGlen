import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
let releaseRefs = [];

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
  const scriptRefs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
  const styleRefs = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
  const refs = [...scriptRefs, ...styleRefs].filter(isLocalRef);
  for (const ref of refs) requireFile(ref, 'index.html');

  releaseRefs = scriptRefs.filter(ref => /release-info\.js(?:[?#].*)?$/i.test(ref));

  const canonicalBoot = scriptRefs.find(ref => ref.split(/[?#]/, 1)[0] === 'src/runtime/boot.js');
  if (canonicalBoot) {
    const bootPath = path.resolve(root, canonicalBoot.split(/[?#]/, 1)[0]);
    if (fs.existsSync(bootPath)) {
      const boot = fs.readFileSync(bootPath, 'utf8');
      const manifestRefs = [...boot.matchAll(/["']((?:src|styles)[^"']+\.(?:js|css))["']/g)]
        .map(match => match[1])
        .filter(isLocalRef);
      for (const ref of new Set(manifestRefs)) requireFile(ref, 'src/runtime/boot.js');
      releaseRefs.push(...manifestRefs.filter(ref => /release-info\.js(?:[?#].*)?$/i.test(ref)));
      if (!boot.includes('__BRIAR_GLEN_MANIFEST')) failures.push('src/runtime/boot.js does not expose __BRIAR_GLEN_MANIFEST');
      if (!boot.includes('canonical-parser-manifest')) failures.push('src/runtime/boot.js lost canonical manifest mode');
    }
  }

  if (!releaseRefs.length) failures.push('runtime activation has no release-info runtime');
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

if (releaseRefs.length) {
  const latestReleaseRef = releaseRefs[releaseRefs.length - 1].split(/[?#]/, 1)[0];
  const releasePath = path.resolve(root, latestReleaseRef);
  if (fs.existsSync(releasePath)) {
    const release = fs.readFileSync(releasePath, 'utf8');
    if (!/version:\s*['"][^'"]+['"]/.test(release)) failures.push(`${latestReleaseRef} has no release version`);
    if (!release.includes('getBuildInfo')) failures.push(`${latestReleaseRef} does not expose getBuildInfo`);
    if (!release.includes('__BRIAR_GLEN_BUILD')) failures.push(`${latestReleaseRef} does not expose __BRIAR_GLEN_BUILD`);
  }
}

if (failures.length) {
  console.error(`STATIC SANITY FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS static sanity: ${runtimeFiles.length} runtime JS + ${testFiles.length} test JS syntax-clean; local runtime references resolve; ${new Set(releaseRefs).size} release marker(s)`);
