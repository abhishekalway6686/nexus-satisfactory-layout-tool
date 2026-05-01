// src/logic/production/clockSpeedHelpers.ts
// Clock speed calculation utilities for Satisfactory production simulation

/**
 * Power consumption exponent used by Satisfactory
 * Power scales as clockSpeed^1.6, not linearly
 */
export const POWER_EXPONENT = 1.6;

/**
 * Power Shard thresholds for overclocking
 * 0 shards: 1-100%
 * 1 shard: 101-150%
 * 2 shards: 151-200%
 * 3 shards: 201-250%
 */
export const POWER_SHARD_THRESHOLDS = [100, 150, 200, 250] as const;

/**
 * Calculate power consumption at a given clock speed
 * Power scales with clockSpeed^1.6 (exponential, not linear)
 *
 * @param basePower - Base power consumption at 100% clock speed (MW)
 * @param clockSpeed - Clock speed percentage (1-250)
 * @returns Power consumption in MW
 *
 * @example
 * calculatePowerAtClockSpeed(4, 100) // 4 MW (base)
 * calculatePowerAtClockSpeed(4, 200) // ~12.13 MW (2^1.6 * 4)
 * calculatePowerAtClockSpeed(4, 250) // ~18.38 MW (2.5^1.6 * 4)
 */
export function calculatePowerAtClockSpeed(basePower: number, clockSpeed: number): number {
  // Clamp clock speed to valid range
  const clampedSpeed = Math.max(1, Math.min(250, clockSpeed));

  // Convert percentage to multiplier
  const multiplier = clampedSpeed / 100;

  // Power scales exponentially: basePower * multiplier^1.6
  return basePower * Math.pow(multiplier, POWER_EXPONENT);
}

/**
 * Calculate output rate at a given clock speed
 * Output scales linearly with clock speed
 *
 * @param baseOutput - Base output rate at 100% clock speed (items or m³ per minute)
 * @param clockSpeed - Clock speed percentage (1-250)
 * @returns Output rate per minute
 *
 * @example
 * calculateOutputAtClockSpeed(30, 100) // 30/min (base)
 * calculateOutputAtClockSpeed(30, 200) // 60/min (linear)
 * calculateOutputAtClockSpeed(30, 250) // 75/min (linear)
 */
export function calculateOutputAtClockSpeed(baseOutput: number, clockSpeed: number): number {
  // Clamp clock speed to valid range
  const clampedSpeed = Math.max(1, Math.min(250, clockSpeed));

  // Output scales linearly
  return baseOutput * (clampedSpeed / 100);
}

/**
 * Calculate input consumption at a given clock speed
 * Input consumption scales linearly with clock speed (same as output)
 *
 * @param baseInput - Base input rate at 100% clock speed (items or m³ per minute)
 * @param clockSpeed - Clock speed percentage (1-250)
 * @returns Input consumption rate per minute
 */
export function calculateInputAtClockSpeed(baseInput: number, clockSpeed: number): number {
  // Input scales the same as output (linear)
  return calculateOutputAtClockSpeed(baseInput, clockSpeed);
}

/**
 * Get the number of Power Shards required for a given clock speed
 *
 * @param clockSpeed - Clock speed percentage (1-250)
 * @returns Number of Power Shards required (0-3)
 *
 * @example
 * getPowerShardRequirement(100) // 0 shards
 * getPowerShardRequirement(150) // 1 shard
 * getPowerShardRequirement(200) // 2 shards
 * getPowerShardRequirement(250) // 3 shards
 */
export function getPowerShardRequirement(clockSpeed: number): 0 | 1 | 2 | 3 {
  const clampedSpeed = Math.max(1, Math.min(250, clockSpeed));

  if (clampedSpeed <= 100) return 0;
  if (clampedSpeed <= 150) return 1;
  if (clampedSpeed <= 200) return 2;
  return 3;
}

/**
 * Get the maximum clock speed achievable with a given number of Power Shards
 *
 * @param shardCount - Number of Power Shards (0-3)
 * @returns Maximum clock speed percentage
 */
export function getMaxClockSpeedForShards(shardCount: number): number {
  const clampedShards = Math.max(0, Math.min(3, Math.floor(shardCount)));
  return POWER_SHARD_THRESHOLDS[clampedShards];
}

/**
 * Calculate the efficiency gain/loss at a given clock speed
 * Returns the ratio of output gained to power consumed compared to 100% baseline
 *
 * At 100%: efficiency = 1.0 (baseline)
 * At 200%: efficiency = 2.0 / 2^1.6 ≈ 0.66 (less efficient)
 * At 50%: efficiency = 0.5 / 0.5^1.6 ≈ 1.52 (more efficient)
 *
 * @param clockSpeed - Clock speed percentage (1-250)
 * @returns Efficiency ratio (>1 = more efficient than baseline, <1 = less efficient)
 *
 * @example
 * calculateEfficiencyGain(100) // 1.0 (baseline)
 * calculateEfficiencyGain(200) // ~0.66 (33% less efficient)
 * calculateEfficiencyGain(50) // ~1.52 (52% more efficient)
 */
