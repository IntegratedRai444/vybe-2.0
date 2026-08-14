import { useState, useEffect } from 'react';

/**
 * A custom hook that debounces a value.
 * @param value The value to be debounced
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear the timeout if the value or delay changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

/**
 * Example usage:
 * 
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * // This effect will only run when debouncedSearchTerm changes
 * // (i.e., when the user stops typing for 300ms)
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     // Perform search or API call
 *     searchItems(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
