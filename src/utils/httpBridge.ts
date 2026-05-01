// HTTP Bridge Client for Browser Tab Access to Rust Commands
// Enables browser tabs to access Tauri commands via HTTP when Tauri is not available

import { Point3D, Building, RailwayNode, ConveyorPole, PipeSupport } from '../types';

const HTTP_BRIDGE_BASE_URL = 'http://127.0.0.1:5175/api';

// HTTP Bridge Client
class HttpBridgeClient {
  private baseUrl: string;
  private available: boolean = false;

  constructor(baseUrl: string = HTTP_BRIDGE_BASE_URL) {
    this.baseUrl = baseUrl;
    this.checkAvailability();
  }

  // Check if HTTP bridge is available
  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        this.available = true;
        console.log('🌐 HTTP Bridge connected:', data.message || data.status || 'OK');
      }
    } catch (error) {
      this.available = false;
      console.warn('❌ HTTP Bridge not available:', error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.available) {
      await this.checkAvailability();
    }
    return this.available;
  }

  // Test connection to Rust backend
  async testRustConnection(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/test_rust_connection`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HTTP Bridge test failed:', error);
      throw error;
    }
  }

  // Distance calculations
  async calculateDistance3D(p1: Point3D, p2: Point3D): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/calculate_distance_3d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1, p2 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.distance;
    } catch (error) {
      console.error('HTTP Bridge distance calculation failed:', error);
      throw error;
    }
  }

  // Get spatial index statistics
  async getSpatialStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/spatial/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HTTP Bridge get spatial stats failed:', error);
      throw error;
    }
  }

  // Curve calculations
  async calculateCurveControlPointExact(p1: Point3D, p2: Point3D, p3: Point3D): Promise<Point3D> {
    try {
      const response = await fetch(`${this.baseUrl}/calculate_curve_control_point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1, p2, p3 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.control_point;
    } catch (error) {
      console.error('HTTP Bridge curve control point calculation failed:', error);
      throw error;
    }
  }

  async getQuadraticBezierPoints(
    start: Point3D,
    control: Point3D,
    end: Point3D,
    numPoints: number = 20
  ): Promise<Point3D[]> {
    try {
      const response = await fetch(`${this.baseUrl}/get_quadratic_bezier_points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          control,
          end,
          num_points: numPoints,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.points;
    } catch (error) {
      console.error('HTTP Bridge bezier points calculation failed:', error);
      throw error;
    }
  }

  // Spatial queries
  async spatialQueryBuildings(
    center: Point3D,
    radius: number,
    excludeIds: string[] = []
  ): Promise<{ buildings: Building[]; queryTimeMs: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/spatial/query_buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center,
          radius,
          exclude_ids: excludeIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        buildings: data.buildings,
        queryTimeMs: data.query_time_ms,
      };
    } catch (error) {
      console.error('HTTP Bridge spatial query failed:', error);
      throw error;
    }
  }

  async universalSpatialQuery(
    center: Point3D,
    radius: number,
    options: {
      includeBuildings?: boolean;
      includeRailwayNodes?: boolean;
      includeConveyorPoles?: boolean;
      includePipeSupports?: boolean;
      excludeIds?: string[];
    } = {}
  ): Promise<{
    buildings: Building[];
    railwayNodes: RailwayNode[];
    conveyorPoles: ConveyorPole[];
    pipeSupports: PipeSupport[];
    queryTimeMs: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/spatial/universal_query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center,
          radius,
          options: {
            include_buildings: options.includeBuildings,
            include_railway_nodes: options.includeRailwayNodes,
            include_conveyor_poles: options.includeConveyorPoles,
            include_pipe_supports: options.includePipeSupports,
            exclude_ids: options.excludeIds,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        buildings: data.buildings,
        railwayNodes: data.railway_nodes,
        conveyorPoles: data.conveyor_poles,
        pipeSupports: data.pipe_supports,
        queryTimeMs: data.query_time_ms,
      };
    } catch (error) {
      console.error('HTTP Bridge universal spatial query failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let httpBridgeClient: HttpBridgeClient | null = null;

export function getHttpBridgeClient(): HttpBridgeClient {
  if (!httpBridgeClient) {
    httpBridgeClient = new HttpBridgeClient();
  }
  return httpBridgeClient;
}

// Convenience functions that match Tauri command signatures
export async function testRustConnectionHttp(): Promise<string> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.testRustConnection();
}

export async function calculateDistance3DHttp(p1: Point3D, p2: Point3D): Promise<number> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.calculateDistance3D(p1, p2);
}

export async function calculateCurveControlPointExactHttp(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D
): Promise<Point3D> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.calculateCurveControlPointExact(p1, p2, p3);
}

export async function getQuadraticBezierPointsHttp(
  start: Point3D,
  control: Point3D,
  end: Point3D,
  numPoints: number = 20
): Promise<Point3D[]> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.getQuadraticBezierPoints(start, control, end, numPoints);
}

export async function spatialQueryBuildingsHttp(
  center: Point3D,
  radius: number,
  excludeIds: string[] = []
): Promise<{ buildings: Building[]; queryTimeMs: number }> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.spatialQueryBuildings(center, radius, excludeIds);
}

export async function getSpatialStatsHttp(): Promise<any> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.getSpatialStats();
}

export async function universalSpatialQueryHttp(
  center: Point3D,
  radius: number,
  options: {
    includeBuildings?: boolean;
    includeRailwayNodes?: boolean;
    includeConveyorPoles?: boolean;
    includePipeSupports?: boolean;
    excludeIds?: string[];
  } = {}
): Promise<{
  buildings: Building[];
  railwayNodes: RailwayNode[];
  conveyorPoles: ConveyorPole[];
  pipeSupports: PipeSupport[];
  queryTimeMs: number;
}> {
  const client = getHttpBridgeClient();
  if (!(await client.isAvailable())) {
    throw new Error('HTTP Bridge not available');
  }
  return client.universalSpatialQuery(center, radius, options);
}

// Check if HTTP bridge is available for environment detection
export async function isHttpBridgeAvailable(): Promise<boolean> {
  const client = getHttpBridgeClient();
  return client.isAvailable();
}