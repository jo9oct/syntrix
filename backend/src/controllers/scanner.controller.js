// STATUS: CREATED

import {
  getReconScanners,
  getSecurityScanners,
} from "../engine/scannerRegistry.js";

const sanitizeScanner = (scanner) => ({
  id: scanner.id,

  category: scanner.category,

  name: scanner.name,

  description: scanner.description,
});

const getScanners = (_req, res, next) => {
  try {
    const recon = getReconScanners().map(sanitizeScanner);

    const security = getSecurityScanners().map(sanitizeScanner);

    return res.status(200).json({
      success: true,

      data: {
        recon,
        security,

        counts: {
          recon: recon.length,

          security: security.length,

          total: recon.length + security.length,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export { getScanners };
