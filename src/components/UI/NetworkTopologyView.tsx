// Network Topology Visualization Component
// Interactive visual representation of network structure and connections

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Filter,
  Info,
  MapPin
} from 'lucide-react';
import { 
  StationNetwork, 
  NetworkStation, 
  NetworkConnection, 
  Building,
  Point3D 
} from '../../types';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

interface NetworkTopologyViewProps {
  network: StationNetwork;
  buildings: Record<string, Building>;
}

interface Node {
  id: string;
  x: number;
  y: number;
  station: NetworkStation;
  building: Building;
}

interface Edge {
  id: string;
  source: Node;
  target: Node;
  connection: NetworkConnection;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export const NetworkTopologyView: React.FC<NetworkTopologyViewProps> = ({
  network,
  buildings
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scale: 1
  });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [colorMode, setColorMode] = useState<'health' | 'utilization' | 'efficiency'>('health');

  // Process network data into graph nodes and edges
  const { nodes, edges, bounds } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Create nodes from stations
    network.stations.forEach((station, stationId) => {
      const building = buildings[stationId];
      if (building) {
        const node: Node = {
          id: stationId,
          x: building.x,
          y: building.y,
          station,
          building
        };
        nodeMap.set(stationId, node);
        
        // Update bounds
        minX = Math.min(minX, building.x);
        maxX = Math.max(maxX, building.x);
        minY = Math.min(minY, building.y);
        maxY = Math.max(maxY, building.y);
      }
    });

    // Create edges from connections
    network.connections.forEach(connection => {
      const sourceNode = nodeMap.get(connection.from);
      const targetNode = nodeMap.get(connection.to);
      
      if (sourceNode && targetNode) {
        edgeList.push({
          id: connection.id,
          source: sourceNode,
          target: targetNode,
          connection
        });
      }
    });

