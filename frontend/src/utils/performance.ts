/**
 * Performance optimization utilities for the code editor
 */

// Cache for storing completion results
const completionCache = new Map<string, any>();

/**
 * Memoize function calls with cache invalidation
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey: (...args: Parameters<T>) => string,
  ttl: number = 5 * 60 * 1000 // 5 minutes default TTL
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args);
    const now = Date.now();
    
    // Check cache
    const cached = completionCache.get(key);
    if (cached && (now - cached.timestamp < ttl)) {
      return cached.value;
    }
    
    // Call function and cache result
    const result = fn(...args);
    completionCache.set(key, {
      value: result,
      timestamp: now
    });
    
    return result;
  };
}

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout as NodeJS.Timeout);
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * Clear the completion cache
 */
export function clearCompletionCache() {
  completionCache.clear();
}

/**
 * Performance metrics tracker
 */
export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: Map<string, number[]> = new Map();
  
  private constructor() {}
  
  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }
  
  /**
   * Track a performance metric
   */
  track(metricName: string, duration: number): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    this.metrics.get(metricName)?.push(duration);
    
    // Keep only the last 100 measurements
    const metrics = this.metrics.get(metricName);
    if (metrics && metrics.length > 100) {
      this.metrics.set(metricName, metrics.slice(-100));
    }
  }
  
  /**
   * Get performance statistics for a metric
   */
  getStats(metricName: string): { avg: number; min: number; max: number; count: number } | null {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) return null;
    
    const sum = metrics.reduce((a, b) => a + b, 0);
    const avg = sum / metrics.length;
    const min = Math.min(...metrics);
    const max = Math.max(...metrics);
    
    return { avg, min, max, count: metrics.length };
  }
}
