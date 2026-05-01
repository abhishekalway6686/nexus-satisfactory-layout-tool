// src/components/UI/ProductionPanel.tsx
// Production Overview Panel - shows power, inputs, outputs, and issues with building-by-building breakdown

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  Zap,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Activity,
  Factory,
  ArrowRight,
  Clock,
  Gauge,
  Droplets,
  Train,
  Archive,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer,
  AlertOctagon,
  GripVertical
} from 'lucide-react';
import { useLayoutStore } from '../../store/layoutStore';
import {
  useProductionCalculation,
  useFactoryHealth,
  useProductionStats
} from '../../hooks/useProductionCalculation';
import { ITEMS } from '../../data/items';
import { BUILDING_TYPES } from '../../constants';
import { BottleneckResult, BottleneckSeverity } from '../../logic/production/bottleneckDetection';
import { FlowNode } from '../../logic/production/flowCalculation';
import { animations } from './animations';
import { Building } from '../../types';
import { isExtractionBuilding } from '../../data/recipesByBuilding';

interface ProductionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

// Position state for draggable panel
interface PanelPosition {
  x: number;
  y: number;
}

// ============================================
// SUBCOMPONENTS
// ============================================

// Collapsible section component - ultra-compact version
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  badgeColor?: string;
}> = ({ title, icon, count, defaultExpanded = true, children, badgeColor }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-700/50 rounded-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-2 py-1 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-orange-400 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
          <span className="font-medium text-slate-200 text-xs">{title}</span>
          {count !== undefined && count > 0 && (
            <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${badgeColor || 'bg-slate-600 text-slate-300'}`}>
              {count}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={12} className="text-slate-400" />
        ) : (
          <ChevronDown size={12} className="text-slate-400" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-2 bg-slate-900/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Power progress bar component - ultra-compact version
const PowerProgressBar: React.FC<{
  consumption: number;
  generation: number;
}> = ({ consumption, generation }) => {
  const percentage = generation > 0 ? Math.min((consumption / generation) * 100, 150) : 0;
  const isOverloaded = consumption > generation;

  const barColor = isOverloaded
    ? 'bg-red-500'
    : percentage > 80
    ? 'bg-yellow-500'
    : 'bg-green-500';

  const glowColor = isOverloaded
    ? 'shadow-red-500/30'
    : percentage > 80
    ? 'shadow-yellow-500/30'
    : 'shadow-green-500/30';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">
          {consumption.toFixed(1)} MW / {generation.toFixed(1)} MW
        </span>
        <span className={`font-medium ${isOverloaded ? 'text-red-400' : 'text-green-400'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${barColor} rounded-full shadow-lg ${glowColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {isOverloaded && (
        <div className="flex items-center gap-1 text-[9px] text-red-400">
          <AlertTriangle size={9} />
          <span>Power deficit: {(consumption - generation).toFixed(1)} MW</span>
        </div>
      )}
    </div>
  );
};

// Item rate display with icon - Compact
const ItemRate: React.FC<{
  itemId: string;
  rate: number;
  type: 'input' | 'output';
  compact?: boolean;
}> = ({ itemId, rate, type, compact = false }) => {
  const item = ITEMS[itemId];
  const displayName = item?.name || itemId;

  const bgColor = type === 'input'
    ? 'bg-blue-500/10 border-blue-500/30'
    : 'bg-green-500/10 border-green-500/30';
  const textColor = type === 'input' ? 'text-blue-400' : 'text-green-400';

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${bgColor}`}>
        <span className="text-[9px] text-slate-300 truncate max-w-[60px]">{displayName}</span>
        <span className={`text-[9px] font-mono ${textColor}`}>{rate.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-1.5 rounded border ${bgColor}`}>
      <div className="flex items-center gap-1.5">
        <Package size={12} className={textColor} />
        <span className="text-xs text-slate-300">{displayName}</span>
      </div>
      <span className={`text-xs font-mono font-medium ${textColor}`}>{rate.toFixed(1)}/min</span>
    </div>
  );
};

// Production status badge - Compact
const ProductionStatusBadge: React.FC<{
  status: 'running' | 'underutilized' | 'starved' | 'idle' | 'blocked';
  efficiency: number;
}> = ({ status, efficiency }) => {
  const config = {
    running: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Run' },
    underutilized: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Low' },
    starved: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Starv' },
    idle: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Idle' },
    blocked: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: 'Block' },
  }[status];

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${config.bg} ${config.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-')}`} />
      <span className={`text-[9px] font-medium ${config.text}`}>{config.label}</span>
      <span className={`text-[9px] font-mono ${config.text}`}>{efficiency.toFixed(0)}%</span>
    </div>
  );
};

