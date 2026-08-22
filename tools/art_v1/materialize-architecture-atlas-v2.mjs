import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const parts=Array.from({length:7},(_,i)=>path.join(root,'tools','art_v1',`architecture-atlas-v2.part${String(i+1).padStart(2,'0')}.b64`));
const output=path.join(root,'assets','art-v1','architecture','architecture-atlas-v2.webp');
const expectedSha256='63a9ffe87ff97cfed1fd60d62bb1381a671705bc2a2de4964b44cca1db87b5ec';
const expectedBytes=91784,expectedWidth=768,expectedHeight=768;
for(const file of parts)if(!fs.existsSync(file))throw new Error(`Missing architecture atlas source chunk: ${path.relative(root,file)}`);
const b64=parts.map(file=>fs.readFileSync(file,'utf8').trim()).join('');
const bytes=Buffer.from(b64,'base64');
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
if(bytes.length!==expectedBytes)throw new Error(`Architecture atlas byte-size mismatch: expected ${expectedBytes}, got ${bytes.length}`);
if(sha256!==expectedSha256)throw new Error(`Architecture atlas SHA256 mismatch: expected ${expectedSha256}, got ${sha256}`);
if(bytes.subarray(0,4).toString('ascii')!=='RIFF'||bytes.subarray(8,12).toString('ascii')!=='WEBP')throw new Error('Architecture atlas materialization did not produce a WebP RIFF container');
function dims(buffer){let off=12;while(off+8<=buffer.length){const f=buffer.subarray(off,off+4).toString('ascii'),size=buffer.readUInt32LE(off+4),data=off+8;if(f==='VP8X')return{width:1+buffer[data+4]+(buffer[data+5]<<8)+(buffer[data+6]<<16),height:1+buffer[data+7]+(buffer[data+8]<<8)+(buffer[data+9]<<16),codec:f};if(f==='VP8 '){if(buffer[data+3]!==0x9d||buffer[data+4]!==0x01||buffer[data+5]!==0x2a)throw new Error('Architecture atlas VP8 frame header invalid');return{width:buffer.readUInt16LE(data+6)&0x3fff,height:buffer.readUInt16LE(data+8)&0x3fff,codec:f.trim()};}if(f==='VP8L'){if(buffer[data]!==0x2f)throw new Error('Architecture atlas VP8L signature invalid');const bits=buffer.readUInt32LE(data+1);return{width:(bits&0x3fff)+1,height:((bits>>14)&0x3fff)+1,codec:f};}off=data+size+(size&1);}throw new Error('Architecture atlas dimensions could not be decoded');}
const d=dims(bytes);
if(d.width!==expectedWidth||d.height!==expectedHeight)throw new Error(`Architecture atlas dimensions mismatch: expected ${expectedWidth}x${expectedHeight}, got ${d.width}x${d.height}`);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,bytes);
console.log(`PASS architecture atlas materialized: ${path.relative(root,output)} ${d.width}x${d.height} codec=${d.codec} ${bytes.length} bytes sha256=${sha256}`);
