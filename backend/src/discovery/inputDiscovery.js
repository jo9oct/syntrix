// STATUS: CREATED

import * as cheerio from 'cheerio';

const MAX_FORMS_PER_PAGE = 100;
const MAX_INPUTS_PER_FORM = 200;
const MAX_TOTAL_INPUTS_PER_PAGE = 500;
const MAX_LINKS_PER_PAGE = 1000;

const normalizeMethod = (value) => {
  const method = String(value || 'GET')
    .trim()
    .toUpperCase();

  return ['GET', 'POST', 'DIALOG'].includes(method)
    ? method
    : 'GET';
};

const resolveSafeUrl = (value, baseUrl) => {
  try {
    const resolved = new URL(value || baseUrl, baseUrl);

    if (!['http:', 'https:'].includes(resolved.protocol)) {
      return null;
    }

    if (resolved.username || resolved.password) {
      return null;
    }

    resolved.hash = '';

    return resolved.toString();
  } catch {
    return null;
  }
};

const readInput = (element, $) => {
  const tag = String(element.tagName || '')
    .toLowerCase();

  const name = $(element).attr('name') || null;
  const type = (
    tag === 'input'
      ? $(element).attr('type') || 'text'
      : tag === 'button'
        ? $(element).attr('type') || 'submit'
        : tag
  ).toLowerCase();

  return {
    tag,
    name: name ? name.slice(0, 512) : null,
    type: type.slice(0, 64),
    required: $(element).is('[required]'),
    disabled: $(element).is('[disabled]'),
    autocomplete: (
      $(element).attr('autocomplete') || ''
    ).slice(0, 128) || null,
  };
};

const discoverPageInputs = ({
  html,
  pageUrl,
} = {}) => {
  if (
    typeof html !== 'string' ||
    typeof pageUrl !== 'string'
  ) {
    return {
      forms: [],
      inputs: [],
      queryParameterNames: [],
      discoveredLinks: [],
    };
  }

  const $ = cheerio.load(html);

  const forms = [];
  const pageInputs = [];

  $('form')
    .slice(0, MAX_FORMS_PER_PAGE)
    .each((_index, formElement) => {
      const action = resolveSafeUrl(
        $(formElement).attr('action'),
        pageUrl,
      );

      if (!action) {
        return;
      }

      const inputs = [];

      $(formElement)
        .find('input, textarea, select, button')
        .slice(0, MAX_INPUTS_PER_FORM)
        .each((_inputIndex, element) => {
          const input = readInput(element, $);

          if (pageInputs.length < MAX_TOTAL_INPUTS_PER_PAGE) {
            pageInputs.push(input);
          }

          inputs.push(input);
        });

      forms.push({
        action,
        method: normalizeMethod(
          $(formElement).attr('method'),
        ),
        inputs,
      });
    });

  /*
   * Also discover controls outside forms.
   * Values and checked states are intentionally
   * not recorded.
   */
  $('input, textarea, select, button')
    .slice(0, MAX_TOTAL_INPUTS_PER_PAGE)
    .each((_index, element) => {
      const input = readInput(element, $);

      if (
        !pageInputs.some(
          (existing) =>
            existing.tag === input.tag &&
            existing.name === input.name &&
            existing.type === input.type,
        )
      ) {
        pageInputs.push(input);
      }
    });

  let queryParameterNames = [];

  try {
    queryParameterNames = [
      ...new Set(
        [...new URL(pageUrl).searchParams.keys()]
          .filter(Boolean)
          .map((name) => name.slice(0, 512)),
      ),
    ].slice(0, 200);
  } catch {
    queryParameterNames = [];
  }

  const discoveredLinks = [];

  $('a[href]')
    .slice(0, MAX_LINKS_PER_PAGE)
    .each((_index, element) => {
      const link = resolveSafeUrl(
        $(element).attr('href'),
        pageUrl,
      );

      if (link) {
        discoveredLinks.push(link);
      }
    });

  return {
    forms: forms.slice(0, MAX_FORMS_PER_PAGE),
    inputs: pageInputs.slice(0, MAX_TOTAL_INPUTS_PER_PAGE),
    queryParameterNames,
    discoveredLinks: [...new Set(discoveredLinks)],
  };
};

export {
  discoverPageInputs,
};