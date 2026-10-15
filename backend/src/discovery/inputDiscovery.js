// STATUS: UPDATED
// File: src/discovery/inputDiscovery.js

import * as cheerio from "cheerio";

const MAX_FORMS_PER_PAGE = 100;
const MAX_INPUTS_PER_FORM = 200;
const MAX_TOTAL_INPUTS_PER_PAGE = 500;
const MAX_LINKS_PER_PAGE = 1000;
const MAX_QUERY_PARAMETERS_PER_PAGE = 200;
const MAX_API_REQUESTS_PER_PAGE = 500;
const MAX_OPTIONS_PER_SELECT = 100;
const MAX_ACCEPT_ITEMS = 32;
const MAX_OPTION_LENGTH = 256;

const CONTROL_SELECTOR = "input, textarea, select, button";

const ALLOWED_METHODS = new Set(["GET", "POST", "DIALOG"]);

const ALLOWED_API_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);

const cleanString = (value, maxLength = 512) => {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, maxLength) : null;
};

const normalizeMethod = (value) => {
  const method = String(value || "GET")
    .trim()
    .toUpperCase();
  return ALLOWED_METHODS.has(method) ? method : "GET";
};

const readBoundedInteger = (value) => {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const readOptions = (element, $) => {
  if (String(element.tagName || "").toLowerCase() !== "select") {
    return [];
  }

  return $(element)
    .find("option")
    .slice(0, MAX_OPTIONS_PER_SELECT)
    .toArray()
    .map((option) => {
      const query = $(option);
      const rawValue = query.attr("value");
      const label = cleanString(query.text(), MAX_OPTION_LENGTH);

      // An option without a value attribute submits its text by default.
      const value = cleanString(
        rawValue === undefined ? query.text() : rawValue,
        MAX_OPTION_LENGTH,
      );

      if (value === null && label === null) return null;

      return {
        value: value ?? "",
        label: label ?? "",
        // This is the HTML default-selection state, not live user state.
        selected: query.is("[selected]"),
      };
    })
    .filter(Boolean);
};

const readAccept = (value) => {
  if (typeof value !== "string") return [];

  return [
    ...new Set(
      value
        .split(",")
        .map((item) => cleanString(item, 128))
        .filter(Boolean),
    ),
  ].slice(0, MAX_ACCEPT_ITEMS);
};

const resolveSafeUrl = (value, baseUrl) => {
  try {
    const resolved = new URL(value || baseUrl, baseUrl);

    if (!["http:", "https:"].includes(resolved.protocol)) return null;
    if (resolved.username || resolved.password) return null;

    resolved.hash = "";
    return resolved.toString();
  } catch {
    return null;
  }
};

const getLabelText = (element, $) => {
  const query = $(element);
  const labels = [];
  const elementId = query.attr("id");

  const extractLabel = (label) => {
    const clone = $(label).clone();
    clone.find("a, button, input, select, textarea").remove();

    const text = cleanString(clone.text());
    if (text) labels.push(text);
  };

  if (elementId) {
    $("label[for]").each((_index, label) => {
      if ($(label).attr("for") === elementId) {
        extractLabel(label);
      }
    });
  }

  query.closest("label").each((_index, label) => {
    extractLabel(label);
  });

  return cleanString([...new Set(labels)].join(" "));
};

const readInput = (element, $) => {
  const tag = String(element.tagName || "").toLowerCase();

  if (!["input", "textarea", "select", "button"].includes(tag)) {
    return null;
  }

  const query = $(element);

  const type = (
    tag === "input"
      ? query.attr("type") || "text"
      : tag === "button"
        ? query.attr("type") || "submit"
        : tag
  ).toLowerCase();

  const associatedFormId =
    query.attr("form") || query.closest("form").attr("id") || null;

  const accept = tag === "input" ? readAccept(query.attr("accept")) : [];
  const minlength = readBoundedInteger(query.attr("minlength"));
  const maxlength = readBoundedInteger(query.attr("maxlength"));

  return {
    tag,
    name: cleanString(query.attr("name")),
    type: cleanString(type, 64),
    id: cleanString(query.attr("id")),
    label: getLabelText(element, $),
    ariaLabel: cleanString(query.attr("aria-label")),
    placeholder: cleanString(query.attr("placeholder")),
    formId: cleanString(associatedFormId),
    required: query.is("[required]"),
    disabled: query.is("[disabled]"),
    autocomplete: cleanString(query.attr("autocomplete"), 128),

    pattern: tag === "input" ? cleanString(query.attr("pattern"), 256) : null,
    min: cleanString(query.attr("min"), 128),
    max: cleanString(query.attr("max"), 128),
    step: cleanString(query.attr("step"), 128),
    minlength,
    maxlength,
    readonly: query.is("[readonly]"),
    multiple: query.is("[multiple]"),
    accept,
    options: readOptions(element, $),
  };
};

const getFormControls = (formElement, $, allControls) => {
  const formQuery = $(formElement);
  const formId = formQuery.attr("id");
  const controls = formQuery.find(CONTROL_SELECTOR).toArray();

  if (formId) {
    for (const element of allControls) {
      if ($(element).attr("form") === formId) {
        controls.push(element);
      }
    }
  }

  return [...new Set(controls)];
};

const getQueryParameterNames = (url) => {
  try {
    return [
      ...new Set(
        [...new URL(url).searchParams.keys()]
          .map((name) => cleanString(name))
          .filter(Boolean),
      ),
    ].slice(0, MAX_QUERY_PARAMETERS_PER_PAGE);
  } catch {
    return [];
  }
};

const sanitizeLink = (value, baseUrl) => {
  const resolved = resolveSafeUrl(value, baseUrl);
  if (!resolved) return null;

  try {
    const url = new URL(resolved);
    const base = new URL(baseUrl);

    if (url.origin !== base.origin) return null;

    // Preserve parameter names, but never their values.
    const names = [...new Set(url.searchParams.keys())];
    url.search = "";

    for (const name of names) {
      url.searchParams.append(name, "");
    }

    return url.toString();
  } catch {
    return null;
  }
};

const normalizeInput = (input) => {
  if (!input || typeof input !== "object") return null;

  const tag = String(input.tag || "").toLowerCase();

  if (!["input", "textarea", "select", "button"].includes(tag)) {
    return null;
  }

  const accept = Array.isArray(input.accept)
    ? [
        ...new Set(
          input.accept.map((item) => cleanString(item, 128)).filter(Boolean),
        ),
      ].slice(0, MAX_ACCEPT_ITEMS)
    : [];

  const options = Array.isArray(input.options)
    ? input.options
        .slice(0, MAX_OPTIONS_PER_SELECT)
        .map((option) => {
          if (!option || typeof option !== "object") return null;

          const value = cleanString(option.value, MAX_OPTION_LENGTH);
          const label = cleanString(option.label, MAX_OPTION_LENGTH);

          if (value === null && label === null) return null;

          return {
            value: value ?? "",
            label: label ?? "",
            selected: option.selected === true,
          };
        })
        .filter(Boolean)
    : [];

  return {
    tag,
    name: cleanString(input.name),
    type: cleanString(input.type, 64),
    id: cleanString(input.id),
    label: cleanString(input.label),
    ariaLabel: cleanString(input.ariaLabel),
    placeholder: cleanString(input.placeholder),
    formId: cleanString(input.formId),
    required: input.required === true,
    disabled: input.disabled === true,
    autocomplete: cleanString(input.autocomplete, 128),

    pattern: cleanString(input.pattern, 256),
    min: cleanString(input.min, 128),
    max: cleanString(input.max, 128),
    step: cleanString(input.step, 128),
    minlength: readBoundedInteger(
      input.minlength === null || input.minlength === undefined
        ? ""
        : String(input.minlength),
    ),
    maxlength: readBoundedInteger(
      input.maxlength === null || input.maxlength === undefined
        ? ""
        : String(input.maxlength),
    ),
    readonly: input.readonly === true,
    multiple: input.multiple === true,
    accept,
    options,
  };
};

const inputKey = (input) => {
  if (input.id) {
    return JSON.stringify(["id", input.tag, input.formId, input.id]);
  }

  if (input.name) {
    return JSON.stringify(["name", input.tag, input.formId, input.name]);
  }

  if (input.ariaLabel) {
    return JSON.stringify([
      "aria",
      input.tag,
      input.type,
      input.formId,
      input.ariaLabel,
      input.placeholder,
    ]);
  }

  if (input.placeholder || input.autocomplete) {
    return JSON.stringify([
      "attributes",
      input.tag,
      input.type,
      input.formId,
      input.placeholder,
      input.autocomplete,
    ]);
  }

  return JSON.stringify([
    "fallback",
    input.tag,
    input.type,
    input.formId,
    input.label,
  ]);
};

const mergeInputMetadata = (existing, incoming) => {
  const merged = { ...existing };

  for (const field of [
    "name",
    "type",
    "id",
    "label",
    "ariaLabel",
    "placeholder",
    "formId",
    "autocomplete",
    "pattern",
    "min",
    "max",
    "step",
  ]) {
    if (incoming[field] !== null && incoming[field] !== undefined) {
      merged[field] = incoming[field];
    }
  }

  for (const field of ["minlength", "maxlength"]) {
    if (incoming[field] !== null) merged[field] = incoming[field];
  }

  merged.required = existing.required || incoming.required;
  merged.disabled = incoming.disabled;
  merged.readonly = existing.readonly || incoming.readonly;
  merged.multiple = existing.multiple || incoming.multiple;

  merged.accept = [...new Set([...existing.accept, ...incoming.accept])].slice(
    0,
    MAX_ACCEPT_ITEMS,
  );

  merged.options = incoming.options.length
    ? incoming.options
    : existing.options;

  return merged;
};

const normalizeInputList = (items, limit = MAX_TOTAL_INPUTS_PER_PAGE) => {
  const result = new Map();

  if (!Number.isInteger(limit) || limit <= 0) return [];

  for (const item of Array.isArray(items) ? items : []) {
    const input = normalizeInput(item);
    if (!input) continue;

    const key = inputKey(input);
    const existing = result.get(key);

    result.set(key, existing ? mergeInputMetadata(existing, input) : input);

    if (result.size >= limit) break;
  }

  return [...result.values()];
};

const normalizeApiRequest = (request, baseUrl) => {
  if (!request || typeof request !== "object") return null;

  const method = String(request.method || "GET").toUpperCase();
  const resourceType = String(request.resourceType || "").toLowerCase();

  if (!ALLOWED_API_METHODS.has(method)) return null;
  if (!["fetch", "xhr"].includes(resourceType)) return null;

  const sanitizedUrl = sanitizeLink(request.url, baseUrl);
  if (!sanitizedUrl) return null;

  const queryParameterNames = [
    ...new Set(
      (Array.isArray(request.queryParameterNames)
        ? request.queryParameterNames
        : getQueryParameterNames(request.url)
      )
        .map((name) => cleanString(name))
        .filter(Boolean),
    ),
  ].slice(0, MAX_QUERY_PARAMETERS_PER_PAGE);

  const bodyParameterNames = [
    ...new Set(
      (Array.isArray(request.bodyParameterNames)
        ? request.bodyParameterNames
        : []
      )
        .map((name) => cleanString(name))
        .filter(Boolean),
    ),
  ].slice(0, MAX_QUERY_PARAMETERS_PER_PAGE);

  const statusCode =
    Number.isInteger(request.statusCode) &&
    request.statusCode >= 100 &&
    request.statusCode <= 599
      ? request.statusCode
      : null;

  return {
    url: sanitizedUrl,
    method,
    resourceType,
    contentType: cleanString(request.contentType, 256),
    queryParameterNames,
    bodyParameterNames,
    statusCode,
  };
};

const emptyDiscovery = () => ({
  forms: [],
  inputs: [],
  queryParameterNames: [],
  discoveredLinks: [],
  apiRequests: [],
});

const discoverPageInputs = ({ html, pageUrl } = {}) => {
  if (typeof html !== "string" || typeof pageUrl !== "string") {
    return emptyDiscovery();
  }

  try {
    const parsedPageUrl = new URL(pageUrl);

    if (!["http:", "https:"].includes(parsedPageUrl.protocol)) {
      return emptyDiscovery();
    }

    const $ = cheerio.load(html);
    const allControlElements = $(CONTROL_SELECTOR).toArray();

    const inputs = normalizeInputList(
      allControlElements
        .slice(0, MAX_TOTAL_INPUTS_PER_PAGE)
        .map((element) => readInput(element, $))
        .filter(Boolean),
    );

    const forms = [];

    $("form")
      .slice(0, MAX_FORMS_PER_PAGE)
      .each((_index, element) => {
        const formQuery = $(element);
        const action = resolveSafeUrl(formQuery.attr("action"), pageUrl);

        if (!action) return;

        try {
          if (new URL(action).origin !== parsedPageUrl.origin) return;
        } catch {
          return;
        }

        const associatedControls = getFormControls(
          element,
          $,
          allControlElements,
        );

        forms.push({
          id: cleanString(formQuery.attr("id")),
          action,
          method: normalizeMethod(formQuery.attr("method")),
          inputs: normalizeInputList(
            associatedControls
              .slice(0, MAX_INPUTS_PER_FORM)
              .map((control) => readInput(control, $))
              .filter(Boolean),
            MAX_INPUTS_PER_FORM,
          ),
        });
      });

    const discoveredLinks = [];

    $("a[href]")
      .slice(0, MAX_LINKS_PER_PAGE)
      .each((_index, element) => {
        const link = sanitizeLink($(element).attr("href"), pageUrl);
        if (link) discoveredLinks.push(link);
      });

    return {
      forms,
      inputs,
      queryParameterNames: getQueryParameterNames(pageUrl),
      discoveredLinks: [...new Set(discoveredLinks)].slice(
        0,
        MAX_LINKS_PER_PAGE,
      ),
      apiRequests: [],
    };
  } catch {
    return emptyDiscovery();
  }
};

const mergeDiscoveryResults = (staticDiscovery = {}, dynamicDiscovery = {}) => {
  const baseUrl = dynamicDiscovery.pageUrl || staticDiscovery.pageUrl;

  const allInputs = normalizeInputList([
    ...(Array.isArray(staticDiscovery.inputs) ? staticDiscovery.inputs : []),
    ...(Array.isArray(dynamicDiscovery.inputs) ? dynamicDiscovery.inputs : []),
  ]);

  const formsByKey = new Map();

  for (const form of [
    ...(Array.isArray(staticDiscovery.forms) ? staticDiscovery.forms : []),
    ...(Array.isArray(dynamicDiscovery.forms) ? dynamicDiscovery.forms : []),
  ]) {
    if (!form || typeof form !== "object" || !baseUrl) continue;

    const action = sanitizeLink(form.action, baseUrl);
    if (!action) continue;

    const normalizedForm = {
      id: cleanString(form.id),
      action,
      method: normalizeMethod(form.method),
      inputs: normalizeInputList(
        Array.isArray(form.inputs) ? form.inputs : [],
        MAX_INPUTS_PER_FORM,
      ),
    };

    const key = JSON.stringify([
      normalizedForm.id,
      normalizedForm.action,
      normalizedForm.method,
    ]);

    const existing = formsByKey.get(key);

    if (!existing) {
      formsByKey.set(key, normalizedForm);
    } else {
      existing.inputs = normalizeInputList(
        [...existing.inputs, ...normalizedForm.inputs],
        MAX_INPUTS_PER_FORM,
      );
    }

    if (formsByKey.size >= MAX_FORMS_PER_PAGE) break;
  }

  const links = new Set();

  for (const link of [
    ...(Array.isArray(staticDiscovery.discoveredLinks)
      ? staticDiscovery.discoveredLinks
      : []),
    ...(Array.isArray(dynamicDiscovery.discoveredLinks)
      ? dynamicDiscovery.discoveredLinks
      : []),
  ]) {
    if (!baseUrl) continue;

    const sanitized = sanitizeLink(link, baseUrl);
    if (sanitized) links.add(sanitized);

    if (links.size >= MAX_LINKS_PER_PAGE) break;
  }

  const queryParameterNames = [
    ...new Set(
      [
        ...(Array.isArray(staticDiscovery.queryParameterNames)
          ? staticDiscovery.queryParameterNames
          : []),
        ...(Array.isArray(dynamicDiscovery.queryParameterNames)
          ? dynamicDiscovery.queryParameterNames
          : []),
      ]
        .map((name) => cleanString(name))
        .filter(Boolean),
    ),
  ].slice(0, MAX_QUERY_PARAMETERS_PER_PAGE);

  const apiRequests = new Map();

  for (const request of [
    ...(Array.isArray(staticDiscovery.apiRequests)
      ? staticDiscovery.apiRequests
      : []),
    ...(Array.isArray(dynamicDiscovery.apiRequests)
      ? dynamicDiscovery.apiRequests
      : []),
  ]) {
    if (!baseUrl) continue;

    const normalized = normalizeApiRequest(request, baseUrl);
    if (!normalized) continue;

    const key = JSON.stringify([
      normalized.url,
      normalized.method,
      normalized.resourceType,
    ]);

    const existing = apiRequests.get(key);

    if (!existing || normalized.statusCode !== null) {
      apiRequests.set(key, normalized);
    }

    if (apiRequests.size >= MAX_API_REQUESTS_PER_PAGE) break;
  }

  return {
    forms: [...formsByKey.values()],
    inputs: allInputs,
    queryParameterNames,
    discoveredLinks: [...links],
    apiRequests: [...apiRequests.values()],
  };
};

export { discoverPageInputs, mergeDiscoveryResults };