// Get production status from efficiency
const getStatus = (efficiency: number, hasRecipe: boolean): 'running' | 'underutilized' | 'starved' | 'idle' | 'blocked' => {
  if (!hasRecipe) return 'idle';
  if (efficiency >= 95) return 'running';
  if (efficiency >= 50) return 'underutilized';
  return 'starved';
};

// Building production card
const BuildingProductionCard: React.FC<{
  building: Building;
  node: FlowNode | undefined;
  bottlenecks: BottleneckResult[];
  onClick: () => void;
}> = ({ building, node, bottlenecks, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const buildingDef = BUILDING_TYPES[building.type];
  const buildingName = buildingDef?.name || building.type;

  // For extraction buildings (miners/extractors), check extractedResourceId instead of recipe
  const isExtractor = isExtractionBuilding(building.type);
  const hasRecipe = isExtractor ? !!building.extractedResourceId : !!building.selectedRecipeId;
  const efficiency = node?.efficiency ?? 0;
  const status = getStatus(efficiency, hasRecipe);

  const inputs = node?.actualInput ? Object.entries(node.actualInput).filter(([, v]) => v > 0) : [];
  const outputs = node?.actualOutput ? Object.entries(node.actualOutput).filter(([, v]) => v > 0) : [];
  const hasIssues = bottlenecks.length > 0;

  // Get border color based on status
  const borderColor = hasIssues
    ? 'border-red-500/40'
    : status === 'running'
    ? 'border-green-500/30'
    : status === 'underutilized'
    ? 'border-yellow-500/30'
    : 'border-slate-700/50';

  return (
    <div className={`border rounded overflow-hidden bg-slate-800/30 ${borderColor}`}>
      {/* Header - Compact */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: buildingDef?.color || '#6b7280' }}
          />
          <span className="text-[11px] font-medium text-slate-200 truncate">{buildingName}</span>
          {hasIssues && (
            <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <ProductionStatusBadge status={status} efficiency={efficiency} />
          {isExpanded ? (
            <ChevronUp size={12} className="text-slate-400" />
          ) : (
            <ChevronDown size={12} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded content - Compact */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5">
              {/* Clock speed indicator */}
              {building.clockSpeed && building.clockSpeed !== 100 && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <Clock size={10} className="text-purple-400" />
                  <span className="text-slate-400">Clock:</span>
                  <span className="text-purple-400 font-mono">{building.clockSpeed}%</span>
                </div>
              )}

              {/* Inputs and Outputs flow */}
              {(inputs.length > 0 || outputs.length > 0) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Inputs */}
                  {inputs.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <ArrowDownToLine size={11} className="text-blue-400" />
                      {inputs.map(([itemId, rate]) => (
                        <ItemRate key={itemId} itemId={itemId} rate={rate} type="input" compact />
                      ))}
                    </div>
                  )}

                  {/* Arrow separator */}
                  {inputs.length > 0 && outputs.length > 0 && (
                    <ArrowRight size={12} className="text-slate-500" />
                  )}

                  {/* Outputs */}
                  {outputs.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <ArrowUpFromLine size={11} className="text-green-400" />
                      {outputs.map(([itemId, rate]) => (
                        <ItemRate key={itemId} itemId={itemId} rate={rate} type="output" compact />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* No recipe warning */}
              {!hasRecipe && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Info size={10} />
                  <span>No recipe selected</span>
                </div>
              )}

              {/* Issues */}
              {bottlenecks.length > 0 && (
                <div className="space-y-0.5">
                  {bottlenecks.slice(0, 2).map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-[10px] p-1.5 rounded bg-red-500/10 border border-red-500/20"
                    >
                      <AlertCircle size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-red-300 line-clamp-1">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Click to select */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="w-full text-[10px] text-center py-1 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded transition-colors"
              >
                Select Building
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Item rate row component (for aggregate view) - Compact
const ItemRateRow: React.FC<{
  itemId: string;
  rate: number;
  sourceCount?: number;
  onClick?: () => void;
}> = ({ itemId, rate, sourceCount, onClick }) => {
  const item = ITEMS[itemId];
  const displayName = item?.name || itemId;

  return (
    <div
      className={`flex items-center justify-between py-1 px-2 rounded ${
        onClick ? 'hover:bg-slate-700/50 cursor-pointer' : ''
      } transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center">
          <Package size={12} className="text-slate-400" />
        </div>
        <span className="text-xs text-slate-300 truncate max-w-[120px]">{displayName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-orange-300">{rate.toFixed(1)}/min</span>
        {sourceCount !== undefined && sourceCount > 0 && (
          <span className="text-[10px] text-slate-500">x{sourceCount}</span>
        )}
      </div>
    </div>
  );
};

// Issue row component - Compact
const IssueRow: React.FC<{
  issue: BottleneckResult;
  onClick: () => void;
}> = ({ issue, onClick }) => {
  const getSeverityConfig = (severity: BottleneckSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertCircle size={12} />,
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-400',
          dotColor: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={12} />,
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-400',
          dotColor: 'bg-yellow-500'
        };
      case 'info':
      default:
        return {
          icon: <Info size={12} />,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          textColor: 'text-blue-400',
          dotColor: 'bg-blue-500'
        };
    }
  };

  const config = getSeverityConfig(issue.severity);

  return (
    <motion.button
      whileHover={{ scale: 1.005, x: 1 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className={`w-full p-2 rounded border ${config.bgColor} ${config.borderColor} text-left transition-all`}
    >
      <div className="flex items-start gap-2">
        <div className={`${config.textColor} mt-0.5`}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
            <span className="text-[11px] font-medium text-slate-200 truncate">
              {issue.message}
            </span>
          </div>
          {issue.suggestion && (
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{issue.suggestion}</p>
          )}
          {issue.achievedPercentage < 100 && issue.achievedPercentage > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.dotColor} rounded-full`}
                  style={{ width: `${issue.achievedPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500">{issue.achievedPercentage.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
};

// Health score indicator - Compact
const HealthScoreIndicator: React.FC<{ score: number; isCalculating: boolean }> = ({
  score,
  isCalculating
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${getScoreBgColor(score)}/20 border-2 ${getScoreBgColor(score).replace('bg-', 'border-')}/50`}>
        <Gauge size={18} className={getScoreColor(score)} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-slate-400">Factory Health</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">{getScoreLabel(score)}</span>
            <span className={`text-base font-bold ${getScoreColor(score)}`}>
              {isCalculating ? '...' : `${score.toFixed(0)}%`}
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${getScoreBgColor(score)}`}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
};

// Fluid rate row component (for fluid summary) - Compact
const FluidRateRow: React.FC<{
  fluidId: string;
  production: number;
  consumption: number;
}> = ({ fluidId, production, consumption }) => {
  const item = ITEMS[fluidId];
  const displayName = item?.name || fluidId;
  const netFlow = production - consumption;

  const getNetFlowConfig = (net: number) => {
    if (net > 0.1) return { icon: <TrendingUp size={12} />, color: 'text-green-400', label: 'Surplus' };
    if (net < -0.1) return { icon: <TrendingDown size={12} />, color: 'text-red-400', label: 'Deficit' };
    return { icon: <Minus size={12} />, color: 'text-slate-400', label: 'Balanced' };
  };

  const netConfig = getNetFlowConfig(netFlow);

  return (
    <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-blue-500/20 rounded flex items-center justify-center">
            <Droplets size={12} className="text-blue-400" />
          </div>
          <span className="text-xs font-medium text-slate-200">{displayName}</span>
        </div>
        <div className={`flex items-center gap-1 ${netConfig.color}`}>
          {netConfig.icon}
          <span className="text-[10px] font-medium">{netConfig.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="p-1.5 bg-slate-800/50 rounded text-center">
          <div className="text-slate-500">Prod</div>
          <div className="text-green-400 font-mono">{production.toFixed(1)}</div>
        </div>
        <div className="p-1.5 bg-slate-800/50 rounded text-center">
          <div className="text-slate-500">Cons</div>
          <div className="text-blue-400 font-mono">{consumption.toFixed(1)}</div>
        </div>
        <div className="p-1.5 bg-slate-800/50 rounded text-center">
          <div className="text-slate-500">Net</div>
          <div className={`font-mono ${netConfig.color}`}>
            {netFlow >= 0 ? '+' : ''}{netFlow.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Station source row component - Compact
const StationSourceRow: React.FC<{
  stationId: string;
  resourceId: string;
  isFluid: boolean;
  rate: number;
  onClick?: () => void;
}> = ({ resourceId, isFluid, rate, onClick }) => {
  const item = ITEMS[resourceId];
  const displayName = item?.name || resourceId;
  const unit = isFluid ? 'm³/m' : '/min';

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.005, x: 1 } : undefined}
      className={`flex items-center justify-between p-2 rounded bg-cyan-500/5 border border-cyan-500/20 ${
        onClick ? 'cursor-pointer hover:bg-cyan-500/10' : ''
      } transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-cyan-500/20 rounded flex items-center justify-center">
          <Train size={12} className="text-cyan-400" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-200">{displayName}</div>
          <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
            {isFluid ? (
              <Droplets size={8} className="text-blue-400" />
            ) : (
              <Package size={8} className="text-orange-400" />
            )}
            <span>{isFluid ? 'Fluid' : 'Solid'}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-cyan-400 font-mono text-[11px]">{rate.toFixed(1)} {unit}</div>
      </div>
    </motion.div>
  );
};

// Storage accumulation row component - Compact
const StorageAccumulationRow: React.FC<{
  buildingId: string;
  resourceId: string;
  isFluid: boolean;
  rate: number;
  fillTime: number | null;
  onClick?: () => void;
}> = ({ resourceId, isFluid, rate, fillTime, onClick }) => {
  const item = ITEMS[resourceId];
  const displayName = item?.name || resourceId;
  const unit = isFluid ? 'm³/m' : '/min';

  // Determine fill speed warning level
  const getFillTimeConfig = (hours: number | null) => {
    if (hours === null) return { color: 'text-slate-400', bgColor: 'bg-slate-500/20', label: '?' };
    if (hours < 1) return { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Fast!' };
    if (hours < 4) return { color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Fast' };
    if (hours < 24) return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Med' };
    return { color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Slow' };
  };

  const fillConfig = getFillTimeConfig(fillTime);

  const formatFillTime = (hours: number | null): string => {
    if (hours === null) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.005, x: 1 } : undefined}
      className={`p-2 rounded bg-amber-500/5 border border-amber-500/20 ${
        onClick ? 'cursor-pointer hover:bg-amber-500/10' : ''
      } transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-500/20 rounded flex items-center justify-center">
            <Archive size={12} className="text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-200">{displayName}</div>
            <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
              {isFluid ? (
                <Droplets size={8} className="text-blue-400" />
              ) : (
                <Package size={8} className="text-orange-400" />
              )}
              <span>{isFluid ? 'Buffer' : 'Storage'}</span>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${fillConfig.bgColor} ${fillConfig.color}`}>
          {fillTime !== null && fillTime < 4 && <AlertOctagon size={9} />}
          <span>{fillConfig.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="p-1.5 bg-slate-800/50 rounded text-center">
          <div className="text-slate-500">Rate</div>
          <div className="text-amber-400 font-mono">+{rate.toFixed(1)} {unit}</div>
        </div>
        <div className="p-1.5 bg-slate-800/50 rounded text-center">
          <div className="text-slate-500">Fill Time</div>
          <div className={`font-mono ${fillConfig.color}`}>{formatFillTime(fillTime)}</div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ProductionPanel: React.FC<ProductionPanelProps> = ({
  isOpen,
  onClose,
  isPinned = false,
  onPinToggle
}) => {
  const [viewMode, setViewMode] = useState<'buildings' | 'aggregate'>('buildings');

  // Draggable position state
  const [position, setPosition] = useState<PanelPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Get production calculation data
  const {
    flowState,
    bottleneckSummary,
    bottlenecks,
    isCalculating,
    recalculate,
    getMostImpactful
  } = useProductionCalculation();

  const factoryHealth = useFactoryHealth();
  const productionStats = useProductionStats();

  // Store access for navigation
  const {
    buildings,
    setSelectedBuilding,
    setSelectedConveyorSegment,
    setSelectedPipeSegment
  } = useLayoutStore();

  // Calculate power totals from buildings
  const powerSummary = useMemo(() => {
    let totalConsumption = 0;
    let totalGeneration = 0;
    let consumerCount = 0;
    let generatorCount = 0;

    Object.values(buildings).forEach((building) => {
      const buildingDef = BUILDING_TYPES[building.type];
      if (buildingDef?.powerData) {
        const clockSpeed = building.clockSpeed ?? 100;
        const clockMultiplier = Math.pow(clockSpeed / 100, 1.6); // Satisfactory power scaling

        if (buildingDef.powerData.powerConsumption) {
          totalConsumption += buildingDef.powerData.powerConsumption * clockMultiplier;
          consumerCount++;
        }
        if (buildingDef.powerData.powerGeneration) {
          totalGeneration += buildingDef.powerData.powerGeneration;
          generatorCount++;
        }
      }
    });

    return {
      consumption: totalConsumption,
      generation: totalGeneration,
      consumerCount,
      generatorCount,
      netPower: totalGeneration - totalConsumption
    };
  }, [buildings]);

  // Get production buildings with their flow data
  const productionBuildings = useMemo(() => {
    return Object.values(buildings)
      .filter(building => {
        const buildingDef = BUILDING_TYPES[building.type];
        return buildingDef && (
          buildingDef.category === 'production' ||
          buildingDef.category === 'smelting' ||
          buildingDef.category === 'extraction' ||
          building.type.includes('assembler') ||
          building.type.includes('constructor') ||
          building.type.includes('smelter') ||
          building.type.includes('foundry') ||
          building.type.includes('manufacturer') ||
          building.type.includes('refinery') ||
          building.type.includes('packager') ||
          building.type.includes('blender') ||
          building.type.includes('miner')
        );
      })
      .map(building => ({
        building,
        node: flowState.nodes[building.id],
        bottlenecks: bottlenecks.filter(b => b.id === building.id)
      }))
      .sort((a, b) => {
        // Sort by issues first, then by efficiency
        const aHasIssues = a.bottlenecks.length > 0;
        const bHasIssues = b.bottlenecks.length > 0;
        if (aHasIssues !== bHasIssues) return aHasIssues ? -1 : 1;
        return (a.node?.efficiency ?? 0) - (b.node?.efficiency ?? 0);
      });
  }, [buildings, flowState, bottlenecks]);

  // Aggregate inputs and outputs
  const { inputs, outputs } = useMemo(() => {
    const inputMap: Record<string, { rate: number; count: number }> = {};
    const outputMap: Record<string, { rate: number; count: number }> = {};

    // Aggregate from flow state
    Object.values(flowState.nodes).forEach((node) => {
      // Track actual inputs (what's being consumed)
      Object.entries(node.actualInput).forEach(([itemId, rate]) => {
        if (rate > 0) {
          if (!inputMap[itemId]) {
            inputMap[itemId] = { rate: 0, count: 0 };
          }
          inputMap[itemId].rate += rate;
          inputMap[itemId].count++;
        }
      });

      // Track actual outputs (what's being produced)
      Object.entries(node.actualOutput).forEach(([itemId, rate]) => {
        if (rate > 0) {
          if (!outputMap[itemId]) {
            outputMap[itemId] = { rate: 0, count: 0 };
          }
          outputMap[itemId].rate += rate;
          outputMap[itemId].count++;
        }
      });
    });

    // Convert to sorted arrays
    const sortedInputs = Object.entries(inputMap)
      .map(([itemId, data]) => ({ itemId, ...data }))
      .sort((a, b) => b.rate - a.rate);

    const sortedOutputs = Object.entries(outputMap)
      .map(([itemId, data]) => ({ itemId, ...data }))
      .sort((a, b) => b.rate - a.rate);

    return { inputs: sortedInputs, outputs: sortedOutputs };
  }, [flowState]);

  // Get most impactful issues
  const topIssues = useMemo(() => getMostImpactful(10), [getMostImpactful]);

  // Calculate fluid summary from flowState
  const fluidSummary = useMemo(() => {
    const fluidIds = new Set([
      ...Object.keys(flowState.totalFluidProduction),
      ...Object.keys(flowState.totalFluidConsumption)
    ]);

    return Array.from(fluidIds).map(fluidId => ({
      fluidId,
      production: flowState.totalFluidProduction[fluidId] || 0,
      consumption: flowState.totalFluidConsumption[fluidId] || 0
    })).filter(f => f.production > 0 || f.consumption > 0)
      .sort((a, b) => (b.production + b.consumption) - (a.production + a.consumption));
  }, [flowState.totalFluidProduction, flowState.totalFluidConsumption]);

  // Get station sources from flowState
  const stationSources = useMemo(() => {
    const sources = Object.values(flowState.stationSources);
    // Separate into solids and fluids
    const solids = sources.filter(s => !s.isFluid);
    const fluids = sources.filter(s => s.isFluid);
    return { solids, fluids, total: sources.length };
  }, [flowState.stationSources]);

  // Get storage accumulation from flowState
  const storageAccumulation = useMemo(() => {
    return Object.values(flowState.storageAccumulation)
      .sort((a, b) => {
        // Sort by fill time (fastest first for urgency)
        if (a.fillTime === null) return 1;
        if (b.fillTime === null) return -1;
        return a.fillTime - b.fillTime;
      });
  }, [flowState.storageAccumulation]);

  // Handle clicking on an issue to navigate to it
  const handleIssueClick = useCallback(
    (issue: BottleneckResult) => {
      if (issue.entityType === 'building') {
        setSelectedBuilding(issue.id);
      } else if (issue.entityType === 'conveyor') {
        setSelectedConveyorSegment(issue.id);
      } else if (issue.entityType === 'pipe') {
        setSelectedPipeSegment(issue.id);
      }
    },
    [setSelectedBuilding, setSelectedConveyorSegment, setSelectedPipeSegment]
  );

  if (!isOpen) return null;

  const issueCount = bottleneckSummary.countBySeverity.critical + bottleneckSummary.countBySeverity.warning;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-start justify-end p-4 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Panel - Draggable */}
      <motion.div
        ref={dragRef}
        className="w-full max-w-md bg-slate-900/95 border border-orange-500/20 rounded-xl shadow-2xl overflow-hidden pointer-events-auto backdrop-blur-xl"
        variants={animations.slideInRight}
        initial="initial"
        animate="animate"
        exit="exit"
        drag={!isPinned}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: -window.innerWidth + 450, right: 0, top: 0, bottom: window.innerHeight - 200 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        style={{
          maxHeight: 'calc(100vh - 80px)',
          x: position.x,
          y: position.y,
          cursor: isDragging ? 'grabbing' : (isPinned ? 'default' : 'grab')
        }}
        whileDrag={{ scale: 1.01, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
      >
        {/* Header with drag handle */}
        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2">
            {!isPinned && (
              <div className="text-slate-500 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
              </div>
            )}
            <Activity size={18} className="text-orange-400" />
            <h2 className="text-base font-semibold text-white">Production Overview</h2>
            {isCalculating && (
              <RefreshCw size={12} className="text-orange-400 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {onPinToggle && (
              <button
                onClick={onPinToggle}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                title={isPinned ? 'Unpin panel' : 'Pin panel'}
              >
                {isPinned ? (
                  <Pin size={14} className="text-orange-400" />
                ) : (
                  <PinOff size={14} className="text-slate-400" />
                )}
              </button>
            )}
            <button
              onClick={recalculate}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              title="Recalculate"
            >
              <RefreshCw size={14} className={`text-slate-400 ${isCalculating ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content - Compact */}
        <div className="overflow-y-auto p-2.5 space-y-2" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {/* Health Score - Compact */}
          <div className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <HealthScoreIndicator
              score={factoryHealth.healthScore}
              isCalculating={factoryHealth.isCalculating}
            />
          </div>

          {/* Power Section */}
          <CollapsibleSection
            title="Power"
            icon={<Zap size={16} />}
            defaultExpanded={true}
          >
            <PowerProgressBar
              consumption={powerSummary.consumption}
              generation={powerSummary.generation}
            />
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-1.5 bg-slate-800/50 rounded text-center">
                <div className="text-slate-500">Consumers</div>
                <div className="text-slate-200 font-medium">{powerSummary.consumerCount}</div>
              </div>
              <div className="p-1.5 bg-slate-800/50 rounded text-center">
                <div className="text-slate-500">Generators</div>
                <div className="text-slate-200 font-medium">{powerSummary.generatorCount}</div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Fluid Summary Section */}
          {fluidSummary.length > 0 && (
            <CollapsibleSection
              title="Fluid Summary"
              icon={<Droplets size={16} className="text-blue-400" />}
              count={fluidSummary.length}
              defaultExpanded={false}
              badgeColor="bg-blue-500/20 text-blue-400"
            >
              <div className="space-y-2">
                {fluidSummary.map((fluid) => (
                  <FluidRateRow
                    key={fluid.fluidId}
                    fluidId={fluid.fluidId}
                    production={fluid.production}
                    consumption={fluid.consumption}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Station Sources Section */}
          {stationSources.total > 0 && (
            <CollapsibleSection
              title="Station Sources"
              icon={<Train size={16} className="text-cyan-400" />}
              count={stationSources.total}
              defaultExpanded={false}
              badgeColor="bg-cyan-500/20 text-cyan-400"
            >
              <div className="space-y-1.5">
                {/* Solid sources */}
                {stationSources.solids.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Package size={10} />
                      Solid ({stationSources.solids.length})
                    </div>
                    {stationSources.solids.map((source) => (
                      <StationSourceRow
                        key={source.buildingId}
                        stationId={source.buildingId}
                        resourceId={source.resourceId}
                        isFluid={source.isFluid}
                        rate={source.rate}
                        onClick={() => setSelectedBuilding(source.buildingId)}
                      />
                    ))}
                  </div>
                )}
                {/* Fluid sources */}
                {stationSources.fluids.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 mt-2">
                      <Droplets size={10} />
                      Fluid ({stationSources.fluids.length})
                    </div>
                    {stationSources.fluids.map((source) => (
                      <StationSourceRow
                        key={source.buildingId}
                        stationId={source.buildingId}
                        resourceId={source.resourceId}
                        isFluid={source.isFluid}
                        rate={source.rate}
                        onClick={() => setSelectedBuilding(source.buildingId)}
                      />
                    ))}
                  </div>
                )}
              </div>
              {stationSources.total === 0 && (
                <div className="text-xs text-slate-500 text-center py-2 flex items-center justify-center gap-1.5">
                  <Train size={12} className="text-slate-600" />
                  No station sources configured
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Storage Accumulation Section */}
          {storageAccumulation.length > 0 && (
            <CollapsibleSection
              title="Storage"
              icon={<Archive size={16} className="text-amber-400" />}
              count={storageAccumulation.length}
              defaultExpanded={storageAccumulation.some(s => s.fillTime !== null && s.fillTime < 4)}
              badgeColor={
                storageAccumulation.some(s => s.fillTime !== null && s.fillTime < 1)
                  ? 'bg-red-500/20 text-red-400'
                  : storageAccumulation.some(s => s.fillTime !== null && s.fillTime < 4)
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-600 text-slate-300'
              }
            >
              <div className="space-y-2">
                {storageAccumulation.map((storage) => (
                  <StorageAccumulationRow
                    key={storage.buildingId}
                    buildingId={storage.buildingId}
                    resourceId={storage.resourceId}
                    isFluid={storage.isFluid}
                    rate={storage.rate}
                    fillTime={storage.fillTime}
                    onClick={() => setSelectedBuilding(storage.buildingId)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* View Mode Toggle - Compact */}
          <div className="flex items-center gap-1.5 p-0.5 bg-slate-800/50 rounded-md">
            <button
              onClick={() => setViewMode('buildings')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'buildings'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Factory size={14} />
              Buildings
            </button>
            <button
              onClick={() => setViewMode('aggregate')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'aggregate'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Package size={14} />
              Aggregate
            </button>
          </div>

          {/* Building-by-Building View */}
          {viewMode === 'buildings' && (
            <CollapsibleSection
              title="Production Buildings"
              icon={<Factory size={16} />}
              count={productionBuildings.length}
              defaultExpanded={true}
            >
              {productionBuildings.length > 0 ? (
                <div className="space-y-1.5">
                  {productionBuildings.map(({ building, node, bottlenecks: buildingBottlenecks }) => (
                    <BuildingProductionCard
                      key={building.id}
                      building={building}
                      node={node}
                      bottlenecks={buildingBottlenecks}
                      onClick={() => setSelectedBuilding(building.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-2">
                  No production buildings found
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Aggregate View */}
          {viewMode === 'aggregate' && (
            <>
              {/* Inputs Section */}
              <CollapsibleSection
                title="Total Inputs"
                icon={<ArrowDownToLine size={16} />}
                count={inputs.length}
                defaultExpanded={inputs.length > 0}
              >
                {inputs.length > 0 ? (
                  <div className="space-y-0.5">
                    {inputs.slice(0, 10).map((input) => (
                      <ItemRateRow
                        key={input.itemId}
                        itemId={input.itemId}
                        rate={input.rate}
                        sourceCount={input.count}
                      />
                    ))}
                    {inputs.length > 10 && (
                      <div className="text-[10px] text-slate-500 text-center pt-1">
                        +{inputs.length - 10} more items
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-2">
                    No inputs detected
                  </div>
                )}
              </CollapsibleSection>

              {/* Outputs Section */}
              <CollapsibleSection
                title="Total Outputs"
                icon={<ArrowUpFromLine size={16} />}
                count={outputs.length}
                defaultExpanded={outputs.length > 0}
              >
                {outputs.length > 0 ? (
                  <div className="space-y-0.5">
                    {outputs.slice(0, 10).map((output) => (
                      <ItemRateRow
                        key={output.itemId}
                        itemId={output.itemId}
                        rate={output.rate}
                        sourceCount={output.count}
                      />
                    ))}
                    {outputs.length > 10 && (
                      <div className="text-[10px] text-slate-500 text-center pt-1">
                        +{outputs.length - 10} more items
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-2">
                    No outputs detected
                  </div>
                )}
              </CollapsibleSection>
            </>
          )}

          {/* Issues Section */}
          <CollapsibleSection
            title="Issues"
            icon={<AlertTriangle size={16} />}
            count={issueCount}
            defaultExpanded={issueCount > 0}
            badgeColor={
              bottleneckSummary.countBySeverity.critical > 0
                ? 'bg-red-500/20 text-red-400'
                : bottleneckSummary.countBySeverity.warning > 0
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-slate-600 text-slate-300'
            }
          >
            {topIssues.length > 0 ? (
              <div className="space-y-1.5">
                {topIssues.map((issue, index) => (
                  <IssueRow
                    key={`${issue.id}-${issue.type}-${index}`}
                    issue={issue}
                    onClick={() => handleIssueClick(issue)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-xs text-green-400 text-center py-2 flex items-center justify-center gap-1.5">
                <Activity size={14} />
                Factory running smoothly!
              </div>
            )}
          </CollapsibleSection>

          {/* Statistics - Compact */}
          <div className="p-2.5 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="text-xs font-medium text-slate-300 mb-2">Statistics</div>
            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <div className="p-1.5 bg-slate-800/50 rounded text-center">
                <div className="text-slate-500">Items</div>
                <div className="text-slate-200 font-medium">{productionStats.totalItemTypes}</div>
              </div>
              <div className="p-1.5 bg-slate-800/50 rounded text-center">
                <div className="text-slate-500">Buildings</div>
                <div className="text-slate-200 font-medium">{productionBuildings.length}</div>
              </div>
              <div className="p-1.5 bg-slate-800/50 rounded text-center">
                <div className="text-slate-500">Critical</div>
                <div className="text-red-400 font-medium">{factoryHealth.criticalCount}</div>
              </div>
              <div className="p-1.5 bg-slate-800/50 rounded text-center">
                <div className="text-slate-500">Warnings</div>
                <div className="text-yellow-400 font-medium">{factoryHealth.warningCount}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductionPanel;
