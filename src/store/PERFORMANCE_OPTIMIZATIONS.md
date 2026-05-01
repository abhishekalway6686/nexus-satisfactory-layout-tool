# Performance Optimizations Summary

This document outlines the comprehensive performance optimizations implemented to fix state management issues in `layoutStore.ts` and component subscriptions.

## 🚀 Core Problems Addressed

1. **Object.values() called in render loops** - Creating new arrays on every render
2. **Inefficient Zustand subscriptions** - Causing unnecessary re-renders  
3. **No memoization of expensive operations** - Recalculating same values repeatedly
4. **Cascading re-renders** - State updates triggering unnecessary component updates

## 🎯 Optimization Solutions Implemented

### 1. Performance-Optimized Selectors (`src/store/performanceSelectors.ts`)

Created dedicated selectors that use `useShallow` and memoization:

```typescript
// ✅ OPTIMIZED - Memoized with useShallow
export const useBuildingsArray = () => {
  return useLayoutStore(
    useShallow((state) => Object.values(state.buildings))
  );
};

// ❌ BEFORE - New array created on every render
Object.values(buildings).forEach(...)
```

**Key Selectors Created:**
- `useBuildingsArray()` - Memoized buildings array
- `useConveyorBeltsArray()` - Memoized conveyor belts
- `usePipelinesArray()` - Memoized pipelines
- `useRailwaysArray()` - Memoized railways
- `useViewportBuildings(viewport)` - Viewport-filtered buildings
- `useCurrentFloorBuildings()` - Floor-filtered buildings
- `useRenderingData()` - Combined rendering data
- `useDrawingState()` - Drawing-specific state
- `useUIState()` - UI-specific state
- `useSelectionState()` - Selection-specific state

### 2. Computed Values Cache (`src/store/layoutStore.ts`)

Added intelligent caching system to store:

```typescript
// Performance optimization: Computed values cache
const computedValuesCache = new Map();
let cacheVersion = 0;

const getComputedValue = <T>(key: string, computeFn: () => T, dependencies: any[]): T => {
  const depHash = JSON.stringify(dependencies);
  const cacheKey = `${key}_${depHash}_${cacheVersion}`;
  
  if (computedValuesCache.has(cacheKey)) {
    return computedValuesCache.get(cacheKey); // Cache hit!
  }
  
  const result = computeFn();
  computedValuesCache.set(cacheKey, result);
  return result;
};
```

### 3. Update Batching System

Implemented update batching to reduce state churn:

```typescript
// Performance optimization: Update batching
let pendingUpdates: Array<() => void> = [];
let batchUpdateTimer: NodeJS.Timeout | null = null;

const batchUpdates = (updateFn: () => void) => {
  pendingUpdates.push(updateFn);
  
  if (batchUpdateTimer) {
    clearTimeout(batchUpdateTimer);
  }
  
  // Batch updates for ~60fps
  batchUpdateTimer = setTimeout(() => {
    // Apply all batched updates in a single state update
    set((state) => {
      let newState = { ...state };
      updates.forEach(updateFn => {
        const partialUpdate = updateFn();
        if (typeof partialUpdate === 'object' && partialUpdate !== null) {
          newState = { ...newState, ...partialUpdate };
        }
      });
      return newState;
    });
  }, 16);
};
```

### 4. Store Methods for Performance

Added optimized store methods:

- `getViewportBuildings(viewport)` - Cached viewport filtering
- `getCurrentFloorEntities()` - Cached floor filtering  
- `getEntityCounts()` - Counts without creating arrays
- `batchUpdate(updateFn)` - Batch multiple updates
- `getComputedValue(key, computeFn, deps)` - Get cached computed values
- `invalidateComputedCache()` - Invalidate cache when needed

### 5. Component Subscription Optimization

**FactoryCanvas.tsx** - Updated to use performance selectors:

```typescript
// ✅ OPTIMIZED - Using performance selectors
const useOptimizedStore = () => {
  const renderingData = useRenderingData();
  const drawingState = useDrawingState();
  const uiState = useUIState();
  const selectionState = useSelectionState();
  
  return useMemo(() => ({
    // Pre-filtered, memoized data
    buildings: renderingData.buildings,
    railways: renderingData.railways,
    // ... other optimized data
  }), [renderingData, drawingState, uiState, selectionState]);
};
```

