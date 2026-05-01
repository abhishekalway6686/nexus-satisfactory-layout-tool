// Network Health Overview Component
// Displays comprehensive health metrics and status for a station network

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Users,
  Route,
  BarChart3,
  Clock,
  Gauge
} from 'lucide-react';
import { StationNetwork, NetworkBottleneck } from '../../types';
import { Tooltip } from './Tooltip';

interface NetworkHealthOverviewProps {
  network: StationNetwork;
  isAnalyzing: boolean;
}

export const NetworkHealthOverview: React.FC<NetworkHealthOverviewProps> = ({
  network,
  isAnalyzing
}) => {
  const healthMetrics = network.healthMetrics;

  const healthStatus = useMemo(() => {
    const score = healthMetrics.overallHealth;
    if (score >= 90) return { label: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-400' };
    if (score >= 75) return { label: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-400' };
    if (score >= 50) return { label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-400' };
    if (score >= 25) return { label: 'Poor', color: 'text-orange-400', bgColor: 'bg-orange-400' };
    return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-400' };
  }, [healthMetrics.overallHealth]);

  const criticalBottlenecks = useMemo(() => {
    return healthMetrics.bottlenecks.filter(b => b.severity >= 80);
  }, [healthMetrics.bottlenecks]);

  const utilizationStats = useMemo(() => {
    const dist = healthMetrics.utilizationDistribution;
    const total = dist.underutilized + dist.optimal + dist.stressed + dist.bottlenecked;
    
    if (total === 0) return null;
    
    return {
      underutilized: (dist.underutilized / total) * 100,
      optimal: (dist.optimal / total) * 100,
      stressed: (dist.stressed / total) * 100,
      bottlenecked: (dist.bottlenecked / total) * 100
    };
  }, [healthMetrics.utilizationDistribution]);

  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4"
          >
            <Activity className="w-12 h-12 text-blue-400" />
          </motion.div>
          <p className="text-white font-medium">Analyzing Network...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait while we evaluate your network</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overall Health Score */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Network Health</h3>
          <span className={`text-sm font-medium ${healthStatus.color}`}>
            {healthStatus.label}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-700"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthMetrics.overallHealth / 100)}`}
                className={healthStatus.color}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - healthMetrics.overallHealth / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {Math.round(healthMetrics.overallHealth)}%
              </span>
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <HealthMetric
              label="Stations"
              value={healthMetrics.totalStations}
              icon={Users}
              color="text-blue-400"
            />
            <HealthMetric
              label="Connections"
              value={healthMetrics.totalConnections}
              icon={Route}
              color="text-green-400"
            />
            <HealthMetric
              label="Routes"
              value={healthMetrics.totalRoutes}
              icon={Activity}
              color="text-purple-400"
            />
            <HealthMetric
              label="Avg Efficiency"
              value={`${Math.round(healthMetrics.averageEfficiency)}%`}
              icon={Zap}
              color="text-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Utilization Distribution */}
      {utilizationStats && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Capacity Utilization</h3>
          
          <div className="space-y-4">
            <div className="flex h-4 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="bg-blue-400"
                style={{ width: `${utilizationStats.underutilized}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationStats.underutilized}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.div
                className="bg-green-400"
                style={{ width: `${utilizationStats.optimal}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationStats.optimal}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
              />
              <motion.div
                className="bg-yellow-400"
                style={{ width: `${utilizationStats.stressed}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationStats.stressed}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
              <motion.div
                className="bg-red-400"
                style={{ width: `${utilizationStats.bottlenecked}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${utilizationStats.bottlenecked}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <UtilizationLegend
                color="bg-blue-400"
                label="Underutilized"
                percentage={utilizationStats.underutilized}
                description="0-25% capacity"
              />
              <UtilizationLegend
                color="bg-green-400"
                label="Optimal"
                percentage={utilizationStats.optimal}
                description="25-75% capacity"
              />
              <UtilizationLegend
                color="bg-yellow-400"
                label="Stressed"
                percentage={utilizationStats.stressed}
                description="75-90% capacity"
              />
              <UtilizationLegend
                color="bg-red-400"
                label="Bottlenecked"
                percentage={utilizationStats.bottlenecked}
                description="90%+ capacity"
              />
            </div>
          </div>
        </div>
      )}

      {/* Critical Issues */}
      {criticalBottlenecks.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Critical Issues</h3>
            <span className="bg-red-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
              {criticalBottlenecks.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {criticalBottlenecks.map(bottleneck => (
              <BottleneckAlert key={bottleneck.id} bottleneck={bottleneck} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Network Type"
          value={network.topology.replace('_', ' ')}
          icon={BarChart3}
          color="text-blue-400"
        />
        <QuickStat
          label="Last Analysis"
          value={formatLastAnalysis(healthMetrics.lastAnalysis)}
          icon={Clock}
          color="text-green-400"
        />
        <QuickStat
          label="Auto-Optimize"
          value={network.autoOptimize ? "Enabled" : "Disabled"}
          icon={Zap}
          color={network.autoOptimize ? "text-green-400" : "text-gray-400"}
        />
        <QuickStat
          label="Network Version"
          value={`v${network.version}`}
          icon={Gauge}
          color="text-purple-400"
        />
      </div>

      {/* Recent Performance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Trends</h3>
        <div className="text-center text-gray-400 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Historical data will be displayed here</p>
          <p className="text-sm mt-1">Performance tracking coming soon</p>
        </div>
      </div>
    </div>
  );
};

// Health Metric Component
interface HealthMetricProps {
  label: string;
  value: string | number;
  icon: React.FC<any>;
  color: string;
}

const HealthMetric: React.FC<HealthMetricProps> = ({
  label,
  value,
  icon: Icon,
  color
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    <span className="text-sm font-medium text-white">{value}</span>
  </div>
);

// Utilization Legend Component
interface UtilizationLegendProps {
  color: string;
  label: string;
  percentage: number;
  description: string;
}

const UtilizationLegend: React.FC<UtilizationLegendProps> = ({
  color,
  label,
  percentage,
  description
}) => (
  <div className="flex items-center space-x-2">
    <div className={`w-3 h-3 rounded-full ${color}`}></div>
    <div>
      <div className="text-white font-medium">
        {label} ({Math.round(percentage)}%)
      </div>
      <div className="text-xs text-gray-400">{description}</div>
    </div>
  </div>
);

// Bottleneck Alert Component
interface BottleneckAlertProps {
  bottleneck: NetworkBottleneck;
}

const BottleneckAlert: React.FC<BottleneckAlertProps> = ({ bottleneck }) => {
  const severityColor = bottleneck.severity >= 90 ? 'border-red-500' :
                       bottleneck.severity >= 70 ? 'border-orange-500' : 'border-yellow-500';

  return (
    <div className={`bg-gray-700 border-l-4 ${severityColor} p-4 rounded-r`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium capitalize">{bottleneck.type} Issue</span>
        <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
          {Math.round(bottleneck.severity)}% severity
        </span>
      </div>
      <p className="text-gray-300 text-sm mb-2">{bottleneck.description}</p>
      {bottleneck.suggestions.length > 0 && (
        <div className="text-xs text-blue-400">
          Suggestion: {bottleneck.suggestions[0].title}
        </div>
      )}
    </div>
  );
};

// Quick Stat Component
interface QuickStatProps {
  label: string;
  value: string;
  icon: React.FC<any>;
  color: string;
}

const QuickStat: React.FC<QuickStatProps> = ({
  label,
  value,
  icon: Icon,
  color
}) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <div className="flex items-center space-x-2 mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <div className="text-white font-semibold">{value}</div>
  </div>
);

// Helper function to format last analysis time
function formatLastAnalysis(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}