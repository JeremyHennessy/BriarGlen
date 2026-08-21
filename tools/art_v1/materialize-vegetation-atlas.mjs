import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const parts = Array.from({ length: 7 }, (_, i) => path.join(root, 'tools', 'art_v1', `vegetation-atlas-v3.part${String(i + 1).padStart(2, '0')}.b64`));
const output = path.join(root, 'assets', 'art-v1', 'vegetation', 'vegetation-atlas-v3.webp');
const expectedSha256 = '59a74c45c02d2f82d00ddf965a244d6eb3e59ae4bc07b03d2e72bff21811be56';
const expectedBytes = 54590;
const expectedWidth = 512;
const expectedHeight = 384;

for (const file of parts) {
  if (!fs.existsSync(file)) throw new Error(`Missing vegetation atlas source chunk: ${path.relative(root, file)}`);
}

const b64 = parts.map(file => fs.readFileSync(file, 'utf8').trim()).join('');
const bytes = Buffer.from(b64, 'base64');
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== expectedBytes) throw new Error(`Vegetation atlas byte-size mismatch: expected ${expectedBytes}, got ${bytes.length}`);
if (sha256 !== expectedSha256) throw new Error(`Vegetation atlas SHA256 mismatch: expected ${expectedSha256}, got ${sha256}`);
if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('Vegetation atlas materialization did not produce a WebP RIFF container');
}

function readWebpDimensions(buffer) {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const fourcc = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (fourcc === 'VP8X') {
      if (data + 10 > buffer.length) break;
      return {
        width: 1 + buffer[data + 4] + (buffer[data + 5] << 8) + (buffer[data + 6] << 16),
        height: 1 + buffer[data + 7] + (buffer[data + 8] << 8) + (buffer[data + 9] << 16),
        codec: fourcc,
      };
    }
    if (fourcc === 'VP8 ') {
      if (data + 10 > buffer.length) break;
      if (buffer[data + 3] !== 0x9d || buffer[data + 4] !== 0x01 || buffer[data + 5] !== 0x2a) {
        throw new Error('Vegetation atlas VP8 frame header is invalid');
      }
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
        codec: fourcc.trim(),
      };
    }
    if (fourcc === 'VP8L') {
      if (data + 5 > buffer.length || buffer[data] !== 0x2f) break;
      const bits = buffer.readUInt32LE(data + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
        codec: fourcc,
      };
    }
    offset = data + size + (size & 1);
  }
  throw new Error('Vegetation atlas dimensions could not be decoded from WebP container');
}

const { width, height, codec } = readWebpDimensions(bytes);
if (width !== expectedWidth || height !== expectedHeight) {
  throw new Error(`Vegetation atlas dimensions mismatch: expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, bytes);
console.log(`PASS vegetation atlas materialized: ${path.relative(root, output)} ${width}x${height} codec=${codec} ${bytes.length} bytes sha256=${sha256}`);
