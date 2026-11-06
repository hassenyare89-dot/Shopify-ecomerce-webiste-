/**
 * Device-local wishlist.
 *
 * Stores product GIDs in localStorage. Product data shown on /wishlist is
 * always fetched live from Shopify, so prices and availability are current.
 *
 * Cross-device wishlists are NOT native Shopify functionality: they require a
 * wishlist app or customer metafields via the Customer Account API. See
 * docs/ARCHITECTURE.md → "Optional capabilities".
 */
import {useCallback, useSyncExternalStore} from 'react';

export const WISHLIST_STORAGE_KEY = 'wishlist:v1';
export const WISHLIST_MAX_ITEMS = 100;
const CHANGE_EVENT = 'wishlist:change';

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;

export function isProductGid(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_GID.test(value);
}

/** Pure parsing of stored data — tolerant of corrupt/foreign values. */
export function parseWishlist(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter(isProductGid))).slice(
      0,
      WISHLIST_MAX_ITEMS,
    );
  } catch {
    return [];
  }
}

export function toggleWishlistItem(list: string[], id: string): string[] {
  if (!isProductGid(id)) return list;
  if (list.includes(id)) return list.filter((x) => x !== id);
  return [id, ...list].slice(0, WISHLIST_MAX_ITEMS);
}

let cachedRaw: string | null | undefined;
let cachedList: string[] = [];
const EMPTY: string[] = [];

function readStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedList = parseWishlist(raw);
    }
    return cachedList;
  } catch {
    return EMPTY;
  }
}

function writeStorage(list: string[]) {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage may be unavailable (private mode / quota). Fail silently.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === WISHLIST_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useWishlist() {
  const items = useSyncExternalStore(subscribe, readStorage, () => EMPTY);
  const toggle = useCallback((id: string) => {
    const next = toggleWishlistItem(readStorage(), id);
    writeStorage(next);
    return next.includes(id);
  }, []);
  const remove = useCallback((id: string) => {
    writeStorage(readStorage().filter((x) => x !== id));
  }, []);
  const has = useCallback((id: string) => items.includes(id), [items]);
  return {items, toggle, remove, has, count: items.length};
}