    // Add padding to bounds
    const padding = 100;
    const graphBounds = {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding
    };

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
      bounds: graphBounds
    };
  }, [network, buildings]);

  // Initialize viewBox to fit all nodes
  useEffect(() => {
    if (nodes.length > 0) {
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const scale = Math.min(800 / width, 600 / height) * 0.8;
      
      setViewBox({
        x: bounds.minX,
        y: bounds.minY,
        width: width,
        height: height,
        scale: scale
      });
    }
  }, [nodes, bounds]);

  const getNodeColor = useCallback((node: Node) => {
    switch (colorMode) {
      case 'health':
        if (node.station.status === 'healthy') return '#10b981'; // green-500
        if (node.station.status === 'stressed') return '#f59e0b'; // yellow-500
        if (node.station.status === 'bottleneck') return '#ef4444'; // red-500
        return '#6b7280'; // gray-500
        
      case 'utilization':
        const utilization = node.station.throughput.utilization;
        if (utilization < 25) return '#3b82f6'; // blue-500
        if (utilization < 75) return '#10b981'; // green-500
        if (utilization < 90) return '#f59e0b'; // yellow-500
        return '#ef4444'; // red-500
        
      case 'efficiency':
        const avgEfficiency = node.station.connections.reduce(
          (sum, conn) => sum + conn.efficiency, 0
        ) / Math.max(1, node.station.connections.length);
        if (avgEfficiency >= 80) return '#10b981'; // green-500
        if (avgEfficiency >= 60) return '#f59e0b'; // yellow-500
        return '#ef4444'; // red-500
        
      default:
        return '#6b7280';
    }
  }, [colorMode]);

  const getEdgeColor = useCallback((edge: Edge) => {
    const efficiency = edge.connection.efficiency;
    if (efficiency >= 80) return '#10b981'; // green-500
    if (efficiency >= 60) return '#f59e0b'; // yellow-500
    return '#ef4444'; // red-500
  }, []);

  const getEdgeWidth = useCallback((edge: Edge) => {
    const utilization = edge.connection.currentLoad / edge.connection.capacity;
    return Math.max(2, Math.min(8, utilization * 10));
  }, []);

  const handleZoomIn = useCallback(() => {
    setViewBox(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.5, 10)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewBox(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 0.1)
    }));
  }, []);

  const handleReset = useCallback(() => {
    if (nodes.length > 0) {
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const scale = Math.min(800 / width, 600 / height) * 0.8;
      
      setViewBox({
        x: bounds.minX,
        y: bounds.minY,
        width: width,
        height: height,
        scale: scale
      });
    }
  }, [nodes, bounds]);

  const handleFitToScreen = useCallback(() => {
    if (nodes.length > 0 && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const scale = Math.min(rect.width / width, rect.height / height) * 0.9;
      
      setViewBox({
        x: bounds.minX,
        y: bounds.minY,
        width: width,
        height: height,
        scale: scale
      });
    }
  }, [nodes, bounds]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    const node = nodes.find(n => n.id === selectedNode);
    return node || null;
  }, [selectedNode, nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">No Network Data</h3>
          <p>Add train stations and connect them to view the network topology</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Visualization */}
      <div className="flex-1 relative bg-gray-900">
        {/* Controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex items-center space-x-1">
            <Tooltip content="Zoom in">
              <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Zoom out">
              <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Reset view">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Fit to screen">
              <Button variant="ghost" size="sm" onClick={handleFitToScreen}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as any)}
              className="bg-transparent text-white text-sm focus:outline-none"
            >
              <option value="health">Health Status</option>
              <option value="utilization">Utilization</option>
              <option value="efficiency">Efficiency</option>
            </select>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`text-sm px-2 py-1 rounded ${
                showLabels ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Labels
            </button>
          </div>
        </div>

        {/* Network Visualization */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / viewBox.scale} ${viewBox.height / viewBox.scale}`}
        >
          {/* Grid */}
          <defs>
            <pattern
              id="grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="#374151"
                strokeWidth="1"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width / viewBox.scale}
            height={viewBox.height / viewBox.scale}
            fill="url(#grid)"
          />

          {/* Edges */}
          {edges.map(edge => (
            <motion.line
              key={edge.id}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke={getEdgeColor(edge)}
              strokeWidth={getEdgeWidth(edge)}
              strokeOpacity={0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          ))}

          {/* Nodes */}
          {nodes.map(node => (
            <g key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={selectedNode === node.id ? 16 : hoveredNode === node.id ? 14 : 12}
                fill={getNodeColor(node)}
                stroke={selectedNode === node.id ? '#60a5fa' : '#374151'}
                strokeWidth={selectedNode === node.id ? 3 : 2}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                whileHover={{ scale: 1.1 }}
              />
              
              {showLabels && (
                <text
                  x={node.x}
                  y={node.y + 25}
                  textAnchor="middle"
                  className="fill-white text-xs font-medium pointer-events-none"
                >
                  {node.building.text || `Station ${node.id.slice(-4)}`}
                </text>
              )}
            </g>
          ))}

          {/* Connection Labels */}
          {showLabels && edges.map(edge => {
            const midX = (edge.source.x + edge.target.x) / 2;
            const midY = (edge.source.y + edge.target.y) / 2;
            const efficiency = Math.round(edge.connection.efficiency);
            
            return (
              <g key={`label-${edge.id}`}>
                <rect
                  x={midX - 15}
                  y={midY - 8}
                  width="30"
                  height="16"
                  fill="#374151"
                  rx="4"
                  opacity="0.8"
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  className="fill-white text-xs font-medium pointer-events-none"
                >
                  {efficiency}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Legend</h4>
          <div className="space-y-2 text-sm">
            <LegendItem color="#10b981" label="Healthy/Efficient" />
            <LegendItem color="#f59e0b" label="Warning/Moderate" />
            <LegendItem color="#ef4444" label="Critical/Poor" />
          </div>
        </div>
      </div>

      {/* Station Details Panel */}
      {selectedNodeData && (
        <motion.div
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          exit={{ x: 300 }}
          className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Station Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNode(null)}
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>

          <StationDetailsPanel node={selectedNodeData} network={network} />
        </motion.div>
      )}
    </div>
  );
};

// Legend Item Component
interface LegendItemProps {
  color: string;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label }) => (
  <div className="flex items-center space-x-2">
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: color }}
    />
    <span className="text-gray-300">{label}</span>
  </div>
);

// Station Details Panel Component
interface StationDetailsPanelProps {
  node: Node;
  network: StationNetwork;
}

const StationDetailsPanel: React.FC<StationDetailsPanelProps> = ({
  node,
  network
}) => {
  const connections = useMemo(() => {
    return Array.from(network.connections.values()).filter(
      conn => conn.from === node.id || conn.to === node.id
    );
  }, [network.connections, node.id]);

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div>
        <h4 className="text-white font-medium mb-2">Basic Information</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Name:</span>
            <span className="text-white">
              {node.building.text || `Station ${node.id.slice(-4)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Type:</span>
            <span className="text-white">{node.building.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Position:</span>
            <span className="text-white">
              {Math.round(node.x)}, {Math.round(node.y)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Floor:</span>
            <span className="text-white">{node.building.floor}</span>
          </div>
        </div>
      </div>

      {/* Throughput */}
      <div>
        <h4 className="text-white font-medium mb-2">Throughput</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Capacity:</span>
            <span className="text-white">{node.station.throughput.capacity}/min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current:</span>
            <span className="text-white">{node.station.throughput.current}/min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Utilization:</span>
            <span className={`font-medium ${
              node.station.throughput.utilization > 90 ? 'text-red-400' :
              node.station.throughput.utilization > 75 ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {node.station.throughput.utilization.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mt-2">
          <div className="flex h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                node.station.throughput.utilization > 90 ? 'bg-red-400' :
                node.station.throughput.utilization > 75 ? 'bg-yellow-400' : 'bg-green-400'
              }`}
              style={{ width: `${Math.min(100, node.station.throughput.utilization)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Connections */}
      <div>
        <h4 className="text-white font-medium mb-2">Connections ({connections.length})</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {connections.map(connection => {
            const targetId = connection.from === node.id ? connection.to : connection.from;
            const targetStation = network.stations.get(targetId);
            
            return (
              <div key={connection.id} className="bg-gray-700 rounded p-2 text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-medium">
                    To: {targetStation ? `Station ${targetId.slice(-4)}` : 'Unknown'}
                  </span>
                  <span className={`text-xs px-1 py-0.5 rounded ${
                    connection.efficiency >= 80 ? 'bg-green-600' :
                    connection.efficiency >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    {Math.round(connection.efficiency)}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Distance: {Math.round(connection.distance)}m</span>
                  <span>Time: {Math.round(connection.travelTime)}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Materials */}
      {node.station.materials.length > 0 && (
        <div>
          <h4 className="text-white font-medium mb-2">Materials</h4>
          <div className="flex flex-wrap gap-1">
            {node.station.materials.map(material => (
              <span
                key={material}
                className="bg-blue-600 text-white text-xs px-2 py-1 rounded"
              >
                {material}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};