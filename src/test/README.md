# Performance Testing Suite for Rust Optimizations

This comprehensive test suite validates and benchmarks the Rust performance optimizations integrated into the Satisfactory Layout Tool.

## 📁 Test Structure

```
src/test/
├── benchmarks/
│   └── performanceBenchmarks.ts    # Performance comparison suite
├── validation/
│   └── rustIntegrationTests.ts     # Result accuracy validation
├── integration/
│   └── hybridCalculationTests.ts   # Hybrid routing logic tests
├── utils/
│   └── testUtils.ts                # Test utilities and helpers
├── mocks/
│   └── tauriMocks.ts               # Tauri API mocks
├── setup.ts                        # Test environment setup
└── README.md                       # This file
```

## 🚀 Quick Start

### Running Performance Benchmarks

```typescript
import { runPerformanceBenchmarks } from './benchmarks/performanceBenchmarks';

// Run comprehensive benchmarks
const report = await runPerformanceBenchmarks(1000); // 1000 iterations
console.log(`Average speed improvement: ${report.summary.avgSpeedImprovement}x`);
```

### Running Validation Tests

```typescript
import { runRustIntegrationValidation } from './validation/rustIntegrationTests';

// Validate that Rust functions produce identical results to TypeScript
const validationReport = await runRustIntegrationValidation();
console.log(`Success rate: ${validationReport.successRate}%`);
```

### Running Hybrid Integration Tests

```typescript
import { runHybridCalculationTests } from './integration/hybridCalculationTests';

// Test hybrid routing logic and fallback mechanisms
const integrationReport = await runHybridCalculationTests();
console.log(`Optimal choices: ${integrationReport.summary.optimalChoices}`);
```

## 🧪 Test Categories

### 1. Performance Benchmarks (`benchmarks/performanceBenchmarks.ts`)

**Purpose**: Compare execution speed between Rust and TypeScript implementations

**Key Features**:
- Tests different dataset sizes (small, medium, large, xlarge)
- Measures execution time for various operations:
  - Distance calculations (3D, 2D, squared variants)
  - Intersection detection
  - Curve calculations (Bezier, turn detection)
  - Segment length calculations
  - Power network validation
  - Spatial queries

**Sample Usage**:
```typescript
const benchmarks = new PerformanceBenchmarks();
const report = await benchmarks.runComprehensiveBenchmarks(500);

// Export results
const csv = benchmarks.exportToCSV();
console.log('Fastest operations:', benchmarks.getFastestOperations(5));
```

**Key Metrics**:
- Speed improvement ratios
- Error rates
- Result accuracy
- Recommended operation thresholds

### 2. Validation Tests (`validation/rustIntegrationTests.ts`)

**Purpose**: Ensure Rust functions produce identical results to TypeScript

**Key Features**:
- Edge case testing (zero distance, very small/large values, negative coordinates)
- Precision validation (floating-point accuracy)
- Error handling verification
- Empty dataset handling
- Complex geometric scenarios

**Sample Usage**:
```typescript
const validator = new RustIntegrationValidator();
const report = await validator.runValidationSuite();

// Check failed validations
const failures = validator.getFailedValidations();
const precision = validator.getPrecisionAnalysis();
```

**Edge Cases Covered**:
- Identical points (zero distance)
- Extreme floating-point values
- Empty/single-point polylines
- Parallel lines (no intersections)
- Collinear points (turn detection)
- Overlapping curves

### 3. Hybrid Integration Tests (`integration/hybridCalculationTests.ts`)

**Purpose**: Test hybrid routing logic and fallback mechanisms

**Key Features**:
- Performance threshold validation
- Fallback mechanism testing
- Call frequency tracking
- Method selection logic
- Error recovery testing

**Sample Usage**:
```typescript
const tester = new HybridCalculationTester();
const report = await tester.runIntegrationTests();

// Analyze performance choices
const subOptimal = tester.getSubOptimalChoices();
const failedFallbacks = tester.getFailedFallbacks();
```

**Tests Include**:
- Threshold-based routing decisions
- High-frequency call optimization
- Rust failure recovery
- Performance-based method selection

## 🛠️ Test Utilities

### Mock Setup (`mocks/tauriMocks.ts`)

Comprehensive mocking of Tauri APIs for testing without actual Rust backend:

```typescript
import { setupTestEnvironment } from './mocks/tauriMocks';

const { commands, environment, performance, failureSimulator, cleanup } = setupTestEnvironment();

// Enable Rust environment simulation
environment.isTauriEnvironment.mockReturnValue(true);
environment.PerformanceConfig.useNativeCalculations = true;

// Simulate failures
failureSimulator.simulateSpecificFailure('calculate_distance_3d', 'Test failure');

// Cleanup after tests
cleanup();
```

### Test Data Generators (`utils/testUtils.ts`)

Generate realistic test data for various scenarios:

```typescript
import { TestDataGenerator } from './utils/testUtils';

// Generate test points
const points = TestDataGenerator.generatePoints(1000);

// Generate intersecting polylines
const { poly1, poly2 } = TestDataGenerator.generateIntersectingPolylines();

// Generate curve test data
const triples = TestDataGenerator.generateTriplePoints(50);
```

### Performance Utilities

