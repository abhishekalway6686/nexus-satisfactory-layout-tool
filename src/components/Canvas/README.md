# Adaptive Canvas System

This system provides a GPU renderer abstraction layer that allows React components to work seamlessly with both Konva and WebGL renderers while maintaining full compatibility and performance optimization.

## Architecture Overview

### 1. Renderer Abstraction Layer
- `RendererInterface` - Common interface for all renderers
- `RendererAdapter` - Abstract adapter base class
- `KonvaAdapter` - React-Konva bridge implementation
- `WebGLAdapter` - GPU-accelerated rendering implementation

### 2. Adaptive Components
All canvas components have been updated to work with the renderer abstraction:
- `AdaptiveFactoryCanvas` - Main canvas component with auto-switching
- `AdaptiveBuildingShape` - GPU-optimized building rendering
- `AdaptiveConveyorBeltShape` - Curve-optimized conveyor rendering
- `AdaptiveRailwayShape` - GPU-accelerated railway curves

### 3. Performance Features

#### Level of Detail (LOD) System
- **Low Detail**: Simplified geometry, minimal features
- **Medium Detail**: Standard geometry, essential features
- **High Detail**: Full geometry, all visual features

#### GPU Optimizations
- **Instanced Rendering**: Batch similar objects for GPU efficiency
- **Curve Calculations**: Offload complex curves to GPU
- **Batched Operations**: Group similar draw calls
- **Memory Management**: Efficient buffer usage

#### Smart Fallbacks
- Automatic fallback to Konva when WebGL unavailable
- Progressive enhancement based on device capabilities
- Performance-based auto-optimization

## Usage Examples

### Basic Integration

```typescript
import { AdaptiveFactoryCanvas } from './components/Canvas/AdaptiveFactoryCanvas';

function App() {
  return (
    <div className="app">
      <AdaptiveFactoryCanvas
        onPositionChange={(x, y) => console.log('Position:', x, y)}
        onZoomChange={(scale) => console.log('Zoom:', scale)}
        leftPanelWidth={350}
        rightPanelWidth={400}
      />
    </div>
  );
}
```

### Custom Shape Component

```typescript
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';

interface MyShapeProps {
  adapter: RendererAdapter;
  item: MyItem;
  lodLevel: 'low' | 'medium' | 'high';
}

export const MyAdaptiveShape: React.FC<MyShapeProps> = ({ adapter, item, lodLevel }) => {
  // GPU optimization check
  const isGPU = adapter.isGPURenderer();
  
  // Adjust complexity based on LOD
  const complexity = lodLevel === 'high' ? 'full' : 'simplified';
  
  return adapter.createGroup({
    id: `my-shape-${item.id}`,
    children: (
      <>
        {adapter.createRect({
          id: `my-shape-main-${item.id}`,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fill: item.color
        })}
        
        {/* High detail only */}
        {lodLevel === 'high' && adapter.createText({
          id: `my-shape-label-${item.id}`,
          x: item.x,
          y: item.y - 20,
          text: item.name,
          fontSize: 12
        })}
      </>
    )
  });
};
```

### Renderer Configuration

```typescript
import { useRendererAdapter } from '../../hooks/useRendererAdapter';

function MyComponent() {
  const {
    adapter,
    rendererType,
    capabilities,
    enableInstancedRendering,
    setLODConfig
  } = useRendererAdapter(containerRef.current, {
    enableBatching: true,
    enableInstancedRendering: true,
    lodConfig: {
      lowDetail: 0.3,
      mediumDetail: 0.8,
      highDetail: 1.5
    }
  });

  // Configure for high performance
  useEffect(() => {
    if (capabilities.supportsInstancedRendering) {
      enableInstancedRendering(true);
    }
    
    // Adjust LOD for performance
    setLODConfig({
      lowDetail: 0.5,
      mediumDetail: 1.0,
      highDetail: 2.0
    });
  }, [capabilities]);
}
```

## Performance Guidelines

### 1. LOD Usage
- Use `low` detail for distant objects or high object counts
- Use `medium` detail for standard viewing
- Use `high` detail for close-up or selected objects

### 2. GPU Optimizations
- Enable instanced rendering for >100 similar objects
- Use batching for complex shapes with many sub-elements
- Prefer curves over many straight line segments

### 3. Memory Management
- Flush batched operations regularly
- Monitor performance stats
- Use appropriate buffer sizes

### 4. Fallback Strategy
- Always provide Konva fallback
- Test on low-end devices
- Graceful degradation of features

## Component Migration

### Original Konva Component
```typescript
import { Group, Rect, Circle } from 'react-konva';

export const OldComponent = ({ building }) => (
  <Group>
    <Rect x={building.x} y={building.y} width={100} height={100} fill="blue" />
    <Circle x={building.x + 50} y={building.y + 50} radius={10} fill="red" />
  </Group>
);
```

### Adaptive Component
```typescript
import { RendererAdapter } from '../../renderer/adapters/RendererAdapter';

export const NewComponent = ({ adapter, building, lodLevel }) => 
  adapter.createGroup({
    id: `building-${building.id}`,
    children: (
      <>
        {adapter.createRect({
          id: `building-main-${building.id}`,
          x: building.x,
          y: building.y,
          width: 100,
          height: 100,
          fill: 'blue'
        })}
        
        {/* Only show detail at medium/high LOD */}
        {lodLevel !== 'low' && adapter.createCircle({
          id: `building-detail-${building.id}`,
          x: building.x + 50,
          y: building.y + 50,
          radius: 10,
          fill: 'red'
        })}
      </>
    )
  });
```

## Testing

### 1. Renderer Compatibility
- Test with both Konva and WebGL renderers
- Verify identical visual output
- Check interaction behavior

### 2. Performance Testing
- Monitor FPS with large datasets
- Test LOD switching performance
- Verify GPU utilization

### 3. Fallback Testing
- Disable WebGL to test Konva fallback
- Test on various device capabilities
- Verify graceful degradation

## Troubleshooting

### Common Issues

1. **Components not rendering**
   - Check adapter is properly passed down
   - Verify all required props are provided
   - Check console for adapter creation errors

2. **Performance issues**
   - Enable performance monitoring
   - Adjust LOD thresholds
   - Check if instanced rendering is available

3. **WebGL fallback not working**
   - Verify Konva adapter implementation
   - Check renderer factory configuration
   - Test renderer switching manually

### Debug Information

Enable development mode to see:
- Current renderer type
- Performance statistics
- LOD levels
- GPU capabilities
- Batch operation counts

```typescript
// In development, performance overlay shows:
{
  renderer: 'webgl' | 'konva',
  fps: 60,
  frameTime: 16.7,
  drawCalls: 45,
  memory: 1024000,
  lodLevel: 'high',
  gpuEnabled: true,
  instancedRendering: true
}
```

This adaptive system ensures your factory layout tool can deliver optimal performance across all devices while maintaining the familiar React component architecture.