export function calculateEfficiencyGain(clockSpeed: number): number {
  const clampedSpeed = Math.max(1, Math.min(250, clockSpeed));
  const multiplier = clampedSpeed / 100;

  // Efficiency = output_multiplier / power_multiplier
  // = multiplier / multiplier^1.6
  // = multiplier^(1-1.6)
  // = multiplier^(-0.6)
  return Math.pow(multiplier, 1 - POWER_EXPONENT);
}

/**
 * Calculate the power efficiency at a given clock speed
 * Returns power consumed per unit of output
 *
 * @param basePower - Base power consumption at 100% (MW)
 * @param baseOutput - Base output rate at 100% (per minute)
 * @param clockSpeed - Clock speed percentage (1-250)
 * @returns Power per output unit (MW per item/m³)
 */
export function calculatePowerPerOutput(
  basePower: number,
  baseOutput: number,
  clockSpeed: number
): number {
  const power = calculatePowerAtClockSpeed(basePower, clockSpeed);
  const output = calculateOutputAtClockSpeed(baseOutput, clockSpeed);

  if (output === 0) return Infinity;
  return power / output;
}

/**
 * Find the optimal clock speed for a target output rate
 * Returns the clock speed needed and whether it's achievable
 *
 * @param baseOutput - Base output rate at 100% (per minute)
 * @param targetOutput - Desired output rate (per minute)
 * @param maxClockSpeed - Maximum allowed clock speed (default 250)
 * @returns Object with clockSpeed and whether target is achievable
 */
export function findClockSpeedForOutput(
  baseOutput: number,
  targetOutput: number,
  maxClockSpeed: number = 250
): { clockSpeed: number; achievable: boolean; shardsRequired: 0 | 1 | 2 | 3 } {
  if (baseOutput === 0) {
    return { clockSpeed: 100, achievable: false, shardsRequired: 0 };
  }

  // Required clock speed = (target / base) * 100
  const requiredSpeed = (targetOutput / baseOutput) * 100;

  // Clamp to valid range
  const clampedSpeed = Math.max(1, Math.min(maxClockSpeed, requiredSpeed));

  return {
    clockSpeed: clampedSpeed,
    achievable: requiredSpeed <= maxClockSpeed && requiredSpeed >= 1,
    shardsRequired: getPowerShardRequirement(clampedSpeed)
  };
}

/**
 * Calculate total power for multiple buildings at different clock speeds
 *
 * @param buildings - Array of { basePower, clockSpeed } objects
 * @returns Total power consumption in MW
 */
export function calculateTotalPower(
  buildings: Array<{ basePower: number; clockSpeed: number }>
): number {
  return buildings.reduce((total, building) => {
    return total + calculatePowerAtClockSpeed(building.basePower, building.clockSpeed);
  }, 0);
}

/**
 * Calculate the number of buildings needed to achieve a target output
 * Assumes all buildings run at the same clock speed
 *
 * @param baseOutput - Base output per building at 100% (per minute)
 * @param targetOutput - Total desired output (per minute)
 * @param clockSpeed - Clock speed for each building (1-250)
 * @returns Number of buildings needed (may be fractional for planning)
 */
export function calculateBuildingsNeeded(
  baseOutput: number,
  targetOutput: number,
  clockSpeed: number = 100
): number {
  const outputPerBuilding = calculateOutputAtClockSpeed(baseOutput, clockSpeed);
  if (outputPerBuilding === 0) return Infinity;
  return targetOutput / outputPerBuilding;
}

/**
 * Compare efficiency between running fewer buildings at high clock speed
 * vs more buildings at lower clock speed
 *
 * @param basePower - Base power per building
 * @param baseOutput - Base output per building
 * @param targetOutput - Desired total output
 * @returns Comparison of different configurations
 */
export function compareClockSpeedConfigurations(
  basePower: number,
  baseOutput: number,
  targetOutput: number
): Array<{
  clockSpeed: number;
  buildingsNeeded: number;
  totalPower: number;
  efficiency: number;
  shardsRequired: number;
}> {
  const configurations = [50, 100, 150, 200, 250];

  return configurations.map(clockSpeed => {
    const buildingsNeeded = calculateBuildingsNeeded(baseOutput, targetOutput, clockSpeed);
    const totalPower = buildingsNeeded * calculatePowerAtClockSpeed(basePower, clockSpeed);
    const efficiency = calculateEfficiencyGain(clockSpeed);
    const shardsRequired = Math.ceil(buildingsNeeded) * getPowerShardRequirement(clockSpeed);

    return {
      clockSpeed,
      buildingsNeeded,
      totalPower,
      efficiency,
      shardsRequired
    };
  });
}
