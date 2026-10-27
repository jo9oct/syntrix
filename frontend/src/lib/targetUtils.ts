/**
 * Target Display & Name Utility
 * Intelligently resolves and formats human-friendly target names from:
 * 1. Explicit target name (if present and not a raw database ID / hash)
 * 2. Extracted domain / project name from the target URL or hostname
 * 3. Graceful fallback for localhost, IPs, and cloud deployment providers
 */

export function extractTargetName(raw?: any): string {
  if (!raw) return 'Target Asset';

  // If passed an object (Target, Scan, etc.)
  if (typeof raw === 'object') {
    const candidateName = raw.name || raw.targetName || raw.title;
    if (
      candidateName &&
      typeof candidateName === 'string' &&
      candidateName.trim().length > 0
    ) {
      const trimmedName = candidateName.trim();
      // Ensure it's not a raw MongoDB hex ID (24 chars) or PortSwigger-style hash (32 chars) or internal key
      if (!/^[0-9a-fA-F]{24,32}$/.test(trimmedName) && !trimmedName.startsWith('tgt_')) {
        return trimmedName;
      }
    }
    raw = raw.url || raw.targetUrl || raw.normalizedUrl || raw.hostname || raw.targetHostname || '';
  }

  const str = String(raw).trim();
  if (!str) return 'Target Asset';

  // If it's a raw MongoDB ObjectId (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return `Target Asset (${str.slice(0, 6)}...${str.slice(-4)})`;
  }

  // If it's an internal synthetic ID
  if (/^tgt_\d+$/i.test(str)) {
    return `Target Asset #${str.replace(/^tgt_/i, '')}`;
  }

  let hostname = '';
  let port = '';

  try {
    const hasProtocol = /^https?:\/\//i.test(str);
    const parsed = new URL(hasProtocol ? str : `https://${str}`);
    hostname = parsed.hostname;
    port = parsed.port;
  } catch {
    hostname = str.split('/')[0].split(':')[0];
  }

  if (!hostname) return str;

  // Local environments
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return port ? `Localhost (${port})` : 'Localhost';
  }

  // Raw IPv4 address
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return port ? `Host (${hostname}:${port})` : `Host (${hostname})`;
  }

  const parts = hostname.split('.');

  // Web Security Academy / PortSwigger Lab hex subdomains (e.g. 0ad20012034fd477806fd02300430087.web-security-academy.net)
  if (parts.length >= 3 && (/^[0-9a-fA-F]{12,}$/.test(parts[0]) || parts[0].length >= 20)) {
    const mainDomain = parts[1];
    const formatted = formatDomainSegment(mainDomain);
    const shortHash = parts[0].slice(0, 6);
    return `${formatted} Lab (${shortHash})`;
  }

  // Cloud & preview platforms (Vercel, Heroku, Netlify, Azure, Cloudflare Pages, GitHub Pages)
  const platformSuffixes = [
    'vercel.app',
    'herokuapp.com',
    'netlify.app',
    'azurewebsites.net',
    'pages.dev',
    'github.io',
    'awsapprunner.com',
  ];

  for (const plat of platformSuffixes) {
    if (hostname.endsWith(plat)) {
      const prefix = hostname.slice(0, -plat.length - 1);
      // Strip preview deployment hashes (e.g. review-x-u6mr6 -> review-x)
      const cleanPrefix = prefix.replace(/-[a-z0-9]{5,}$/i, '');
      return formatDomainSegment(cleanPrefix);
    }
  }

  // Standard domains (e.g. testfire.net, api.staging.sentrix.io, google.com)
  const hostWithoutWww = hostname.replace(/^www\./i, '');
  const hParts = hostWithoutWww.split('.');

  if (hParts.length === 2) {
    return formatDomainSegment(hParts[0]);
  } else if (hParts.length > 2) {
    const main = formatDomainSegment(hParts[hParts.length - 2]);
    const subs = hParts
      .slice(0, -2)
      .join(' ')
      .replace(/[-_]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `${main} (${subs})`;
  }

  return formatDomainSegment(hostname);
}

function formatDomainSegment(segment: string): string {
  if (!segment) return '';
  return segment
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convenient alias for component templates
 */
export const getTargetDisplayName = extractTargetName;

