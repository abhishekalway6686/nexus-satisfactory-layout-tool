// src/components/UI/BuildingPreview.tsx
// Visual preview component for building cards in the palette

import React, { useMemo } from 'react';
import { BuildingCategory, ConnectionPoint, RailwayConnectionPoint } from '../../types';

interface BuildingPreviewProps {
  buildingKey: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  color: string;
  category: BuildingCategory;
  connectionPoints: ConnectionPoint[];
  railwayPoints?: RailwayConnectionPoint[];
  isMobile?: boolean;
  enableGlowEffects?: boolean;
}

// Category color palette - more vibrant and distinctive
const CATEGORY_COLORS: Record<BuildingCategory, { primary: string; secondary: string; accent: string }> = {
  production: { primary: '#4B7F52', secondary: '#3A6B42', accent: '#6BAF72' }, // Green - manufacturing
  extraction: { primary: '#B87333', secondary: '#8B5A2B', accent: '#D4944A' }, // Orange/copper - mining
  logistics: { primary: '#4A7B9D', secondary: '#3A6280', accent: '#6B9DBF' }, // Blue - transport/flow
  power: { primary: '#C4A035', secondary: '#9A7D2A', accent: '#E5C14F' }, // Yellow/gold - energy
  storage: { primary: '#6B7280', secondary: '#4B5563', accent: '#9CA3AF' }, // Gray - containers
  transport: { primary: '#7C5A9D', secondary: '#5E4377', accent: '#9D7BBF' }, // Purple - vehicles/rails
  special: { primary: '#9D5A5A', secondary: '#7A4545', accent: '#BF7B7B' }, // Red/maroon - unique
  workstations: { primary: '#6B6B5A', secondary: '#535345', accent: '#8D8D7A' }, // Tan - crafting
  infrastructure: { primary: '#5A6B7A', secondary: '#455563', accent: '#7A8B9A' }, // Steel blue - utilities
  architecture: { primary: '#708090', secondary: '#536270', accent: '#90A0B0' } // Slate - building
};

