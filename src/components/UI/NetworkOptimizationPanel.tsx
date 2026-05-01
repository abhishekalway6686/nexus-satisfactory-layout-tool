// Network Optimization Panel Component
// Provides optimization suggestions and tools for improving network performance

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Route,
  Settings,
  RefreshCw,
  Play,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { StationNetwork, NetworkSuggestion } from '../../types';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

interface NetworkOptimizationPanelProps {
  network: StationNetwork;
  onApplySuggestion: (suggestionId: string) => void;
}

export const NetworkOptimizationPanel: React.FC<NetworkOptimizationPanelProps> = ({
  network,
  onApplySuggestion
}) => {
  const [suggestions, setSuggestions] = useState<NetworkSuggestion[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Load suggestions when component mounts or network changes
  useEffect(() => {
    loadOptimizationSuggestions();
  }, [network.id, network.version]);

  const loadOptimizationSuggestions = async () => {
    setIsOptimizing(true);
    try {
      // Simulate loading suggestions - in real implementation this would call the store
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock suggestions for demonstration
      const mockSuggestions: NetworkSuggestion[] = [
        {
          id: 'opt_1',
          type: 'add_route',
          title: 'Add parallel route between Station A and Station B',
          description: 'The connection between these stations is at 95% capacity. Adding a parallel route would reduce congestion and improve overall network performance.',
          estimatedImprovement: 35,
          cost: 70,
          priority: 'high',
          actionData: {
            routePoints: [
              { x: 100, y: 200, z: 0 },
              { x: 300, y: 400, z: 0 }
            ],
            targetStations: ['station_a', 'station_b']
          }
        },
        {
          id: 'opt_2',
          type: 'optimize_path',
          title: 'Optimize routing for efficiency',
          description: 'Several routes in your network are taking indirect paths. Optimizing these routes could improve travel times by up to 25%.',
          estimatedImprovement: 25,
          cost: 40,
          priority: 'medium'
        },
        {
          id: 'opt_3',
          type: 'rebalance_load',
          title: 'Distribute traffic more evenly',
          description: 'Some stations are handling disproportionate amounts of traffic. Rebalancing could improve overall network stability.',
          estimatedImprovement: 20,
          cost: 30,
          priority: 'medium'
        },
        {
          id: 'opt_4',
          type: 'add_station',
          title: 'Add intermediate station',
          description: 'Long-distance connections could benefit from intermediate stations to improve scheduling flexibility.',
          estimatedImprovement: 15,
          cost: 80,
          priority: 'low'
        }
      ];

      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Failed to load optimization suggestions:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplySuggestion = (suggestion: NetworkSuggestion) => {
    onApplySuggestion(suggestion.id);
    setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
  };

  const getPriorityColor = (priority: NetworkSuggestion['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-500';
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-500';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-500';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500';
    }
  };

  const getSuggestionIcon = (type: NetworkSuggestion['type']) => {
    switch (type) {
      case 'add_route': return Route;
      case 'optimize_path': return Zap;
      case 'rebalance_load': return TrendingUp;
      case 'add_station': return Settings;
      case 'upgrade_connection': return TrendingUp;
      default: return Info;
    }
  };

  const prioritizedSuggestions = suggestions
    .filter(s => !appliedSuggestions.has(s.id))
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }
      return b.estimatedImprovement - a.estimatedImprovement;
    });

  return (
    <div className="p-6 space-y-6">
      {/* Optimization Overview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Network Optimization</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadOptimizationSuggestions}
            disabled={isOptimizing}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <OptimizationMetric
            label="Total Suggestions"
            value={prioritizedSuggestions.length}
            icon={Info}
            color="text-blue-400"
          />
          <OptimizationMetric
            label="Potential Improvement"
            value={`${prioritizedSuggestions.reduce((sum, s) => sum + s.estimatedImprovement, 0)}%`}
            icon={TrendingUp}
            color="text-green-400"
          />
          <OptimizationMetric
            label="Applied"
            value={appliedSuggestions.size}
            icon={CheckCircle}
            color="text-purple-400"
          />
        </div>

        {/* Auto-optimization toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
          <div>
            <span className="text-white font-medium">Auto-Optimization</span>
            <p className="text-gray-400 text-sm">Automatically apply low-risk optimizations</p>
          </div>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              network.autoOptimize ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                network.autoOptimize ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Optimization Suggestions</h3>
          {prioritizedSuggestions.length > 0 && (
            <span className="text-sm text-gray-400">
              {prioritizedSuggestions.filter(s => s.priority === 'high' || s.priority === 'critical').length} high priority
            </span>
          )}
        </div>

        {isOptimizing ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 mx-auto mb-3"
              >
                <Settings className="w-8 h-8 text-blue-400" />
              </motion.div>
              <p className="text-white font-medium">Analyzing Network...</p>
              <p className="text-gray-400 text-sm mt-1">Finding optimization opportunities</p>
            </div>
          </div>
        ) : prioritizedSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <p className="text-white font-medium">Network Fully Optimized</p>
            <p className="text-gray-400 text-sm mt-1">No optimization suggestions at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prioritizedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isExpanded={expandedSuggestion === suggestion.id}
                onToggleExpanded={() => setExpandedSuggestion(
                  expandedSuggestion === suggestion.id ? null : suggestion.id
                )}
                onApply={() => handleApplySuggestion(suggestion)}
                priorityColor={getPriorityColor(suggestion.priority)}
                icon={getSuggestionIcon(suggestion.type)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Applied Suggestions History */}
      {appliedSuggestions.size > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Applied Optimizations</h3>
          <div className="space-y-2">
            {suggestions
              .filter(s => appliedSuggestions.has(s.id))
              .map((suggestion) => (
                <div key={suggestion.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-white font-medium">{suggestion.title}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      (+{suggestion.estimatedImprovement}% improvement)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Optimization Tips */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Optimization Tips</h3>
        <div className="space-y-3 text-sm">
          <OptimizationTip
            icon={Route}
            title="Parallel Routes"
            description="Add parallel routes to high-traffic connections to increase capacity and reduce bottlenecks."
          />
          <OptimizationTip
            icon={TrendingUp}
            title="Load Balancing"
            description="Distribute traffic evenly across multiple paths to prevent any single route from becoming overloaded."
          />
          <OptimizationTip
            icon={Zap}
            title="Direct Connections"
            description="Create direct connections between frequently connected stations to reduce travel time."
          />
          <OptimizationTip
            icon={Settings}
            title="Hub Stations"
            description="Use central hub stations to efficiently connect multiple branch lines and reduce overall network complexity."
          />
        </div>
      </div>
    </div>
  );
};

// Optimization Metric Component
interface OptimizationMetricProps {
  label: string;
  value: string | number;
  icon: React.FC<any>;
  color: string;
}

const OptimizationMetric: React.FC<OptimizationMetricProps> = ({
  label,
  value,
  icon: Icon,
  color
}) => (
  <div className="text-center">
    <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
    <div className="text-lg font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

// Suggestion Card Component
interface SuggestionCardProps {
  suggestion: NetworkSuggestion;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onApply: () => void;
  priorityColor: string;
  icon: React.FC<any>;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isExpanded,
  onToggleExpanded,
  onApply,
  priorityColor,
  icon: Icon
}) => (
  <motion.div
    layout
    className={`border rounded-lg p-4 ${priorityColor}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3 flex-1">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-white">{suggestion.title}</h4>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
              {suggestion.priority}
            </span>
          </div>
          <p className="text-gray-300 text-sm">{suggestion.description}</p>
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
            <span>+{suggestion.estimatedImprovement}% improvement</span>
            <span>Cost: {suggestion.cost}/100</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Tooltip content="Apply optimization">
          <Button
            variant="ghost"
            size="sm"
            onClick={onApply}
            className="text-green-400 hover:text-green-300"
          >
            <Play className="w-4 h-4" />
          </Button>
        </Tooltip>
        
        <button
          onClick={onToggleExpanded}
          className="text-gray-400 hover:text-white p-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>

    <AnimatePresence>
      {isExpanded && suggestion.actionData && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 pt-4 border-t border-gray-600"
        >
          <div className="text-sm text-gray-300 space-y-2">
            <h5 className="font-medium text-white">Implementation Details:</h5>
            
            {suggestion.actionData.targetStations && (
              <div>
                <span className="text-gray-400">Target Stations: </span>
                <span>{suggestion.actionData.targetStations.join(', ')}</span>
              </div>
            )}
            
            {suggestion.actionData.routePoints && (
              <div>
                <span className="text-gray-400">Suggested Route Points: </span>
                <span>{suggestion.actionData.routePoints.length} waypoints</span>
              </div>
            )}
            
            {suggestion.actionData.alternativePaths && (
              <div>
                <span className="text-gray-400">Alternative Paths: </span>
                <span>{suggestion.actionData.alternativePaths.length} options</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

// Optimization Tip Component
interface OptimizationTipProps {
  icon: React.FC<any>;
  title: string;
  description: string;
}

const OptimizationTip: React.FC<OptimizationTipProps> = ({
  icon: Icon,
  title,
  description
}) => (
  <div className="flex items-start space-x-3">
    <Icon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
    <div>
      <span className="text-white font-medium">{title}: </span>
      <span className="text-gray-300">{description}</span>
    </div>
  </div>
);