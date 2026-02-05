import NodeCache from 'node-cache';
import { CACHE_TTL } from './constants.js';

const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });

export function getCache(key) {
  return cache.get(key);
}

export function setCache(key, value) {
  return cache.set(key, value, CACHE_TTL);
}

export function getCacheExpiration() {
  return new Date(Date.now() + CACHE_TTL * 1000).toISOString();
}

export default cache;
