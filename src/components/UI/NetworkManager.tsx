// Network Manager UI Component
// Main interface for managing multi-building station networks

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Network, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Route, 
  Settings,
  X,
  Eye,
  EyeOff,
  Zap,
  BarChart3,
  GitBranch,
  RefreshCw
} from 'lucide-react';
import { 
  StationNetwork, 
  NetworkHealthMetrics, 
  NetworkSuggestion, 
  NetworkTopologyType 
} from '../../types';
import { useLayoutStore } from '../../store/layoutStore';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { NetworkHealthOverview } from './NetworkHealthOverview';
import { NetworkTopologyView } from './NetworkTopologyView';
import { NetworkAnalyticsPanel } from './NetworkAnalyticsPanel';
import { NetworkOptimizationPanel } from './NetworkOptimizationPanel';

const TOPOLOGY_ICONS: Record<NetworkTopologyType, React.FC<any>> = {
  'chain': Route,
  'branching': GitBranch,
  'hub_spoke': Network,
  'loop': RefreshCw,
  'mesh': Activity
};

const TOPOLOGY_COLORS: Record<NetworkTopologyType, string> = {
  'chain': 'text-blue-400',
  'branching': 'text-green-400',
  'hub_spoke': 'text-purple-400',
  'loop': 'text-yellow-400',
  'mesh': 'text-red-400'
};

