import React, { useRef, useEffect } from 'react';
import { Layer } from 'react-konva';
import { GridBackground } from '../GridBackground';
import { FoundationShape } from '../../Architecture/FoundationShape';
import { WallShape } from '../../Architecture/WallShape';
import { useLayoutStore } from '../../../store/layoutStore';
import { useShallow } from 'zustand/react/shallow';
import Konva from 'konva';

interface StaticGridLayerProps {
  scale: number;
  currentFloor: number;
  listening?: boolean;
}

// This layer renders the grid and architectural elements that rarely change
// It uses aggressive caching to prevent re-renders
export const StaticGridLayer = React.memo<StaticGridLayerProps>(({ 
  scale, 
  currentFloor,
  listening = false 
}) => {
  const layerRef = useRef<Konva.Layer>(null);
  const lastCacheKey = useRef<string>('');
  
  // Only subscribe to architectural elements
  const { foundations, wallSegments } = useLayoutStore(
    useShallow((state) => ({
      foundations: state.foundations,
      wallSegments: state.wallSegments
    }))
  );
  
  // Calculate cache key based on content that would affect rendering
  const cacheKey = `${scale}-${currentFloor}-${Object.keys(foundations).length}-${Object.keys(wallSegments).length}`;
  
  // Cache the layer when content changes
  useEffect(() => {
    if (layerRef.current && cacheKey !== lastCacheKey.current) {
      const layer = layerRef.current;
      
      // Clear previous cache
      layer.clearCache();
      
      // Cache the layer
      layer.cache({
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // Limit pixel ratio for performance
        imageSmoothingEnabled: true
      });
      
      lastCacheKey.current = cacheKey;
    }
  }, [cacheKey]);
  
  // Filter elements by floor
  const floorFoundations = Object.values(foundations).filter(f => f.z === currentFloor);
  const floorWalls = Object.values(wallSegments).filter(w => w.startZ === currentFloor);
  
  return (
    <Layer 
      ref={layerRef}
      name="static-grid" 
      listening={listening}
      clearBeforeDraw={true}
    >
      <GridBackground scale={scale} />
      
      {/* Foundations */}
      {floorFoundations.map((foundation) => (
        <FoundationShape
          key={foundation.id}
          foundation={foundation}
        />
      ))}
      
      {/* Walls */}
      {floorWalls.map((wall) => (
        <WallShape
          key={wall.id}
          wall={wall}
        />
      ))}
    </Layer>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for memo - only re-render if these change
  return (
    prevProps.scale === nextProps.scale &&
    prevProps.currentFloor === nextProps.currentFloor &&
    prevProps.listening === nextProps.listening
  );
});

StaticGridLayer.displayName = 'StaticGridLayer';