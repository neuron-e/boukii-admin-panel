import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer, throwError } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { ApiCrudService } from 'src/service/crud.service';
import { ApiResponse } from '../interface/api-response';

/**
 * MEJORA CRÍTICA: Servicio de cache inteligente para optimización de performance
 *
 * Funcionalidades:
 * - Cache en memoria con TTL configurable
 * - Cache en localStorage para persistencia
 * - Invalidación inteligente de cache
 * - Preload de datos relacionados
 * - Métricas de performance
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceCacheService {
  private memoryCache = new Map<string, CacheItem>();
  private readonly MEMORY_CACHE_SIZE = 100; // Máximo 100 items en memoria
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos por defecto
  private readonly PERSISTENT_CACHE_KEY = 'boukii_persistent_cache';

  // Métricas de performance
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryCacheSize: 0,
    persistentCacheSize: 0
  };

  // Observable para notificar cambios en métricas
  private statsSubject = new BehaviorSubject<CacheStats>(this.cacheStats);
  public stats$ = this.statsSubject.asObservable();

  // Configuración de endpoints con TTL específicos
  private endpointConfigs: Map<string, EndpointConfig> = new Map([
    ['/admin/sports', { ttl: 30 * 60 * 1000, persistent: true }], // 30 min
    ['/admin/degrees', { ttl: 30 * 60 * 1000, persistent: true }], // 30 min
    ['/admin/monitors', { ttl: 10 * 60 * 1000, persistent: false }], // 10 min
    ['/admin/courses', { ttl: 5 * 60 * 1000, persistent: false }], // 5 min
    ['/admin/clients', { ttl: 2 * 60 * 1000, persistent: false }], // 2 min
  ]);

  constructor(private crudService: ApiCrudService) {
    this.initializePersistentCache();
    this.setupCleanupTimer();
  }

  /**
   * MÉTODO PRINCIPAL: Obtener datos con cache inteligente
   */
  get<T>(endpoint: string, params?: any, forceRefresh: boolean = false): Observable<T> {
    const cacheKey = this.generateCacheKey(endpoint, params);

    // Incrementar contador de solicitudes
    this.cacheStats.totalRequests++;

    if (!forceRefresh) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.cacheStats.hits++;
        this.updateStats();
        return of(cached);
      }
    }

    // Cache MISS - obtener datos del servidor
    this.cacheStats.misses++;
    this.updateStats();

    const config = this.endpointConfigs.get(endpoint) || { ttl: this.DEFAULT_TTL };

    return this.crudService.get(endpoint, [], params ?? {}).pipe(
      map((response: ApiResponse) => response.data as T),
      tap(data => {
        this.setCache(cacheKey, data, config.ttl, config.persistent);
      }),
      catchError(error => {
        console.error(`❌ Error fetching ${endpoint}:`, error);
        return throwError(() => error);
      }),
      shareReplay(1)
    );
  }

  /**
   * MEJORA CRÍTICA: Post con invalidación de cache relacionado
   */
  post<T>(endpoint: string, data: any, invalidatePatterns: string[] = []): Observable<T> {
    return this.crudService.post(endpoint, data).pipe(
      map((response: ApiResponse) => response.data as T),
      tap(() => {
        // Invalidar caches relacionados
        this.invalidateByPatterns([endpoint, ...invalidatePatterns]);
      })
    );
  }

  /**
   * MEJORA CRÍTICA: Preload de datos relacionados
   */
  preloadRelatedData(baseEndpoint: string, relations: string[]): void {

    // Preload en paralelo sin bloquear el hilo principal
    setTimeout(() => {
      relations.forEach(relation => {
        this.get(relation).subscribe({
          next: () => {},
          error: (err) => console.warn(`⚠️ Failed to preload ${relation}:`, err)
        });
      });
    }, 100);
  }

  /**
   * MEJORA CRÍTICA: Invalidación inteligente de cache
   */
  invalidateByPatterns(patterns: string[]): void {
    let invalidatedCount = 0;

    // Invalidar cache en memoria
    for (const [key] of this.memoryCache) {
      if (patterns.some(pattern => key.includes(pattern))) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidar cache persistente
    try {
      const persistentCache = this.getPersistentCache();
      const updatedCache = {};

      for (const [key, value] of Object.entries(persistentCache)) {
        if (!patterns.some(pattern => key.includes(pattern))) {
          updatedCache[key] = value;
        } else {
          invalidatedCount++;
        }
      }

      localStorage.setItem(this.PERSISTENT_CACHE_KEY, JSON.stringify(updatedCache));
    } catch (error) {
      console.warn('Error invalidating persistent cache:', error);
    }

    if (invalidatedCount > 0) {
    }
  }

  /**
   * Configurar TTL personalizado para endpoint
   */
  configureEndpoint(endpoint: string, config: EndpointConfig): void {
    this.endpointConfigs.set(endpoint, config);
  }

  /**
   * Obtener estadísticas de cache
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.cacheStats };
  }

  /**
   * Limpiar todo el cache
   */
  clearAll(): void {
    this.memoryCache.clear();
    localStorage.removeItem(this.PERSISTENT_CACHE_KEY);
  }

  // Métodos privados

  private generateCacheKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramString ? `_${btoa(paramString)}` : ''}`;
  }

  private getFromCache<T>(key: string): T | null {
    // Intentar desde cache en memoria primero
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      // Mover al final para LRU
      this.memoryCache.delete(key);
      this.memoryCache.set(key, memoryItem);
      return memoryItem.data as T;
    }

    // Si no está en memoria, intentar desde localStorage
    try {
      const persistentCache = this.getPersistentCache();
      const persistentItem = persistentCache[key];

      if (persistentItem && !this.isExpired(persistentItem)) {
        // Promover a memoria cache
        this.memoryCache.set(key, persistentItem);
        return persistentItem.data as T;
      }
    } catch (error) {
      console.warn('Error accessing persistent cache:', error);
    }

    return null;
  }

  private setCache(key: string, data: any, ttl: number, persistent: boolean = false): void {
    const cacheItem: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1
    };

    // Guardar en memoria cache
    this.ensureMemoryCacheSize();
    this.memoryCache.set(key, cacheItem);

    // Guardar en cache persistente si está configurado
    if (persistent) {
      try {
        const persistentCache = this.getPersistentCache();
        persistentCache[key] = cacheItem;
        localStorage.setItem(this.PERSISTENT_CACHE_KEY, JSON.stringify(persistentCache));
      } catch (error) {
        console.warn('Error saving to persistent cache:', error);
      }
    }
  }

  private ensureMemoryCacheSize(): void {
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE) {
      // Remover el item menos usado (LRU simple)
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  private isExpired(item: CacheItem): boolean {
    return (Date.now() - item.timestamp) > item.ttl;
  }

  private initializePersistentCache(): void {
    try {
      const stored = localStorage.getItem(this.PERSISTENT_CACHE_KEY);
      if (stored) {
        const cache = JSON.parse(stored);
        let cleanedCount = 0;

        // Limpiar items expirados
        const cleanedCache = {};
        for (const [key, item] of Object.entries(cache)) {
          if (!this.isExpired(item as CacheItem)) {
            cleanedCache[key] = item;
          } else {
            cleanedCount++;
          }
        }

        if (cleanedCount > 0) {
          localStorage.setItem(this.PERSISTENT_CACHE_KEY, JSON.stringify(cleanedCache));
        }
      }
    } catch (error) {
      console.warn('Error initializing persistent cache:', error);
      localStorage.removeItem(this.PERSISTENT_CACHE_KEY);
    }
  }

  private getPersistentCache(): Record<string, CacheItem> {
    try {
      const stored = localStorage.getItem(this.PERSISTENT_CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private setupCleanupTimer(): void {
    // Limpiar cache expirado cada 10 minutos
    timer(0, 10 * 60 * 1000).subscribe(() => {
      this.cleanExpiredItems();
    });
  }

  private cleanExpiredItems(): void {
    let cleanedCount = 0;

    // Limpiar memoria cache
    for (const [key, item] of this.memoryCache) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Limpiar cache persistente
    try {
      const persistentCache = this.getPersistentCache();
      const cleanedCache = {};

      for (const [key, item] of Object.entries(persistentCache)) {
        if (!this.isExpired(item as CacheItem)) {
          cleanedCache[key] = item;
        } else {
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        localStorage.setItem(this.PERSISTENT_CACHE_KEY, JSON.stringify(cleanedCache));
      }
    } catch (error) {
      console.warn('Error cleaning persistent cache:', error);
    }

    if (cleanedCount > 0) {
    }
  }

  private getHitRate(): number {
    return this.cacheStats.totalRequests > 0
      ? Math.round((this.cacheStats.hits / this.cacheStats.totalRequests) * 100)
      : 0;
  }

  private updateStats(): void {
    this.cacheStats = {
      ...this.cacheStats,
      hitRate: this.getHitRate(),
      memoryCacheSize: this.memoryCache.size,
      persistentCacheSize: Object.keys(this.getPersistentCache()).length
    };

    this.statsSubject.next({ ...this.cacheStats });
  }
}

// Interfaces
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

interface EndpointConfig {
  ttl: number;
  persistent?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  memoryCacheSize: number;
  persistentCacheSize: number;
}
