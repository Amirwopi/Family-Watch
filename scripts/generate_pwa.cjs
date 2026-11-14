const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const publicDir = path.resolve(__dirname, '../client/public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#9333ea" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#4f46e5" flood-opacity="0.6" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="#0b0f17" />
  <rect x="32" y="32" width="448" height="448" rx="104" fill="url(#bgGrad)" filter="url(#glow)" />
  <!-- Film Stage / Screen Frame -->
  <rect x="76" y="110" width="360" height="250" rx="28" fill="#0b0f17" opacity="0.92" stroke="#ffffff" stroke-width="4" stroke-opacity="0.25" />
  <!-- Film perforation dots top -->
  <circle cx="110" cy="80" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="180" cy="80" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="256" cy="80" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="332" cy="80" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="402" cy="80" r="10" fill="#ffffff" opacity="0.7" />
  <!-- Film perforation dots bottom -->
  <circle cx="110" cy="390" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="180" cy="390" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="256" cy="390" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="332" cy="390" r="10" fill="#ffffff" opacity="0.7" />
  <circle cx="402" cy="390" r="10" fill="#ffffff" opacity="0.7" />
  <!-- Play triangle in center -->
  <polygon points="220,175 340,235 220,295" fill="#ffffff" />
  <!-- Live Sync Waves -->
  <path d="M156,438 Q256,420 356,438" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.9" />
  <circle cx="256" cy="429" r="6" fill="#38bdf8" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg, 'utf-8');

// Function to generate raw PNG file without external dependencies
function createPng(width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 2; // Truecolor (RGB)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radiusSq = (width * 0.44) * (width * 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const t = (x + y) / (width + height);
        rawData[pxOffset] = Math.round(79 + (147 - 79) * t); // R
        rawData[pxOffset + 1] = Math.round(70 + (51 - 70) * t); // G
        rawData[pxOffset + 2] = Math.round(229 + (234 - 229) * t); // B

        // Play triangle
        const relX = (x - cx) / (width * 0.25);
        const relY = (y - cy) / (height * 0.25);
        if (relX >= -0.4 && relX <= 0.6 && relY >= -0.5 && relY <= 0.5) {
          if (relY >= -(0.6 - relX) * 0.6 && relY <= (0.6 - relX) * 0.6) {
            rawData[pxOffset] = 255;
            rawData[pxOffset + 1] = 255;
            rawData[pxOffset + 2] = 255;
          }
        }
      } else {
        rawData[pxOffset] = 11;
        rawData[pxOffset + 1] = 15;
        rawData[pxOffset + 2] = 23;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBuf, data]);

  const crcVal = crc32(payload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);

  return Buffer.concat([len, payload, crcBuf]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const png192 = createPng(192, 192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

const png512 = createPng(512, 512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), png512);

console.log('PWA icons created successfully in client/public/');

