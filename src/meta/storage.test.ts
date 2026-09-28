import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __setStorageForTests, load, remove, save, storageAvailable, type StorageLike } from './storage';

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('storage', () => {
  beforeEach(() => __setStorageForTests(null));
  afterEach(() => __setStorageForTests(null));

  it('falls back to an in-memory map when localStorage is missing', () => {
    expect(storageAvailable()).toBe(false);
    expect(save('brink.x', { a: 1 })).toBe(true);
    expect(load('brink.x', null)).toEqual({ a: 1 });
  });
  it('returns the fallback for missing keys and corrupt JSON', () => {
    const fake = fakeStorage();
    __setStorageForTests(fake);
    expect(load('brink.missing', 42)).toBe(42);
    fake.map.set('brink.bad', '{not json');
    expect(load('brink.bad', 'fb')).toBe('fb');
    fake.map.set('brink.null', 'null');
    expect(load('brink.null', 'fb')).toBe('fb');
  });
  it('round-trips through an injected storage and removes keys', () => {
    const fake = fakeStorage();
    __setStorageForTests(fake);
    expect(storageAvailable()).toBe(true);
    expect(save('brink.k', [1, 2, 3])).toBe(true);
    expect(fake.map.get('brink.k')).toBe('[1,2,3]');
    expect(load<number[]>('brink.k', [])).toEqual([1, 2, 3]);
    expect(remove('brink.k')).toBe(true);
    expect(load('brink.k', 'gone')).toBe('gone');
  });
  it('never throws when the storage throws', () => {
    __setStorageForTests(throwing);
    expect(storageAvailable()).toBe(false);
    expect(save('brink.k', 1)).toBe(false);
    expect(load('brink.k', 'fb')).toBe('fb');
    expect(remove('brink.k')).toBe(false);
  });
  it('resets the in-memory map between tests', () => {
    save('brink.tmp', 1);
    __setStorageForTests(null);
    expect(load('brink.tmp', 'empty')).toBe('empty');
  });
});
