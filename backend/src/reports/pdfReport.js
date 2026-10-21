// STATUS: UPDATED

import puppeteer from "puppeteer-core";

const PDF_MAGIC_HEADER = "%PDF-";

const getChromiumExecutablePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

const buildPdfDocument = async ({ html }) => {
  if (typeof html !== "string" || !html.trim()) {
    throw new Error("HTML report content is required.");
  }

  const browser = await puppeteer.launch({
    executablePath: getChromiumExecutablePath(),

    headless: true,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 1800,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,

      margin: {
        top: "18mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },

      displayHeaderFooter: false,
    });

    const pdfBuffer = Buffer.from(pdfData);

    if (pdfBuffer.length === 0) {
      throw new Error("PDF document could not be generated.");
    }

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

const assertPdfSource = (document) => {
  if (!Buffer.isBuffer(document) || document.length < 5) {
    throw new Error("Invalid PDF report source.");
  }

  const header = document.subarray(0, 5).toString("utf8");

  if (!header.startsWith(PDF_MAGIC_HEADER)) {
    throw new Error("Invalid PDF magic header.");
  }

  return document;
};

export { PDF_MAGIC_HEADER, buildPdfDocument, assertPdfSource };
