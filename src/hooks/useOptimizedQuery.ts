
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  throttleMs?: number;
}

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  throttleMs = 1000,
  ...options
}: OptimizedQueryOptions<T>) {
  
  // Memoize the query function to prevent unnecessary re-renders
  const memoizedQueryFn = useCallback(queryFn, [queryFn]);
  
  // Memoize the query key
  const memoizedQueryKey = useMemo(() => queryKey, [JSON.stringify(queryKey)]);
  
  return useQuery({
    queryKey: memoizedQueryKey,
    queryFn: memoizedQueryFn,
    staleTime: throttleMs,
    gcTime: throttleMs * 5, // Keep in cache 5x longer than stale time
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Only retry network errors, not auth errors
      if (error && typeof error === 'object' && 'code' in error) {
        return false; // Don't retry Supabase errors
      }
      return failureCount < 2; // Max 2 retries for network errors
    },
    ...options,
  });
}

// Hook for paginated queries with optimized caching
export function useOptimizedPaginatedQuery<T>({
  queryKey,
  queryFn,
  pageSize = 20,
  ...options
}: OptimizedQueryOptions<T> & { pageSize?: number }) {
  
  return useOptimizedQuery({
    queryKey,
    queryFn,
    staleTime: 2000, // 2 seconds for paginated data
    ...options,
  });
}

// Hook for real-time queries that update frequently
export function useOptimizedRealtimeQuery<T>({
  queryKey,
  queryFn,
  ...options
}: OptimizedQueryOptions<T>) {
  
  return useOptimizedQuery({
    queryKey,
    queryFn,
    throttleMs: 500, // 500ms for real-time data
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  });
}
