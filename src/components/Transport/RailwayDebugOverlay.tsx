// src/components/Transport/RailwayDebugOverlay.tsx
import React from 'react';
import { Circle, Text } from 'react-konva';
import { useLayoutStore } from '../../store/layoutStore';
import { NODE_CONSOLIDATION_THRESHOLD } from '../../logic/railway/railwayNodeConsolidation';

interface RailwayDebugOverlayProps {
  visible?: boolean;
}

export const RailwayDebugOverlay: React.FC<RailwayDebugOverlayProps> = ({ visible = false }) => {
  const nodes = useLayoutStore((state) => state.railwayNodes);
  const segments = useLayoutStore((state) => state.railwaySegments);
  
  if (!visible) return null;
  
  // Find nodes that are within consolidation threshold of each other
  const proximityGroups: Array<{ nodes: string[]; center: { x: number; y: number } }> = [];
  const processedNodes = new Set<string>();
  
  Object.entries(nodes).forEach(([nodeId, node]) => {
    if (processedNodes.has(nodeId)) return;
    
    const group = [nodeId];
    let sumX = node.x;
    let sumY = node.y;
    
    // Find all nodes within threshold
    Object.entries(nodes).forEach(([otherId, otherNode]) => {
      if (nodeId === otherId || processedNodes.has(otherId)) return;
      
      const dx = node.x - otherNode.x;
      const dy = node.y - otherNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= NODE_CONSOLIDATION_THRESHOLD) {
        group.push(otherId);
        sumX += otherNode.x;
        sumY += otherNode.y;
      }
    });
    
    if (group.length > 1) {
      group.forEach(id => processedNodes.add(id));
      proximityGroups.push({
        nodes: group,
        center: { x: sumX / group.length, y: sumY / group.length }
      });
    }
  });
  
  // Count segments connected to each node
  const nodeConnectionCount: Record<string, number> = {};
  Object.values(segments).forEach(segment => {
    nodeConnectionCount[segment.startNode] = (nodeConnectionCount[segment.startNode] || 0) + 1;
    nodeConnectionCount[segment.endNode] = (nodeConnectionCount[segment.endNode] || 0) + 1;
  });
  
  return (
    <>
      {/* Highlight proximity groups */}
      {proximityGroups.map((group, index) => (
        <React.Fragment key={`group-${index}`}>
          <Circle
            x={group.center.x}
            y={group.center.y}
            radius={NODE_CONSOLIDATION_THRESHOLD * 100} // Convert to pixels
            fill="rgba(255, 0, 0, 0.2)"
            stroke="red"
            strokeWidth={2}
            dash={[5, 5]}
          />
          <Text
            x={group.center.x - 30}
            y={group.center.y - 20}
            text={`${group.nodes.length} overlapping nodes`}
            fontSize={12}
            fill="red"
          />
        </React.Fragment>
      ))}
      
      {/* Show node IDs and connection counts */}
      {Object.entries(nodes).map(([nodeId, node]) => {
        const connectionCount = nodeConnectionCount[nodeId] || 0;
        const isJunction = connectionCount >= 3;
        
        return (
          <React.Fragment key={`debug-${nodeId}`}>
            <Circle
              x={node.x}
              y={node.y}
              radius={3}
              fill={isJunction ? 'orange' : 'blue'}
              opacity={0.8}
            />
            <Text
              x={node.x + 5}
              y={node.y - 10}
              text={`${nodeId.substring(0, 8)}... (${connectionCount})`}
              fontSize={10}
              fill={isJunction ? 'orange' : 'blue'}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default RailwayDebugOverlay;