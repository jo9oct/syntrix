import {
  getAllScanners,
  getReconScanners,
  getSecurityScanners,
} from "../engine/scannerRegistry.js";

const checkScannerHealth = async () => {
  try {
    const all = getAllScanners();

    const recon = getReconScanners();

    const security = getSecurityScanners();

    const healthy =
      all.length === 25 && recon.length === 10 && security.length === 15;

    return {
      healthy,
      total: all.length,
      recon: recon.length,
      security: security.length,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
};

export { checkScannerHealth };
