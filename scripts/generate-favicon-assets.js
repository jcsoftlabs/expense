const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'favicon-source.svg');

const outputs = [
  { path: path.join(rootDir, 'public', 'icon-192.png'), size: 192 },
  { path: path.join(rootDir, 'public', 'icon-512.png'), size: 512 },
  { path: path.join(rootDir, 'src', 'app', 'icon.png'), size: 512 },
  { path: path.join(rootDir, 'src', 'app', 'apple-icon.png'), size: 180 },
];

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const base = index * 16;
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, base);
    directory.writeUInt8(image.size >= 256 ? 0 : image.size, base + 1);
    directory.writeUInt8(0, base + 2);
    directory.writeUInt8(0, base + 3);
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(image.buffer.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += image.buffer.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.buffer)]);
}

async function generatePng(sourceBuffer, outputPath, size) {
  await sharp(sourceBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
}

async function main() {
  const sourceBuffer = fs.readFileSync(svgPath);

  await Promise.all(outputs.map((output) => generatePng(sourceBuffer, output.path, output.size)));

  const faviconImages = await Promise.all(
    [16, 32].map(async (size) => ({
      size,
      buffer: await sharp(sourceBuffer).resize(size, size).png().toBuffer(),
    }))
  );

  const faviconIco = createIco(faviconImages);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), faviconIco);

  console.log('Favicon assets generated successfully.');
}

main().catch((error) => {
  console.error('Failed to generate favicon assets:', error);
  process.exit(1);
});
