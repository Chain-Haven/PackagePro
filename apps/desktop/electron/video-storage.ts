import fs from 'fs';
import fsp from 'fs/promises';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export async function writeEncryptedRecordingFromChunks(
  outputPath: string,
  plaintextChunks: AsyncIterable<Buffer>,
  key: Buffer
) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const writeStream = fs.createWriteStream(outputPath);
  writeStream.write(iv);

  let byteLength = 0;

  for await (const chunk of plaintextChunks) {
    byteLength += chunk.byteLength;
    const encryptedChunk = cipher.update(chunk);
    if (encryptedChunk.byteLength > 0) {
      writeStream.write(encryptedChunk);
    }
  }

  const finalChunk = cipher.final();
  if (finalChunk.byteLength > 0) {
    writeStream.write(finalChunk);
  }

  writeStream.write(cipher.getAuthTag());

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    writeStream.end();
  });

  return byteLength;
}

export async function readEncryptedRecording(outputPath: string, key: Buffer) {
  const fileBuffer = await fsp.readFile(outputPath);
  const iv = fileBuffer.subarray(0, IV_LENGTH);
  const tag = fileBuffer.subarray(fileBuffer.byteLength - TAG_LENGTH);
  const ciphertext = fileBuffer.subarray(IV_LENGTH, fileBuffer.byteLength - TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