**PropertiesPanel.tsx** - Replaced Object.values() calls:

```typescript
// ✅ OPTIMIZED - Using performance selectors  
const conveyorBeltsArray = useConveyorBeltsArray();
const pipelinesArray = usePipelinesArray();
const railwaysArray = useRailwaysArray();

// Used throughout component instead of Object.values()
const belt = conveyorBeltsArray.find(belt => ...)
```

### 6. Cache Invalidation

Added cache invalidation to critical store actions:

```typescript
addBuilding: withHistory('addBuilding', (building) => {
  invalidateComputedCache(); // Invalidate cache on data change
  set((state) => {
    // ... building logic
  });
}),

deleteBuilding: withHistory('deleteBuilding', (id) => {
  invalidateComputedCache(); // Invalidate cache on data change  
  set((state) => {
    // ... deletion logic
  });
}),
```

### 7. Performance Monitoring (`src/store/performanceMonitor.ts`)

Created comprehensive monitoring system:

- **Component render tracking** - Monitor render cycles
- **Cache performance** - Track hits/misses  
- **Selector efficiency** - Count avoided Object.values() calls
- **Performance reports** - Detailed performance analysis
- **Development utilities** - Easy debugging tools

**Usage:**
```typescript
// Start monitoring
PerformanceDevUtils.startMonitoring();

// ... use the app ...

// Get detailed report
PerformanceDevUtils.printReport();
```

## 📊 Performance Improvements Expected

### Before Optimization:
- ❌ Object.values() called 19+ times per render cycle
- ❌ New arrays created on every render
- ❌ Inefficient subscription patterns
- ❌ No caching of expensive computations
- ❌ Cascading re-renders

### After Optimization:  
- ✅ Object.values() calls cached and memoized
- ✅ Stable references prevent unnecessary re-renders
- ✅ Intelligent subscription patterns with useShallow
- ✅ Computed values cached with dependency tracking
- ✅ Update batching reduces state churn
- ✅ Performance monitoring for continuous improvement

## 🛠 Usage Guide

### For Components Using Store Data:

**Instead of:**
```typescript
// ❌ DON'T DO THIS - Creates new array every render
const buildings = useLayoutStore(state => Object.values(state.buildings));
```

**Use:**
```typescript  
// ✅ DO THIS - Memoized and cached
import { useBuildingsArray } from '../../store/performanceSelectors';
const buildings = useBuildingsArray();
```

### For Viewport/Floor Filtering:

```typescript
// ✅ Optimized viewport filtering
const viewportBuildings = useViewportBuildings(viewport);

// ✅ Optimized floor filtering  
const floorBuildings = useCurrentFloorBuildings();
```

### For Multiple Store Values:

```typescript
// ✅ Combined selectors prevent multiple subscriptions
const { buildings, railways, uiState } = useRenderingData();
```

## 🔧 Development Tools

Enable performance monitoring in development:

```javascript
// In browser console:
window.PerformanceDevUtils.startMonitoring();
// ... interact with app ...
window.PerformanceDevUtils.printReport();
```

## 📈 Monitoring Results

The performance monitoring will track:

- **Render cycles avoided** - How many unnecessary renders were prevented
- **Cache hit ratio** - Efficiency of the caching system  
- **Selector call optimization** - Object.values() calls avoided
- **Component performance** - Individual component render statistics

## 🎯 Key Benefits

1. **Reduced Re-renders** - Smart memoization and shallow equality
2. **Faster Data Access** - Cached computations and viewport filtering
3. **Better Memory Usage** - Avoiding repeated array creation
4. **Improved User Experience** - Smoother interactions and animations
5. **Developer Experience** - Performance monitoring and debugging tools
6. **Scalability** - System handles larger layouts more efficiently

This comprehensive optimization addresses all the core performance issues identified in the original request, providing both immediate performance gains and long-term scalability improvements.