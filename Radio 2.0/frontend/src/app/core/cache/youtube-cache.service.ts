import { Injectable } from '@angular/core';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class YouTubeCacheService {
  private readonly prefix = 'yt_cache_';
  private readonly defaultTtlMs = 60 * 60 * 1000; // 1 hora de TTL

  private normalizeKey(query: string): string {
    return this.prefix + query.trim().toLowerCase();
  }

  get<T>(query: string): T | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const key = this.normalizeKey(query);
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const isExpired = Date.now() - entry.timestamp > entry.ttlMs;
      if (isExpired) {
        window.localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  set<T>(query: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.setWithTimestamp(query, data, Date.now(), ttlMs);
  }

  setWithTimestamp<T>(query: string, data: T, timestamp: number, ttlMs: number): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const key = this.normalizeKey(query);
      const entry: CacheEntry<T> = { data, timestamp, ttlMs };
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Ignora erro se localStorage cheio
    }
  }

  clear(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch {
      // noop
    }
  }
}
