import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const parts = Array.from({ length: 7 }, (_, i) => path.join(root, 'tools', 'art_v1', `terrain-atlas-v1.part${String(i + 1).padStart(2, '0')}.b64`));
const output = path.join(root, 'assets', 'art-v1', 'terrain', 'terrain-atlas-v1.webp');
const expectedSha256 = 'f01bd8da86c3e6b0953e43337c4fe8083b82200bd06cd1f649121075f24f036a';
const expectedBytes = 4570;
const expectedWidth = 96;
const expectedHeight = 224;

for (const file of parts) {
  if (!fs.existsSync(file)) throw new Error(`Missing terrain atlas source chunk: ${path.relative(root, file)}`);
}

const b64 = parts.map(file => fs.readFileSync(file, 'utf8').trim()).join('');
const bytes = Buffer.from(b64, 'base64');
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== expectedBytes) throw new Error(`Terrain atlas byte-size mismatch: expected ${expectedBytes}, got ${bytes.length}`);
if (sha256 !== expectedSha256) throw new Error(`Terrain atlas SHA256 mismatch: expected ${expectedSha256}, got ${sha256}`);
if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('Terrain atlas materialization did not produce a WebP RIFF container');
}
if (bytes.subarray(12, 16).toString('ascii') !== 'VP8X') throw new Error('Terrain atlas WebP must use VP8X so dimensions can be verified deterministically');
const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
if (width !== expectedWidth || height !== expectedHeight) throw new Error(`Terrain atlas dimensions mismatch: expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, bytes);
console.log(`PASS terrain atlas materialized: ${path.relative(root, output)} ${width}x${height} ${bytes.length} bytes sha256=${sha256}`);
