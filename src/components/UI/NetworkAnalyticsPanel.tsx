// Network Analytics Panel Component
// Advanced analytics and performance metrics for station networks

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Route,
  Zap,
  Activity,
  Target,
  AlertCircle
} from 'lucide-react';
import { StationNetwork } from '../../types';

interface NetworkAnalyticsPanelProps {
  network: StationNetwork;
}

export const NetworkAnalyticsPanel: React.FC<NetworkAnalyticsPanelProps> = ({
  network
}) => {
  const analytics = useMemo(() => {
    const stations = Array.from(network.stations.values());
    const connections = Array.from(network.connections.values());
    const routes = Array.from(network.routes.values());

    // Calculate network metrics
    const avgDistance = connections.length > 0 
      ? connections.reduce((sum, conn) => sum + conn.distance, 0) / connections.length
      : 0;

    const avgTravelTime = connections.length > 0
      ? connections.reduce((sum, conn) => sum + conn.travelTime, 0) / connections.length
      : 0;

    const totalCapacity = connections.reduce((sum, conn) => sum + conn.capacity, 0);
    const totalLoad = connections.reduce((sum, conn) => sum + conn.currentLoad, 0);
    const utilizationRate = totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0;

    // Station distribution
    const stationsByFloor = new Map<number, number>();
    stations.forEach(station => {
      const floor = station.floor;
      stationsByFloor.set(floor, (stationsByFloor.get(floor) || 0) + 1);
    });

    // Efficiency distribution
    const efficiencyRanges = {
      excellent: connections.filter(c => c.efficiency >= 90).length,
      good: connections.filter(c => c.efficiency >= 70 && c.efficiency < 90).length,
      fair: connections.filter(c => c.efficiency >= 50 && c.efficiency < 70).length,
      poor: connections.filter(c => c.efficiency < 50).length
    };

    return {
      avgDistance,
      avgTravelTime,
      totalCapacity,
      totalLoad,
      utilizationRate,
      stationsByFloor,
      efficiencyRanges,
      networkDensity: stations.length > 0 ? (connections.length * 2) / stations.length : 0
    };
  }, [network]);

  return (
    <div className="p-6 space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Network Utilization"
          value={`${analytics.utilizationRate.toFixed(1)}%`}
          icon={Activity}
          color="text-blue-400"
          trend={analytics.utilizationRate > 75 ? 'up' : analytics.utilizationRate > 50 ? 'stable' : 'down'}
        />
        <KPICard
          label="Avg Distance"
          value={`${Math.round(analytics.avgDistance)}m`}
          icon={Route}
          color="text-green-400"
          trend="stable"
        />
        <KPICard
          label="Avg Travel Time"
          value={`${Math.round(analytics.avgTravelTime)}s`}
          icon={Clock}
          color="text-yellow-400"
          trend="stable"
        />
        <KPICard
          label="Network Density"
          value={analytics.networkDensity.toFixed(1)}
          icon={Target}
          color="text-purple-400"
          trend={analytics.networkDensity > 2 ? 'up' : 'stable'}
        />
      </div>

      {/* Network Efficiency Analysis */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connection Efficiency Distribution</h3>
        <div className="space-y-4">
          <EfficiencyBar
            label="Excellent (90%+)"
            count={analytics.efficiencyRanges.excellent}
            total={network.connections.size}
            color="bg-green-500"
          />
          <EfficiencyBar
            label="Good (70-89%)"
            count={analytics.efficiencyRanges.good}
            total={network.connections.size}
            color="bg-blue-500"
          />
          <EfficiencyBar
            label="Fair (50-69%)"
            count={analytics.efficiencyRanges.fair}
            total={network.connections.size}
            color="bg-yellow-500"
          />
          <EfficiencyBar
            label="Poor (<50%)"
            count={analytics.efficiencyRanges.poor}
            total={network.connections.size}
            color="bg-red-500"
          />
        </div>
      </div>

      {/* Floor Distribution */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Station Distribution by Floor</h3>
        <div className="space-y-2">
          {Array.from(analytics.stationsByFloor.entries())
            .sort(([a], [b]) => a - b)
            .map(([floor, count]) => (
              <div key={floor} className="flex items-center justify-between">
                <span className="text-gray-300">Floor {floor}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(count / Math.max(...analytics.stationsByFloor.values())) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-white font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Capacity Analysis */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Capacity Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Total Capacity</div>
            <div className="text-lg font-bold text-white">{analytics.totalCapacity}</div>
            <div className="text-gray-400 text-xs">trains/hour</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Current Load</div>
            <div className="text-lg font-bold text-white">{analytics.totalLoad}</div>
            <div className="text-gray-400 text-xs">trains/hour</div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Utilization</span>
            <span className="text-white">{analytics.utilizationRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <motion.div
              className={`h-3 rounded-full transition-all duration-500 ${
                analytics.utilizationRate > 90 ? 'bg-red-500' :
                analytics.utilizationRate > 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, analytics.utilizationRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Trends</h3>
        <div className="text-center text-gray-400 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Historical performance data will be displayed here</p>
          <p className="text-sm mt-1">Trend analysis coming soon</p>
        </div>
      </div>

      {/* Network Recommendations */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
        <div className="space-y-3">
          {analytics.utilizationRate > 85 && (
            <RecommendationItem
              icon={AlertCircle}
              severity="high"
              title="High Network Utilization"
              description="Consider adding parallel routes or increasing station capacity to prevent bottlenecks."
            />
          )}
          
          {analytics.efficiencyRanges.poor > 0 && (
            <RecommendationItem
              icon={Route}
              severity="medium"
              title="Inefficient Connections"
              description={`${analytics.efficiencyRanges.poor} connections have poor efficiency. Consider optimizing routes.`}
            />
          )}
          
          {analytics.networkDensity < 1.5 && network.stations.size > 3 && (
            <RecommendationItem
              icon={Target}
              severity="low"
              title="Low Network Density"
              description="Network could benefit from additional connections to improve redundancy and efficiency."
            />
          )}

          {analytics.avgTravelTime > 120 && (
            <RecommendationItem
              icon={Clock}
              severity="medium"
              title="Long Travel Times"
              description="Average travel time is high. Consider adding shortcuts or optimizing station placement."
            />
          )}
        </div>
      </div>
    </div>
  );
};

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string;
  icon: React.FC<any>;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  trend
}) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <Icon className={`w-5 h-5 ${color}`} />
      {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
      {trend === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
      {trend === 'stable' && <Activity className="w-4 h-4 text-gray-400" />}
    </div>
    <div className="text-lg font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </div>
);

// Efficiency Bar Component
interface EfficiencyBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

const EfficiencyBar: React.FC<EfficiencyBarProps> = ({
  label,
  count,
  total,
  color
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300 text-sm min-w-0 flex-1">{label}</span>
      <div className="flex items-center space-x-3">
        <div className="w-24 bg-gray-700 rounded-full h-2">
          <motion.div
            className={`h-2 rounded-full ${color}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className="text-white font-medium w-8 text-right">{count}</span>
      </div>
    </div>
  );
};

// Recommendation Item Component
interface RecommendationItemProps {
  icon: React.FC<any>;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({
  icon: Icon,
  severity,
  title,
  description
}) => {
  const severityColors = {
    low: 'text-blue-400 border-blue-500',
    medium: 'text-yellow-400 border-yellow-500',
    high: 'text-red-400 border-red-500'
  };

  return (
    <div className={`border-l-4 ${severityColors[severity]} bg-gray-700 p-4 rounded-r`}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 mt-0.5 ${severityColors[severity].split(' ')[0]}`} />
        <div>
          <h4 className="text-white font-medium mb-1">{title}</h4>
          <p className="text-gray-300 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
};