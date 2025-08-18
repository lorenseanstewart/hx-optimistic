import { DATASET_OPTIMISTIC_KEY } from './constants.js';

export function getOptimisticConfig(sourceElt, cacheMap) {
  if (!sourceElt?.dataset?.[DATASET_OPTIMISTIC_KEY]) return null;
  const raw = sourceElt.dataset[DATASET_OPTIMISTIC_KEY];
  const cached = cacheMap.get(sourceElt);
  if (cached && cached.__raw === raw) {
    return cached.config;
  }
  let config;
  try {
    if (raw === 'true' || raw === '') {
      config = {};
    } else {
      config = JSON.parse(raw);
      if (typeof config !== 'object' || config === null) {
        config = { values: { textContent: raw } };
      }
    }
  } catch (e) {
    config = { values: { textContent: raw } };
  }
  config.delay = config.delay ?? 2000;
  config.errorMode = config.errorMode || 'replace';
  config.errorMessage = config.errorMessage || 'Request failed';
  if (!config.values && !config.template && sourceElt.tagName === 'BUTTON') {
    config.values = {
      className: (sourceElt.className + ' hx-optimistic-pending').trim(),
    };
  }
  cacheMap.set(sourceElt, { __raw: raw, config });
  return config;
}

