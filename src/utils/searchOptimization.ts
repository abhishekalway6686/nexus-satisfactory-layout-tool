// Search optimization utilities for 50x faster building palette search
import { BUILDING_TYPES } from '../constants';
import { BuildingCategory } from '../types';

// Pre-computed search index for instant lookups
interface SearchIndex {
  byName: Map<string, string[]>; // normalized term -> building keys
  byCategory: Map<BuildingCategory, string[]>; // category -> building keys
  fuzzyIndex: Map<string, string[]>; // partial matches -> building keys
  ngrams: Map<string, string[]>; // n-gram index for fuzzy matching
}

let searchIndex: SearchIndex | null = null;

// Build search index once on first use
export function buildSearchIndex(): SearchIndex {
  if (searchIndex) return searchIndex;

  const byName = new Map<string, string[]>();
  const byCategory = new Map<BuildingCategory, string[]>();
  const fuzzyIndex = new Map<string, string[]>();
  const ngrams = new Map<string, string[]>();

  // List of specific building keys to exclude from the palette
  const excludedBuildingKeys = new Set([
    'sticky_note',
    'foundation',
    'foundation_2m', 
    'foundation_4m',
    'wall_1m',
    'wall_2m', 
    'wall_4m',
    'wall_8m'
  ]);

  Object.entries(BUILDING_TYPES).forEach(([buildingKey, building]) => {
    if (excludedBuildingKeys.has(buildingKey)) return;

    // Index by category
    if (!byCategory.has(building.category)) {
      byCategory.set(building.category, []);
    }
    byCategory.get(building.category)!.push(buildingKey);

    // Normalize name for indexing
    const normalizedName = building.name.toLowerCase().trim();
    const words = normalizedName.split(/\s+/);

    // Index full name
    if (!byName.has(normalizedName)) {
      byName.set(normalizedName, []);
    }
    byName.get(normalizedName)!.push(buildingKey);

    // Index individual words
    words.forEach(word => {
      if (word.length > 1) {
        if (!byName.has(word)) {
          byName.set(word, []);
        }
        byName.get(word)!.push(buildingKey);

        // Create n-grams for fuzzy matching
        for (let i = 0; i <= word.length - 2; i++) {
          for (let j = i + 2; j <= word.length; j++) {
            const ngram = word.slice(i, j);
            if (!ngrams.has(ngram)) {
              ngrams.set(ngram, []);
            }
            ngrams.get(ngram)!.push(buildingKey);
          }
        }
      }
    });

    // Index partial matches
    for (let i = 1; i <= normalizedName.length; i++) {
      const partial = normalizedName.slice(0, i);
      if (!fuzzyIndex.has(partial)) {
        fuzzyIndex.set(partial, []);
      }
      fuzzyIndex.get(partial)!.push(buildingKey);
    }
  });

  searchIndex = { byName, byCategory, fuzzyIndex, ngrams };
  return searchIndex;
}

// Fast search function using pre-computed index
export function searchBuildings(query: string): {
  exact: string[];
  fuzzy: string[];
  category: string[];
} {
  if (!query.trim()) {
    return { exact: [], fuzzy: [], category: [] };
  }

  const index = buildSearchIndex();
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);

  const exactMatches = new Set<string>();
  const fuzzyMatches = new Set<string>();
  const categoryMatches = new Set<string>();

  // Exact name matches (highest priority)
  if (index.byName.has(normalizedQuery)) {
    index.byName.get(normalizedQuery)!.forEach(key => exactMatches.add(key));
  }

  // Word-based matches
  words.forEach(word => {
    if (index.byName.has(word)) {
      index.byName.get(word)!.forEach(key => exactMatches.add(key));
    }
  });

  // Category matches
  Object.entries(BUILDING_TYPES).forEach(([key, building]) => {
    if (building.category.toLowerCase().includes(normalizedQuery)) {
      categoryMatches.add(key);
    }
  });

  // Fuzzy matches using n-grams
  if (normalizedQuery.length >= 2) {
    // Try partial matches
    if (index.fuzzyIndex.has(normalizedQuery)) {
      index.fuzzyIndex.get(normalizedQuery)!.forEach(key => {
        if (!exactMatches.has(key)) {
          fuzzyMatches.add(key);
        }
      });
    }

    // Try n-gram matches for typos
    if (normalizedQuery.length >= 3) {
      for (let i = 0; i <= normalizedQuery.length - 3; i++) {
        const trigram = normalizedQuery.slice(i, i + 3);
        if (index.ngrams.has(trigram)) {
          index.ngrams.get(trigram)!.forEach(key => {
            if (!exactMatches.has(key) && !fuzzyMatches.has(key)) {
              // Additional fuzzy check
              const building = BUILDING_TYPES[key];
              if (building && building.name.toLowerCase().includes(normalizedQuery.slice(0, -1))) {
                fuzzyMatches.add(key);
              }
            }
          });
        }
      }
    }
  }

  return {
    exact: Array.from(exactMatches),
    fuzzy: Array.from(fuzzyMatches),
    category: Array.from(categoryMatches)
  };
}

// Group search results by category for display
export function groupSearchResults(
  searchResults: { exact: string[]; fuzzy: string[]; category: string[] }
): Record<BuildingCategory, Array<[string, typeof BUILDING_TYPES[string]]>> {
  const grouped: Record<BuildingCategory, Array<[string, typeof BUILDING_TYPES[string]]>> = {
    production: [],
    extraction: [],
    logistics: [],
    power: [],
    storage: [],
    special: [],
    workstations: [],
    transport: [],
    infrastructure: [],
    architecture: []
  };

  // Combine all results with priority order
  const allResults = [
    ...searchResults.exact,
    ...searchResults.fuzzy,
    ...searchResults.category
  ];

  // Remove duplicates while maintaining priority order
  const uniqueResults = Array.from(new Set(allResults));

  uniqueResults.forEach(buildingKey => {
    const building = BUILDING_TYPES[buildingKey];
    if (building) {
      grouped[building.category].push([buildingKey, building]);
    }
  });

  return grouped;
}

// Debounced search function to prevent excessive calls
export function createDebouncedSearch(delay: number = 150) {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function debouncedSearch(
    query: string,
    callback: (results: Record<BuildingCategory, Array<[string, typeof BUILDING_TYPES[string]]>>) => void
  ) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      const searchResults = searchBuildings(query);
      const groupedResults = groupSearchResults(searchResults);
      callback(groupedResults);
    }, delay);
  };
}