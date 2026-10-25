/*
 * STATUS: CREATED
 * File: src/scanners/xss/helpers.js
 */

import * as cheerio from "cheerio";

export const XSS_PROBE_MARKER = "sentrix_xss_probe_9f2a";

/**
 * Common DOM XSS sources and sinks patterns
 */
export const DOM_SOURCES = [
  { name: "location.search", pattern: /(?:window\.)?location\.search/i },
  { name: "location.hash", pattern: /(?:window\.)?location\.hash/i },
  { name: "location.href", pattern: /(?:window\.)?location\.href/i },
  { name: "location.pathname", pattern: /(?:window\.)?location\.pathname/i },
  { name: "document.URL", pattern: /document\.(?:URL|documentURI|baseURI)/i },
  { name: "document.referrer", pattern: /document\.referrer/i },
  { name: "window.name", pattern: /(?:window\.)?name/i },
  { name: "URLSearchParams", pattern: /new\s+URLSearchParams/i },
];

export const DOM_SINKS = [
  {
    name: "innerHTML",
    pattern: /\.(?:innerHTML|outerHTML)\s*=/i,
    severity: "high",
  },
  {
    name: "document.write",
    pattern: /document\.write(?:ln)?\s*\(/i,
    severity: "high",
  },
  { name: "eval", pattern: /\beval\s*\(/i, severity: "high" },
  {
    name: "setTimeout",
    pattern: /\bsetTimeout\s*\(\s*[^,]+,/i,
    severity: "medium",
  },
  {
    name: "setInterval",
    pattern: /\bsetInterval\s*\(\s*[^,]+,/i,
    severity: "medium",
  },
  { name: "Function", pattern: /new\s+Function\s*\(/i, severity: "high" },
  {
    name: "location.href assignment",
    pattern: /(?:window\.)?location(?:\.href)?\s*=\s*[^=]/i,
    severity: "medium",
  },
  {
    name: "location.assign",
    pattern: /(?:window\.)?location\.(?:assign|replace)\s*\(/i,
    severity: "medium",
  },
  {
    name: "insertAdjacentHTML",
    pattern: /\.insertAdjacentHTML\s*\(/i,
    severity: "high",
  },
  { name: "jQuery.html", pattern: /\$\([^)]+\)\.html\s*\(/i, severity: "high" },
];

/**
 * Determine the reflection context of a probe marker within an HTML document
 */
export const analyzeReflectionContext = (html, marker) => {
  if (typeof html !== "string" || !marker || !html.includes(marker)) {
    return null;
  }

  const index = html.indexOf(marker);
  const start = Math.max(0, index - 150);
  const end = Math.min(html.length, index + marker.length + 150);
  const surroundingContext = html.slice(start, end);

  // Check if raw characters were preserved or escaped
  const isAngleBracketUnescaped =
    html.includes(`<${marker}>`) ||
    html.includes(`<${marker}`) ||
    html.includes(`${marker}>`) ||
    html.includes(`>${marker}<`);

  const isDoubleQuoteUnescaped =
    html.includes(`"${marker}"`) ||
    html.includes(`="${marker}"`) ||
    html.includes(`"${marker}`) ||
    html.includes(`${marker}"`);

  const isSingleQuoteUnescaped =
    html.includes(`'${marker}'`) ||
    html.includes(`='${marker}'`) ||
    html.includes(`'${marker}`) ||
    html.includes(`${marker}'`);

  try {
    const $ = cheerio.load(html);

    // 1. Check if inside a <script> tag
    let inScript = false;
    let scriptContent = "";
    $("script").each((_, el) => {
      const text = $(el).html() || "";
      if (text.includes(marker)) {
        inScript = true;
        scriptContent = text;
      }
    });

    if (inScript) {
      return {
        context: "script",
        rawUnescaped:
          isSingleQuoteUnescaped ||
          isDoubleQuoteUnescaped ||
          scriptContent.includes(marker),
        executable: true,
        surroundingHtml: surroundingContext,
      };
    }

    // 2. Check if inside an attribute (e.g. href, src, value, onclick)
    let inAttribute = false;
    let attributeName = "";
    $("*").each((_, el) => {
      const attribs = el.attribs || {};
      for (const [attr, val] of Object.entries(attribs)) {
        if (typeof val === "string" && val.includes(marker)) {
          inAttribute = true;
          attributeName = attr.toLowerCase();
          break;
        }
      }
    });

    if (inAttribute) {
      const isHrefOrSrc =
        attributeName === "href" ||
        attributeName === "src" ||
        attributeName === "action";
      const isEventHandler = attributeName.startsWith("on");

      return {
        context: isEventHandler
          ? "event_handler"
          : isHrefOrSrc
            ? "href"
            : "attribute",
        attributeName,
        rawUnescaped:
          isDoubleQuoteUnescaped ||
          isSingleQuoteUnescaped ||
          isAngleBracketUnescaped,
        executable: isEventHandler || isHrefOrSrc,
        surroundingHtml: surroundingContext,
      };
    }

    // 3. HTML Body text context
    return {
      context: "html_body",
      rawUnescaped: isAngleBracketUnescaped,
      executable: isAngleBracketUnescaped,
      surroundingHtml: surroundingContext,
    };
  } catch {
    // Cheerio fallback
    const scriptTagIndex = html.toLowerCase().lastIndexOf("<script", index);
    const scriptCloseIndex = html.toLowerCase().indexOf("</script>", index);
    const inScript =
      scriptTagIndex !== -1 &&
      (scriptCloseIndex === -1 || scriptCloseIndex > index);

    return {
      context: inScript ? "script" : "html_body",
      rawUnescaped: isAngleBracketUnescaped || isDoubleQuoteUnescaped,
      executable: inScript || isAngleBracketUnescaped,
      surroundingHtml: surroundingContext,
    };
  }
};

/**
 * Analyze HTML script tags for DOM-based source-sink flows
 */
export const analyzeDomSourcesAndSinks = (html, targetParameter = "") => {
  if (typeof html !== "string" || !html.includes("<script")) {
    return [];
  }

  const findings = [];

  try {
    const $ = cheerio.load(html);
    const scripts = [];

    $("script").each((_, el) => {
      const content = $(el).html();
      if (content && typeof content === "string" && content.trim()) {
        scripts.push(content);
      }
    });

    for (const script of scripts) {
      // Find matching sources
      const matchedSources = DOM_SOURCES.filter(({ pattern }) =>
        pattern.test(script),
      );
      if (matchedSources.length === 0) continue;

      // Find matching sinks
      const matchedSinks = DOM_SINKS.filter(({ pattern }) =>
        pattern.test(script),
      );
      if (matchedSinks.length === 0) continue;

      // Check if script explicitly references the target parameter
      const paramRegex = targetParameter
        ? new RegExp(`(?:['"\`])${targetParameter}(?:['"\`])`, "i")
        : null;
      const parameterReferenced = paramRegex ? paramRegex.test(script) : false;

      for (const source of matchedSources) {
        for (const sink of matchedSinks) {
          // Extract a concise snippet around the sink
          const sinkMatch = sink.pattern.exec(script);
          const idx = sinkMatch ? sinkMatch.index : 0;
          const start = Math.max(0, idx - 80);
          const end = Math.min(script.length, idx + 120);
          const snippet = script.slice(start, end).replace(/\s+/g, " ").trim();

          findings.push({
            source: source.name,
            sink: sink.name,
            severity: sink.severity,
            parameterReferenced,
            snippet,
          });
        }
      }
    }
  } catch {
    // Ignore Cheerio errors
  }

  return findings;
};