interface NetworkManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkManager: React.FC<NetworkManagerProps> = ({
  isOpen,
  onClose
}) => {
  const {
    stationNetworks,
    networkManager,
    buildings,
    railways,
    railwaySegments,
    setSelectedNetwork,
    setNetworkManagerView,
    updateNetworkVisualization,
    analyzeNetworkHealth,
    optimizeNetwork,
    invalidateNetworkCache
  } = useLayoutStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'topology' | 'analytics' | 'optimization'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const activeNetwork = useMemo(() => {
    return networkManager.selectedNetwork ? stationNetworks[networkManager.selectedNetwork] : null;
  }, [stationNetworks, networkManager.selectedNetwork]);

  const networkList = useMemo(() => {
    return Object.values(stationNetworks).filter(network =>
      searchTerm === '' || 
      network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      network.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stationNetworks, searchTerm]);

  const handleNetworkSelect = useCallback((networkId: string) => {
    setSelectedNetwork(networkId);
  }, [setSelectedNetwork]);

  const handleRefreshAnalysis = useCallback(async () => {
    if (!activeNetwork) return;

    setIsAnalyzing(true);
    try {
      // Invalidate cache and re-analyze
      invalidateNetworkCache(activeNetwork.id);
      await analyzeNetworkHealth(activeNetwork.id);
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeNetwork, invalidateNetworkCache, analyzeNetworkHealth]);

  const handleTabChange = useCallback((tab: typeof selectedTab) => {
    setSelectedTab(tab);
    setNetworkManagerView(tab);
  }, [setNetworkManagerView]);

  const toggleVisualization = useCallback((key: keyof typeof networkManager.visualization) => {
    updateNetworkVisualization({
      [key]: !networkManager.visualization[key]
    });
  }, [networkManager.visualization, updateNetworkVisualization]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Network className="w-6 h-6 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Network Manager</h2>
              {activeNetwork && (
                <div className="flex items-center space-x-2 ml-4">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-gray-300">{activeNetwork.name}</span>
                  {(() => {
                    const TopologyIcon = TOPOLOGY_ICONS[activeNetwork.topology];
                    return (
                      <TopologyIcon className={`w-4 h-4 ${TOPOLOGY_COLORS[activeNetwork.topology]}`} />
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Tooltip content="Refresh analysis">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshAnalysis}
                  disabled={isAnalyzing || !activeNetwork}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                </Button>
              </Tooltip>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - Network List */}
            <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-700">
                <input
                  type="text"
                  placeholder="Search networks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Network List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {networkList.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No railway networks found</p>
                    <p className="text-sm mt-1">Connect train stations to create networks</p>
                  </div>
                ) : (
                  networkList.map(network => (
                    <NetworkListItem
                      key={network.id}
                      network={network}
                      isSelected={network.id === networkManager.selectedNetwork}
                      onClick={() => handleNetworkSelect(network.id)}
                    />
                  ))
                )}
              </div>

              {/* Visualization Controls */}
              <div className="p-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-white mb-3">Visualization</h3>
                <div className="space-y-2">
                  <VisualizationToggle
                    label="Flow Animation"
                    isEnabled={networkManager.visualization.showFlowAnimation}
                    onToggle={() => toggleVisualization('showFlowAnimation')}
                    icon={Activity}
                  />
                  <VisualizationToggle
                    label="Efficiency Colors"
                    isEnabled={networkManager.visualization.showEfficiencyColors}
                    onToggle={() => toggleVisualization('showEfficiencyColors')}
                    icon={BarChart3}
                  />
                  <VisualizationToggle
                    label="Show Bottlenecks"
                    isEnabled={networkManager.visualization.showBottlenecks}
                    onToggle={() => toggleVisualization('showBottlenecks')}
                    icon={AlertTriangle}
                  />
                  <VisualizationToggle
                    label="Optimal Paths"
                    isEnabled={networkManager.visualization.showOptimalPaths}
                    onToggle={() => toggleVisualization('showOptimalPaths')}
                    icon={Zap}
                  />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeNetwork ? (
                <>
                  {/* Tab Navigation */}
                  <div className="flex border-b border-gray-700">
                    <TabButton
                      isActive={selectedTab === 'overview'}
                      onClick={() => handleTabChange('overview')}
                      icon={Activity}
                      label="Overview"
                    />
                    <TabButton
                      isActive={selectedTab === 'topology'}
                      onClick={() => handleTabChange('topology')}
                      icon={Network}
                      label="Topology"
                    />
                    <TabButton
                      isActive={selectedTab === 'analytics'}
                      onClick={() => handleTabChange('analytics')}
                      icon={BarChart3}
                      label="Analytics"
                    />
                    <TabButton
                      isActive={selectedTab === 'optimization'}
                      onClick={() => handleTabChange('optimization')}
                      icon={TrendingUp}
                      label="Optimization"
                    />
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto">
                    {selectedTab === 'overview' && (
                      <NetworkHealthOverview 
                        network={activeNetwork}
                        isAnalyzing={isAnalyzing}
                      />
                    )}
                    {selectedTab === 'topology' && (
                      <NetworkTopologyView 
                        network={activeNetwork}
                        buildings={buildings}
                      />
                    )}
                    {selectedTab === 'analytics' && (
                      <NetworkAnalyticsPanel 
                        network={activeNetwork}
                      />
                    )}
                    {selectedTab === 'optimization' && (
                      <NetworkOptimizationPanel 
                        network={activeNetwork}
                        onApplySuggestion={(suggestionId) => {
                          // Handle suggestion application
                        }}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-white mb-2">No Network Selected</h3>
                    <p>Select a network from the sidebar to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Network List Item Component
interface NetworkListItemProps {
  network: StationNetwork;
  isSelected: boolean;
  onClick: () => void;
}

const NetworkListItem: React.FC<NetworkListItemProps> = ({ 
  network, 
  isSelected, 
  onClick 
}) => {
  const TopologyIcon = TOPOLOGY_ICONS[network.topology];
  const healthColor = network.healthMetrics.overallHealth >= 80 ? 'text-green-400' : 
                     network.healthMetrics.overallHealth >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isSelected 
          ? 'bg-blue-600 border-blue-500' 
          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white truncate">{network.name}</span>
        <TopologyIcon className={`w-4 h-4 ${TOPOLOGY_COLORS[network.topology]}`} />
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-300">
        <span>{network.stations.size} stations</span>
        <span className={`font-medium ${healthColor}`}>
          {network.healthMetrics.overallHealth.toFixed(0)}%
        </span>
      </div>

      {network.healthMetrics.bottlenecks.length > 0 && (
        <div className="flex items-center space-x-1 mt-2">
          <AlertTriangle className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-yellow-400">
            {network.healthMetrics.bottlenecks.length} issues
          </span>
        </div>
      )}
    </button>
  );
};

// Tab Button Component
interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.FC<any>;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ 
  isActive, 
  onClick, 
  icon: Icon, 
  label 
}) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
      isActive 
        ? 'border-blue-500 text-blue-400 bg-gray-800' 
        : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="font-medium">{label}</span>
  </button>
);

// Visualization Toggle Component
interface VisualizationToggleProps {
  label: string;
  isEnabled: boolean;
  onToggle: () => void;
  icon: React.FC<any>;
}

const VisualizationToggle: React.FC<VisualizationToggleProps> = ({
  label,
  isEnabled,
  onToggle,
  icon: Icon
}) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-between w-full p-2 rounded hover:bg-gray-700 transition-colors"
  >
    <div className="flex items-center space-x-2">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    {isEnabled ? (
      <Eye className="w-4 h-4 text-blue-400" />
    ) : (
      <EyeOff className="w-4 h-4 text-gray-500" />
    )}
  </button>
);