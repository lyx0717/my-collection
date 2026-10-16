// 实现在 packages/shared，前后端共用同一份，保证 dedupeKey 两端算出的键一致。
export { normalizeUrl, extractDomain, isValidUrl, dedupeKey } from '@my-collection/shared/url'
