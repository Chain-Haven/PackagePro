import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type PrintLabelOptions = {
  printerName?: string;
  showDialog?: boolean;
};

async function downloadPdf(url: string, tempDir: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download label: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) {
    throw new Error('Label URL did not return a PDF');
  }

  const filePath = path.join(tempDir, `packagepro-label-${Date.now()}.pdf`);
  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, pdfBuffer);
  return filePath;
}

async function printPdfFile(filePath: string, options: PrintLabelOptions) {
  if (process.platform === 'win32') {
    const { print } = await import('pdf-to-printer');
    await print(filePath, {
      printer: options.printerName,
      printDialog: options.showDialog ?? false,
    });
    return;
  }

  const printerArgs = options.printerName ? ['-d', options.printerName] : [];
  const command = process.platform === 'darwin' ? 'lp' : 'lpr';
  await execFileAsync(command, [...printerArgs, filePath]);
}

export async function downloadAndPrintPdf(
  url: string,
  tempDir: string,
  options: PrintLabelOptions = {}
) {
  const filePath = await downloadPdf(url, tempDir);

  try {
    await printPdfFile(filePath, options);
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
}