```typescript
import { PerformanceTestUtils } from './utils/testUtils';

// Measure execution time
const { result, timeMs } = await PerformanceTestUtils.measureExecutionTime(async () => {
  return await someExpensiveOperation();
});

// Compare implementations
const comparison = await PerformanceTestUtils.comparePerformance(
  rustImplementation,
  jsImplementation,
  100 // iterations
);

console.log(`Improvement: ${comparison.improvement}x`);
```

## 📊 UI Integration

### Performance Benchmark Panel (`components/Debug/PerformanceBenchmarkPanel.tsx`)

React component for running benchmarks in the UI:

```typescript
import { PerformanceBenchmarkPanel } from '../components/Debug/PerformanceBenchmarkPanel';

// Add to your debug panel or dev tools
<PerformanceBenchmarkPanel />
```

**Features**:
- Real-time benchmark execution
- Performance comparison visualization
- Export results (JSON/CSV)
- Validation test integration
- Auto-refresh capabilities
- Advanced configuration options

## 📋 Test Execution Examples

### Basic Performance Test

```typescript
describe('Distance Calculation Performance', () => {
  it('should show performance improvement with Rust', async () => {
    const testPoints = TestDataGenerator.generatePoints(1000);
    const p1 = testPoints[0];
    const p2 = testPoints[1];

    const jsTime = await PerformanceTestUtils.measureExecutionTime(
      () => JSDistanceCalculations.distance3D(p1, p2)
    );

    const rustTime = await PerformanceTestUtils.measureExecutionTime(
      () => TauriCommands.calculateDistance3D(p1, p2)
    );

    expect(jsTime.timeMs / rustTime.timeMs).toBeGreaterThan(1.5); // 50% improvement
  });
});
```

### Validation Test

```typescript
describe('Result Validation', () => {
  it('should produce identical results for distance calculation', async () => {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 3, y: 4, z: 0 };

    const jsResult = JSDistanceCalculations.distance3D(p1, p2);
    const rustResult = await TauriCommands.calculateDistance3D(p1, p2);

    expect(PerformanceTestUtils.validateResultsMatch(jsResult, rustResult)).toBe(true);
  });
});
```

### Hybrid Integration Test

```typescript
describe('Hybrid Routing', () => {
  it('should choose optimal method based on dataset size', async () => {
    const smallDataset = TestDataGenerator.generatePoints(5);
    const largeDataset = TestDataGenerator.generatePoints(500);

    // Small datasets should prefer JavaScript
    const smallChoice = await testHybridRouting('bulk_distance', smallDataset.length);
    expect(smallChoice).toBe('js');

    // Large datasets should prefer Rust
    const largeChoice = await testHybridRouting('bulk_distance', largeDataset.length);
    expect(largeChoice).toBe('rust');
  });
});
```

## 🎯 Performance Thresholds

The tests validate optimal performance thresholds:

| Operation | Small (JS) | Medium | Large (Rust) | Rationale |
|-----------|------------|---------|--------------|-----------|
| Individual Distance | ≤1 items | - | - | IPC overhead too high |
| Bulk Distance | ≤100 items | 100-500 | ≥500 items | Batching benefits |
| Intersection Detection | ≤10 points | 10-50 | ≥50 points | Spatial indexing |
| Curve Calculations | ≤5 points | 5-20 | ≥20 points | Complex math benefits |
| Spatial Queries | ≤10 queries | 10-50 | ≥50 queries | Index traversal |

## 📈 Expected Results

### Performance Improvements

- **Distance Calculations**: 2-5x improvement for bulk operations
- **Intersection Detection**: 10-50x improvement for large polylines  
- **Curve Calculations**: 3-10x improvement for complex curves
- **Spatial Queries**: 5-20x improvement for bulk queries

### Reliability Targets

- **Result Accuracy**: >99% identical results (within floating-point precision)
- **Fallback Success**: >95% successful JavaScript fallback on Rust failure
- **Optimal Routing**: >90% optimal method selection based on thresholds

## 🔧 Configuration

### Environment Variables

```bash
# Enable comprehensive testing
RUST_PERFORMANCE_TESTING=true

# Set test iterations (default: 1000)
BENCHMARK_ITERATIONS=500

# Enable debug logging
DEBUG_PERFORMANCE_TESTS=true
```

### Test Configuration

```typescript
// vitest.config.ts or jest.config.js
export default {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testEnvironment: 'jsdom',
  testTimeout: 30000, // Allow time for performance tests
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
```

## 🚨 Troubleshooting

### Common Issues

1. **"Rust not available" errors**: Ensure Tauri environment is properly mocked
2. **Timeout errors**: Increase test timeout for performance benchmarks
3. **Precision failures**: Adjust tolerance in validation tests
4. **Mock setup failures**: Verify Tauri mocks are initialized before tests

### Debug Tips

```typescript
// Enable debug logging
mockUtils.enableDebugLogging();

// Check mock setup
console.log('Rust available:', mockTauriEnvironment.isTauriEnvironment());
console.log('Commands available:', Object.keys(mockTauriCommands));

// Validate test data
console.log('Test points:', TestDataGenerator.generatePoints(5));
```

This comprehensive test suite ensures that Rust optimizations deliver the expected performance improvements while maintaining result accuracy and reliability across all supported scenarios.