// SVG icon paths for different building types
const getBuildingIcon = (buildingKey: string, category: BuildingCategory): React.ReactNode => {
  // Production machines
  if (buildingKey.includes('constructor')) {
    return (
      <g>
        <rect x="25" y="20" width="50" height="40" rx="3" fill="currentColor" opacity="0.8" />
        <rect x="30" y="25" width="10" height="10" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="55" y="35" width="15" height="20" rx="2" fill="currentColor" opacity="0.5" />
        <path d="M40 65 L60 65 L55 55 L45 55 Z" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  if (buildingKey.includes('assembler')) {
    return (
      <g>
        <rect x="20" y="18" width="60" height="44" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="25" y="23" width="15" height="12" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="55" y="23" width="15" height="12" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="38" y="40" width="24" height="16" rx="2" fill="currentColor" opacity="0.5" />
        <circle cx="50" cy="48" r="5" fill="currentColor" opacity="0.3" />
      </g>
    );
  }

  if (buildingKey.includes('manufacturer')) {
    return (
      <g>
        <rect x="15" y="15" width="70" height="50" rx="5" fill="currentColor" opacity="0.7" />
        <rect x="20" y="20" width="12" height="10" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="35" y="20" width="12" height="10" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="50" y="20" width="12" height="10" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="65" y="20" width="12" height="10" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="30" y="38" width="40" height="20" rx="3" fill="currentColor" opacity="0.5" />
        <circle cx="50" cy="48" r="7" fill="currentColor" opacity="0.35" />
      </g>
    );
  }

  if (buildingKey.includes('smelter')) {
    return (
      <g>
        <path d="M35 60 L30 25 L70 25 L65 60 Z" fill="currentColor" opacity="0.8" />
        <ellipse cx="50" cy="25" rx="20" ry="6" fill="currentColor" opacity="0.6" />
        <path d="M45 15 Q50 5 55 15" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M40 18 Q45 10 50 18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('foundry')) {
    return (
      <g>
        <rect x="25" y="30" width="50" height="35" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="30" y="18" width="15" height="20" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="55" y="18" width="15" height="20" rx="2" fill="currentColor" opacity="0.6" />
        <ellipse cx="37" cy="18" rx="6" ry="3" fill="currentColor" opacity="0.4" />
        <ellipse cx="62" cy="18" rx="6" ry="3" fill="currentColor" opacity="0.4" />
        <rect x="40" y="45" width="20" height="12" rx="2" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('refinery')) {
    return (
      <g>
        <rect x="30" y="35" width="40" height="30" rx="3" fill="currentColor" opacity="0.7" />
        <rect x="35" y="15" width="10" height="25" rx="2" fill="currentColor" opacity="0.8" />
        <rect x="55" y="20" width="10" height="20" rx="2" fill="currentColor" opacity="0.8" />
        <circle cx="40" cy="15" r="4" fill="currentColor" opacity="0.5" />
        <circle cx="60" cy="20" r="3" fill="currentColor" opacity="0.5" />
        <rect x="42" y="45" width="16" height="10" rx="2" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('blender')) {
    return (
      <g>
        <ellipse cx="50" cy="45" rx="28" ry="18" fill="currentColor" opacity="0.75" />
        <ellipse cx="50" cy="35" rx="20" ry="10" fill="currentColor" opacity="0.5" />
        <rect x="45" y="20" width="10" height="20" rx="2" fill="currentColor" opacity="0.6" />
        <path d="M47 25 L53 25 L53 35 L47 35 Z" fill="currentColor" opacity="0.3" />
      </g>
    );
  }

  if (buildingKey.includes('packager')) {
    return (
      <g>
        <rect x="28" y="25" width="44" height="35" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="33" y="30" width="14" height="10" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="53" y="30" width="14" height="10" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="38" y="48" width="24" height="8" rx="2" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('particle_accelerator') || buildingKey.includes('quantum')) {
    return (
      <g>
        <ellipse cx="50" cy="45" rx="30" ry="20" fill="currentColor" opacity="0.6" />
        <ellipse cx="50" cy="45" rx="20" ry="12" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="45" r="6" fill="currentColor" opacity="0.8" />
        <path d="M25 45 Q50 25 75 45" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M25 45 Q50 65 75 45" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('converter') || buildingKey.includes('somersloop')) {
    return (
      <g>
        <rect x="25" y="22" width="50" height="40" rx="5" fill="currentColor" opacity="0.7" />
        <polygon points="50,28 60,42 40,42" fill="currentColor" opacity="0.5" />
        <polygon points="50,56 60,42 40,42" fill="currentColor" opacity="0.4" />
        <circle cx="50" cy="42" r="4" fill="currentColor" opacity="0.8" />
      </g>
    );
  }

  // Extraction
  if (buildingKey.includes('miner')) {
    return (
      <g>
        <rect x="30" y="35" width="40" height="30" rx="3" fill="currentColor" opacity="0.75" />
        <path d="M40 35 L40 20 L60 20 L60 35" fill="currentColor" opacity="0.6" />
        <path d="M50 65 L45 75 L55 75 Z" fill="currentColor" opacity="0.8" />
        <circle cx="50" cy="27" r="5" fill="currentColor" opacity="0.4" />
        <rect x="47" y="40" width="6" height="20" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('water_extractor')) {
    return (
      <g>
        <ellipse cx="50" cy="50" rx="30" ry="15" fill="currentColor" opacity="0.7" />
        <rect x="40" y="30" width="20" height="25" rx="3" fill="currentColor" opacity="0.6" />
        <path d="M50 25 Q45 15 50 10 Q55 15 50 25" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="50" rx="18" ry="8" fill="currentColor" opacity="0.3" />
      </g>
    );
  }

  if (buildingKey.includes('oil_extractor')) {
    return (
      <g>
        <rect x="35" y="40" width="30" height="25" rx="3" fill="currentColor" opacity="0.75" />
        <rect x="42" y="20" width="16" height="25" rx="2" fill="currentColor" opacity="0.6" />
        <path d="M45 18 L50 10 L55 18" fill="currentColor" opacity="0.7" />
        <rect x="48" y="5" width="4" height="8" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="55" rx="10" ry="5" fill="currentColor" opacity="0.3" />
      </g>
    );
  }

  if (buildingKey.includes('resource_well')) {
    return (
      <g>
        <rect x="30" y="35" width="40" height="30" rx="4" fill="currentColor" opacity="0.7" />
        <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.5" />
        <circle cx="50" cy="50" r="6" fill="currentColor" opacity="0.8" />
        <rect x="45" y="20" width="10" height="18" rx="2" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  // Power
  if (buildingKey.includes('biomass')) {
    return (
      <g>
        <rect x="30" y="35" width="40" height="30" rx="4" fill="currentColor" opacity="0.75" />
        <path d="M45 35 L45 22 L55 22 L55 35" fill="currentColor" opacity="0.6" />
        <path d="M42 20 Q50 10 58 20" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.5" />
        <rect x="38" y="45" width="24" height="12" rx="2" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('coal_generator')) {
    return (
      <g>
        <rect x="25" y="40" width="50" height="25" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="35" y="20" width="12" height="25" rx="2" fill="currentColor" opacity="0.7" />
        <rect x="55" y="25" width="10" height="20" rx="2" fill="currentColor" opacity="0.6" />
        <path d="M38 18 Q41 8 44 18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
        <ellipse cx="60" cy="25" rx="4" ry="2" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('fuel_generator')) {
    return (
      <g>
        <rect x="25" y="30" width="50" height="35" rx="5" fill="currentColor" opacity="0.75" />
        <ellipse cx="50" cy="40" rx="15" ry="8" fill="currentColor" opacity="0.5" />
        <rect x="30" y="50" width="8" height="12" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="62" y="50" width="8" height="12" rx="2" fill="currentColor" opacity="0.6" />
        <circle cx="50" cy="40" r="5" fill="currentColor" opacity="0.7" />
      </g>
    );
  }

  if (buildingKey.includes('nuclear')) {
    return (
      <g>
        <rect x="20" y="35" width="60" height="30" rx="5" fill="currentColor" opacity="0.7" />
        <path d="M35 35 L35 15 Q50 5 65 15 L65 35" fill="currentColor" opacity="0.6" />
        <circle cx="50" cy="25" r="8" fill="currentColor" opacity="0.8" />
        <path d="M50 20 L53 25 L50 30 L47 25 Z" fill="currentColor" opacity="0.4" />
        <rect x="30" y="45" width="40" height="12" rx="3" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('geothermal')) {
    return (
      <g>
        <ellipse cx="50" cy="55" rx="28" ry="12" fill="currentColor" opacity="0.7" />
        <path d="M40 55 L40 25 Q50 15 60 25 L60 55" fill="currentColor" opacity="0.6" />
        <path d="M45 20 Q50 10 55 20" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M42 25 Q47 18 52 25" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
        <circle cx="50" cy="40" r="6" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('power_storage')) {
    return (
      <g>
        <rect x="30" y="25" width="40" height="40" rx="5" fill="currentColor" opacity="0.75" />
        <rect x="40" y="20" width="20" height="8" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="35" y="35" width="30" height="20" rx="3" fill="currentColor" opacity="0.4" />
        <path d="M50 38 L55 45 L48 45 L53 55 L45 48 L52 48 Z" fill="currentColor" opacity="0.7" />
      </g>
    );
  }

  if (buildingKey.includes('alien_power')) {
    return (
      <g>
        <polygon points="50,15 75,45 65,70 35,70 25,45" fill="currentColor" opacity="0.7" />
        <polygon points="50,25 65,45 58,60 42,60 35,45" fill="currentColor" opacity="0.4" />
        <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.8" />
      </g>
    );
  }

  // Logistics
  if (buildingKey.includes('splitter')) {
    return (
      <g>
        <rect x="30" y="30" width="40" height="30" rx="3" fill="currentColor" opacity="0.75" />
        <path d="M50 65 L50 50" stroke="currentColor" strokeWidth="6" opacity="0.6" />
        <path d="M30 45 L45 45" stroke="currentColor" strokeWidth="6" opacity="0.6" />
        <path d="M55 45 L70 45" stroke="currentColor" strokeWidth="6" opacity="0.6" />
        <path d="M50 30 L50 40" stroke="currentColor" strokeWidth="6" opacity="0.6" />
        <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.8" />
      </g>
    );
  }

  if (buildingKey.includes('merger')) {
    return (
      <g>
        <rect x="30" y="30" width="40" height="30" rx="3" fill="currentColor" opacity="0.75" />
        <path d="M30 35 L45 45" stroke="currentColor" strokeWidth="5" opacity="0.6" />
        <path d="M70 35 L55 45" stroke="currentColor" strokeWidth="5" opacity="0.6" />
        <path d="M50 65 L50 50" stroke="currentColor" strokeWidth="5" opacity="0.6" />
        <path d="M50 30 L50 40" stroke="currentColor" strokeWidth="6" opacity="0.6" />
        <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.8" />
      </g>
    );
  }

  if (buildingKey.includes('pipeline_junction')) {
    return (
      <g>
        <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.7" />
        <rect x="47" y="20" width="6" height="20" fill="currentColor" opacity="0.6" />
        <rect x="47" y="55" width="6" height="20" fill="currentColor" opacity="0.6" />
        <rect x="25" y="42" width="20" height="6" fill="currentColor" opacity="0.6" />
        <rect x="55" y="42" width="20" height="6" fill="currentColor" opacity="0.6" />
        <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('pipeline_pump') || buildingKey.includes('pump')) {
    return (
      <g>
        <rect x="35" y="30" width="30" height="30" rx="4" fill="currentColor" opacity="0.75" />
        <ellipse cx="50" cy="45" rx="10" ry="10" fill="currentColor" opacity="0.5" />
        <rect x="47" y="15" width="6" height="18" fill="currentColor" opacity="0.6" />
        <rect x="47" y="57" width="6" height="18" fill="currentColor" opacity="0.6" />
        <path d="M45 45 L55 45 M50 40 L50 50" stroke="currentColor" strokeWidth="3" opacity="0.7" />
      </g>
    );
  }

  if (buildingKey.includes('valve')) {
    return (
      <g>
        <rect x="40" y="30" width="20" height="30" rx="3" fill="currentColor" opacity="0.75" />
        <ellipse cx="50" cy="45" rx="12" ry="8" fill="currentColor" opacity="0.5" />
        <rect x="47" y="20" width="6" height="12" fill="currentColor" opacity="0.6" />
        <rect x="47" y="58" width="6" height="12" fill="currentColor" opacity="0.6" />
        <circle cx="50" cy="45" r="4" fill="currentColor" opacity="0.7" />
      </g>
    );
  }

  // Storage
  if (buildingKey.includes('storage') || buildingKey.includes('depot')) {
    const isLarge = buildingKey.includes('industrial') || buildingKey.includes('dimensional');
    return (
      <g>
        <rect x={isLarge ? 20 : 25} y="25" width={isLarge ? 60 : 50} height="40" rx="4" fill="currentColor" opacity="0.75" />
        <rect x={isLarge ? 25 : 30} y="30" width={isLarge ? 50 : 40} height="8" rx="2" fill="currentColor" opacity="0.4" />
        <rect x={isLarge ? 25 : 30} y="42" width={isLarge ? 50 : 40} height="8" rx="2" fill="currentColor" opacity="0.4" />
        <rect x={isLarge ? 25 : 30} y="54" width={isLarge ? 50 : 40} height="8" rx="2" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('fluid_buffer')) {
    const isLarge = buildingKey.includes('industrial');
    return (
      <g>
        <ellipse cx="50" cy={isLarge ? 55 : 50} rx={isLarge ? 25 : 18} ry="12" fill="currentColor" opacity="0.6" />
        <rect x={isLarge ? 25 : 32} y="25" width={isLarge ? 50 : 36} height={isLarge ? 35 : 28} rx="4" fill="currentColor" opacity="0.75" />
        <ellipse cx="50" cy="25" rx={isLarge ? 25 : 18} ry="8" fill="currentColor" opacity="0.5" />
        <rect x="45" y="15" width="10" height="10" rx="2" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  if (buildingKey.includes('personal') || buildingKey.includes('medical') || buildingKey.includes('hazard')) {
    return (
      <g>
        <rect x="32" y="30" width="36" height="30" rx="4" fill="currentColor" opacity="0.8" />
        <rect x="38" y="36" width="24" height="18" rx="2" fill="currentColor" opacity="0.4" />
        {buildingKey.includes('medical') && (
          <path d="M47 42 L53 42 M50 39 L50 45" stroke="currentColor" strokeWidth="3" opacity="0.7" />
        )}
        {buildingKey.includes('hazard') && (
          <polygon points="50,37 56,47 44,47" fill="currentColor" opacity="0.6" />
        )}
      </g>
    );
  }

  // Transport
  if (buildingKey.includes('truck_station')) {
    return (
      <g>
        <rect x="20" y="35" width="60" height="30" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="25" y="25" width="20" height="15" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="55" y="25" width="20" height="15" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="35" y="45" width="30" height="12" rx="2" fill="currentColor" opacity="0.4" />
        <circle cx="32" cy="65" r="5" fill="currentColor" opacity="0.6" />
        <circle cx="68" cy="65" r="5" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  if (buildingKey.includes('train_station') || buildingKey.includes('platform')) {
    const isFluid = buildingKey.includes('fluid');
    const isEmpty = buildingKey.includes('empty');
    return (
      <g>
        <rect x="15" y="30" width="70" height="35" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="5" y="40" width="15" height="15" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="80" y="40" width="15" height="15" rx="2" fill="currentColor" opacity="0.6" />
        {!isEmpty && (
          <>
            <rect x="25" y="38" width="50" height="18" rx="2" fill="currentColor" opacity="0.4" />
            {isFluid ? (
              <ellipse cx="50" cy="47" rx="15" ry="6" fill="currentColor" opacity="0.5" />
            ) : (
              <>
                <rect x="30" y="42" width="15" height="10" rx="1" fill="currentColor" opacity="0.5" />
                <rect x="55" y="42" width="15" height="10" rx="1" fill="currentColor" opacity="0.5" />
              </>
            )}
          </>
        )}
        <rect x="0" y="55" width="100" height="4" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('drone_port')) {
    return (
      <g>
        <rect x="25" y="40" width="50" height="25" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="35" y="30" width="30" height="15" rx="3" fill="currentColor" opacity="0.6" />
        <ellipse cx="50" cy="55" rx="20" ry="5" fill="currentColor" opacity="0.4" />
        <path d="M40 25 L50 15 L60 25" fill="currentColor" opacity="0.5" />
        <rect x="48" y="10" width="4" height="8" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  // Special
  if (buildingKey === 'hub') {
    return (
      <g>
        <rect x="15" y="30" width="70" height="35" rx="5" fill="currentColor" opacity="0.75" />
        <rect x="25" y="22" width="50" height="15" rx="3" fill="currentColor" opacity="0.6" />
        <rect x="35" y="15" width="30" height="12" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="30" y="45" width="40" height="12" rx="2" fill="currentColor" opacity="0.4" />
        <text x="50" y="52" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.7">HUB</text>
      </g>
    );
  }

  if (buildingKey === 'mam') {
    return (
      <g>
        <rect x="25" y="30" width="50" height="35" rx="5" fill="currentColor" opacity="0.75" />
        <circle cx="50" cy="45" r="15" fill="currentColor" opacity="0.5" />
        <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.7" />
        <path d="M40 35 Q50 25 60 35" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('space_elevator')) {
    return (
      <g>
        <rect x="35" y="50" width="30" height="20" rx="3" fill="currentColor" opacity="0.75" />
        <path d="M40 50 L50 10 L60 50" fill="currentColor" opacity="0.6" />
        <rect x="47" y="5" width="6" height="50" fill="currentColor" opacity="0.5" />
        <ellipse cx="50" cy="60" rx="20" ry="8" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('awesome_sink')) {
    return (
      <g>
        <rect x="25" y="30" width="50" height="35" rx="5" fill="currentColor" opacity="0.75" />
        <ellipse cx="50" cy="50" rx="18" ry="10" fill="currentColor" opacity="0.5" />
        <path d="M35 45 Q50 60 65 45" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.6" />
        <path d="M45 40 L55 40 L52 50 L48 50 Z" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  // Workstations
  if (buildingKey.includes('craft_bench') || buildingKey.includes('workshop')) {
    return (
      <g>
        <rect x="25" y="40" width="50" height="25" rx="3" fill="currentColor" opacity="0.75" />
        <rect x="30" y="35" width="40" height="10" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="35" y="28" width="12" height="12" rx="2" fill="currentColor" opacity="0.4" />
        <rect x="53" y="28" width="12" height="12" rx="2" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('blueprint')) {
    return (
      <g>
        <rect x="25" y="30" width="50" height="35" rx="4" fill="currentColor" opacity="0.75" />
        <rect x="30" y="35" width="40" height="25" rx="2" fill="currentColor" opacity="0.4" />
        <path d="M35 40 L65 40 M35 47 L55 47 M35 54 L60 54" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      </g>
    );
  }

  // Infrastructure
  if (buildingKey.includes('lookout_tower') || buildingKey.includes('radar_tower')) {
    const isRadar = buildingKey.includes('radar');
    return (
      <g>
        <rect x="43" y="45" width="14" height="25" rx="2" fill="currentColor" opacity="0.75" />
        <path d="M40 45 L50 20 L60 45" fill="currentColor" opacity="0.6" />
        {isRadar && (
          <>
            <ellipse cx="50" cy="20" rx="12" ry="5" fill="currentColor" opacity="0.5" />
            <rect x="48" y="10" width="4" height="12" fill="currentColor" opacity="0.6" />
          </>
        )}
        <rect x="38" y="65" width="24" height="5" rx="1" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('power_pole')) {
    return (
      <g>
        <rect x="47" y="30" width="6" height="40" fill="currentColor" opacity="0.75" />
        <rect x="35" y="32" width="30" height="4" rx="1" fill="currentColor" opacity="0.6" />
        <circle cx="38" cy="34" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="50" cy="34" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="62" cy="34" r="3" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('power_tower')) {
    return (
      <g>
        <path d="M35 70 L45 30 L50 25 L55 30 L65 70" fill="currentColor" opacity="0.75" />
        <path d="M38 55 L62 55 M40 45 L60 45" stroke="currentColor" strokeWidth="3" opacity="0.5" />
        <rect x="35" y="27" width="30" height="6" rx="1" fill="currentColor" opacity="0.6" />
        <circle cx="38" cy="30" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="62" cy="30" r="3" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  // Architecture - simplified geometric shapes
  if (buildingKey.includes('foundation') || buildingKey.includes('ceiling') || buildingKey.includes('frame_floor')) {
    return (
      <g>
        <rect x="20" y="35" width="60" height="25" rx="2" fill="currentColor" opacity="0.75" />
        <path d="M25 40 L75 40 M25 47 L75 47 M25 54 L75 54" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M35 35 L35 60 M50 35 L50 60 M65 35 L65 60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </g>
    );
  }

  if (buildingKey.includes('wall')) {
    return (
      <g>
        <rect x="20" y="25" width="60" height="40" rx="2" fill="currentColor" opacity="0.75" />
        <rect x="25" y="30" width="20" height="30" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="55" y="30" width="20" height="30" rx="1" fill="currentColor" opacity="0.4" />
      </g>
    );
  }

  if (buildingKey.includes('ramp') || buildingKey.includes('quarter_pipe')) {
    const isCurved = buildingKey.includes('curved') || buildingKey.includes('quarter');
    return (
      <g>
        {isCurved ? (
          <path d="M20 60 Q50 60 80 25" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.75" />
        ) : (
          <path d="M20 65 L80 25 L80 65 Z" fill="currentColor" opacity="0.75" />
        )}
        <path d="M25 60 L75 30" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </g>
    );
  }

  if (buildingKey.includes('walkway') || buildingKey.includes('catwalk')) {
    return (
      <g>
        <rect x="15" y="40" width="70" height="10" rx="1" fill="currentColor" opacity="0.75" />
        <path d="M20 42 L80 42 M20 45 L80 45 M20 48 L80 48" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <rect x="15" y="38" width="4" height="14" fill="currentColor" opacity="0.5" />
        <rect x="81" y="38" width="4" height="14" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('pillar')) {
    return (
      <g>
        <rect x="40" y="20" width="20" height="50" rx="2" fill="currentColor" opacity="0.75" />
        <rect x="35" y="15" width="30" height="8" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="35" y="67" width="30" height="8" rx="1" fill="currentColor" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('beam')) {
    return (
      <g>
        <rect x="10" y="38" width="80" height="14" rx="2" fill="currentColor" opacity="0.75" />
        <path d="M15 42 L15 48 M85 42 L85 48" stroke="currentColor" strokeWidth="3" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('railing') || buildingKey.includes('fence')) {
    return (
      <g>
        <rect x="15" y="35" width="70" height="4" rx="1" fill="currentColor" opacity="0.75" />
        <rect x="15" y="55" width="70" height="4" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="20" y="35" width="3" height="24" fill="currentColor" opacity="0.6" />
        <rect x="40" y="35" width="3" height="24" fill="currentColor" opacity="0.6" />
        <rect x="60" y="35" width="3" height="24" fill="currentColor" opacity="0.6" />
        <rect x="77" y="35" width="3" height="24" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  if (buildingKey.includes('window')) {
    return (
      <g>
        <rect x="20" y="25" width="60" height="40" rx="2" fill="currentColor" opacity="0.75" />
        <rect x="25" y="30" width="50" height="30" rx="1" fill="currentColor" opacity="0.3" />
        <path d="M50 30 L50 60 M25 45 L75 45" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      </g>
    );
  }

  if (buildingKey.includes('door')) {
    return (
      <g>
        <rect x="30" y="20" width="40" height="50" rx="2" fill="currentColor" opacity="0.75" />
        <rect x="35" y="25" width="30" height="40" rx="1" fill="currentColor" opacity="0.4" />
        <circle cx="60" cy="45" r="3" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  if (buildingKey.includes('ladder')) {
    return (
      <g>
        <rect x="40" y="15" width="5" height="55" fill="currentColor" opacity="0.75" />
        <rect x="55" y="15" width="5" height="55" fill="currentColor" opacity="0.75" />
        <rect x="40" y="20" width="20" height="3" fill="currentColor" opacity="0.6" />
        <rect x="40" y="32" width="20" height="3" fill="currentColor" opacity="0.6" />
        <rect x="40" y="44" width="20" height="3" fill="currentColor" opacity="0.6" />
        <rect x="40" y="56" width="20" height="3" fill="currentColor" opacity="0.6" />
      </g>
    );
  }

  // Default fallback based on category
  switch (category) {
    case 'production':
      return (
        <g>
          <rect x="25" y="25" width="50" height="40" rx="4" fill="currentColor" opacity="0.75" />
          <rect x="32" y="32" width="15" height="12" rx="2" fill="currentColor" opacity="0.4" />
          <rect x="53" y="32" width="15" height="12" rx="2" fill="currentColor" opacity="0.4" />
          <rect x="38" y="50" width="24" height="10" rx="2" fill="currentColor" opacity="0.5" />
        </g>
      );
    case 'extraction':
      return (
        <g>
          <rect x="30" y="35" width="40" height="30" rx="3" fill="currentColor" opacity="0.75" />
          <path d="M40 35 L40 22 L60 22 L60 35" fill="currentColor" opacity="0.6" />
          <path d="M50 65 L45 75 L55 75 Z" fill="currentColor" opacity="0.7" />
        </g>
      );
    case 'power':
      return (
        <g>
          <rect x="25" y="30" width="50" height="35" rx="4" fill="currentColor" opacity="0.75" />
          <path d="M50 35 L55 45 L48 45 L53 58 L45 48 L52 48 Z" fill="currentColor" opacity="0.6" />
        </g>
      );
    case 'logistics':
      return (
        <g>
          <rect x="30" y="30" width="40" height="30" rx="3" fill="currentColor" opacity="0.75" />
          <path d="M35 45 L65 45 M50 30 L50 60" stroke="currentColor" strokeWidth="5" opacity="0.5" />
          <circle cx="50" cy="45" r="6" fill="currentColor" opacity="0.7" />
        </g>
      );
    case 'storage':
      return (
        <g>
          <rect x="25" y="25" width="50" height="40" rx="4" fill="currentColor" opacity="0.75" />
          <rect x="30" y="30" width="40" height="8" rx="2" fill="currentColor" opacity="0.4" />
          <rect x="30" y="42" width="40" height="8" rx="2" fill="currentColor" opacity="0.4" />
          <rect x="30" y="54" width="40" height="8" rx="2" fill="currentColor" opacity="0.4" />
        </g>
      );
    case 'transport':
      return (
        <g>
          <rect x="20" y="35" width="60" height="25" rx="4" fill="currentColor" opacity="0.75" />
          <rect x="10" y="42" width="15" height="10" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="75" y="42" width="15" height="10" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="0" y="55" width="100" height="4" fill="currentColor" opacity="0.5" />
        </g>
      );
    case 'special':
      return (
        <g>
          <polygon points="50,20 75,40 70,65 30,65 25,40" fill="currentColor" opacity="0.75" />
          <circle cx="50" cy="45" r="10" fill="currentColor" opacity="0.5" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="25" y="25" width="50" height="40" rx="3" fill="currentColor" opacity="0.75" />
          <rect x="32" y="32" width="36" height="26" rx="2" fill="currentColor" opacity="0.4" />
        </g>
      );
  }
};

// Calculate proportional dimensions for preview
const getProportionalDimensions = (width: number, height: number, maxWidth: number, maxHeight: number): { w: number; h: number } => {
  const aspectRatio = width / height;
  let w = maxWidth;
  let h = maxHeight;

  if (aspectRatio > maxWidth / maxHeight) {
    // Width-constrained
    h = maxWidth / aspectRatio;
  } else {
    // Height-constrained
    w = maxHeight * aspectRatio;
  }

  // Ensure minimum size
  const minSize = 30;
  if (w < minSize) {
    w = minSize;
    h = minSize / aspectRatio;
  }
  if (h < minSize) {
    h = minSize;
    w = minSize * aspectRatio;
  }

  return { w: Math.min(w, maxWidth), h: Math.min(h, maxHeight) };
};

const BuildingPreview: React.FC<BuildingPreviewProps> = ({
  buildingKey,
  name,
  width,
  height,
  depth,
  color,
  category,
  connectionPoints,
  railwayPoints,
  isMobile = false,
  enableGlowEffects = false
}) => {
  const categoryColors = CATEGORY_COLORS[category];
  const svgHeight = isMobile ? 56 : 48;

  // Calculate proportional size indicator
  const maxDimension = Math.max(width, height, depth);
  const sizeIndicator = useMemo(() => {
    if (maxDimension <= 8) return 'S';
    if (maxDimension <= 16) return 'M';
    if (maxDimension <= 32) return 'L';
    return 'XL';
  }, [maxDimension]);

  const icon = useMemo(() => getBuildingIcon(buildingKey, category), [buildingKey, category]);

  return (
    <div
      className="w-full rounded-lg relative overflow-hidden"
      style={{
        height: svgHeight,
        background: `linear-gradient(145deg, ${categoryColors.primary}88, ${categoryColors.secondary}66)`,
        boxShadow: enableGlowEffects
          ? `inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 8px ${categoryColors.primary}33`
          : 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* SVG Icon */}
      <svg
        viewBox="0 0 100 80"
        className="w-full h-full"
        style={{ color: categoryColors.accent }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background pattern for texture */}
        <defs>
          <pattern id={`grid-${buildingKey}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100" height="80" fill={`url(#grid-${buildingKey})`} />

        {/* Main icon */}
        {icon}
      </svg>

      {/* Size indicator badge */}
      <div
        className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
        style={{
          backgroundColor: categoryColors.secondary + 'CC',
          color: categoryColors.accent,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {sizeIndicator}
      </div>

      {/* Connection points indicator */}
      {connectionPoints.length > 0 && (
        <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
          {connectionPoints.slice(0, 4).map((cp, i) => (
            <div
              key={i}
              className={`rounded-full ${isMobile ? 'w-1.5 h-1.5' : 'w-1 h-1'}`}
              style={{
                backgroundColor: cp.isFluid ? '#60A5FA' :
                  cp.type === 'input' ? '#FB923C' :
                  cp.type === 'output' ? '#4ADE80' : '#FBBF24',
                boxShadow: enableGlowEffects ? `0 0 4px ${cp.isFluid ? '#60A5FA' : cp.type === 'input' ? '#FB923C' : cp.type === 'output' ? '#4ADE80' : '#FBBF24'}` : 'none'
              }}
            />
          ))}
          {connectionPoints.length > 4 && (
            <span className="text-[8px] text-white/60 ml-0.5">+{connectionPoints.length - 4}</span>
          )}
        </div>
      )}

      {/* Railway indicator */}
      {railwayPoints && railwayPoints.length > 0 && (
        <div className="absolute bottom-1 right-1">
          <div
            className={`${isMobile ? 'w-3 h-1.5' : 'w-2.5 h-1'} rounded-sm`}
            style={{
              backgroundColor: '#64748B',
              boxShadow: enableGlowEffects ? '0 0 4px #64748B' : 'none'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BuildingPreview;
