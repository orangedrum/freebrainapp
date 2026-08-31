/**
 * useLocationSearch
 * ─────────────────
 * Debounced city search via Nominatim (OpenStreetMap).
 * Returns unique city results for the onboarding location step.
 */

import { useState, useCallback, useRef } from "react";

export function useLocationSearch() {
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationResults([]);
      return;
    }

    // Debounce: Nominatim rate-limits to 1 req/sec. Without this,
    // typing "Austin" fires 5+ requests in <1s and they all 429.
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const reqId = ++requestIdRef.current;
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query)}&format=json&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        if (reqId !== requestIdRef.current) return; // stale response
        const data = await res.json();
        const uniqueCities = Array.from(new Set(data.map((item: any) => item.display_name))).map(
          (name) => data.find((item: any) => item.display_name === name)
        );
        setLocationResults(uniqueCities);
      } catch (error) {
        console.error("Location search failed", error);
      } finally {
        if (reqId === requestIdRef.current) setIsSearchingLocation(false);
      }
    }, 500);
  }, []);

  return { locationResults, isSearchingLocation, searchLocation, setLocationResults };
}
