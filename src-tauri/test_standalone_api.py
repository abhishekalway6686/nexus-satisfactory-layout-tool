#!/usr/bin/env python3
"""
Test client for Satisfactory Layout Tool Standalone HTTP Server
This script tests the API endpoints to ensure they're working correctly.
"""

import requests
import json
import time

BASE_URL = 'http://127.0.0.1:5175'

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f'{BASE_URL}/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data['message']}")
            print(f"   Version: {data['version']}")
            print(f"   Mode: {data['mode']}")
            print(f"   Uptime: {data['uptime_seconds']:.2f}s")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check error: {e}")
        return False

def test_api_info():
    """Test the API info endpoint"""
    print("\n📋 Testing API info...")
    try:
        response = requests.get(f'{BASE_URL}/api/info', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API info retrieved successfully")
            print(f"   Name: {data['name']}")
            print(f"   Available endpoints: {len(data['endpoints'])} categories")
            return True
        else:
            print(f"❌ API info failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API info error: {e}")
        return False

def test_distance_calculation():
    """Test 3D distance calculation"""
    print("\n📐 Testing 3D distance calculation...")
    try:
        payload = {
            "p1": {"x": 0.0, "y": 0.0, "z": 0.0},
            "p2": {"x": 100.0, "y": 100.0, "z": 100.0}
        }
        
        response = requests.post(
            f'{BASE_URL}/api/geometry/distance_3d',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            expected_distance = (100**2 + 100**2 + 100**2) ** 0.5  # ~173.2
            print(f"✅ Distance calculation successful")
            print(f"   Distance: {data['distance']:.2f} (expected: {expected_distance:.2f})")
            print(f"   Calculation time: {data['calculation_time_ms']:.4f}ms")
            
            # Verify the result is approximately correct
            if abs(data['distance'] - expected_distance) < 0.01:
                print("✅ Distance calculation is accurate")
                return True
            else:
                print("❌ Distance calculation is inaccurate")
                return False
        else:
            print(f"❌ Distance calculation failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Distance calculation error: {e}")
        return False

def test_curve_control_point():
    """Test curve control point generation"""
    print("\n🎯 Testing curve control point generation...")
    try:
        payload = {
            "p1": {"x": 0.0, "y": 0.0, "z": 0.0},
            "p2": {"x": 50.0, "y": 50.0, "z": 0.0},
            "p3": {"x": 100.0, "y": 0.0, "z": 0.0}
        }
        
        response = requests.post(
            f'{BASE_URL}/api/geometry/curve_control_point',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            control_point = data['control_point']
            print(f"✅ Curve control point generated successfully")
            print(f"   Control point: ({control_point['x']:.2f}, {control_point['y']:.2f}, {control_point['z']:.2f})")
            print(f"   Calculation time: {data['calculation_time_ms']:.4f}ms")
            return True
        else:
            print(f"❌ Curve control point failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Curve control point error: {e}")
        return False

def test_bezier_points():
    """Test Bézier curve point generation"""
    print("\n📈 Testing Bézier curve point generation...")
    try:
        payload = {
            "start": {"x": 0.0, "y": 0.0, "z": 0.0},
            "control": {"x": 50.0, "y": 50.0, "z": 0.0},
            "end": {"x": 100.0, "y": 0.0, "z": 0.0},
            "num_points": 10
        }
        
        response = requests.post(
            f'{BASE_URL}/api/geometry/bezier_points',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            points = data['points']
            print(f"✅ Bézier curve points generated successfully")
            print(f"   Number of points: {len(points)} (requested: 10)")
            print(f"   First point: ({points[0]['x']:.2f}, {points[0]['y']:.2f}, {points[0]['z']:.2f})")
            print(f"   Last point: ({points[-1]['x']:.2f}, {points[-1]['y']:.2f}, {points[-1]['z']:.2f})")
            print(f"   Calculation time: {data['calculation_time_ms']:.4f}ms")
            return len(points) == 11  # num_points + 1 (inclusive range)
        else:
            print(f"❌ Bézier curve points failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Bézier curve points error: {e}")
        return False

def test_spatial_query():
    """Test building spatial query"""
    print("\n🌍 Testing spatial query...")
    try:
        payload = {
            "center": {"x": 0.0, "y": 0.0, "z": 0.0},
            "radius": 500.0,
            "exclude_ids": []
        }
        
        response = requests.post(
            f'{BASE_URL}/api/spatial/query_buildings',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Spatial query successful")
            print(f"   Buildings found: {data['count']}")
            print(f"   Query time: {data['query_time_ms']:.4f}ms")
            return True
        else:
            print(f"❌ Spatial query failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Spatial query error: {e}")
        return False

def test_performance_stats():
    """Test performance statistics"""
    print("\n📊 Testing performance statistics...")
    try:
        response = requests.get(f'{BASE_URL}/api/performance/stats', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Performance stats retrieved successfully")
            print(f"   Stats categories: {len(data['stats'])}")
            print(f"   Query time: {data['query_time_ms']:.4f}ms")
            return True
        else:
            print(f"❌ Performance stats failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Performance stats error: {e}")
        return False

def main():
    """Run all API tests"""
    print("🚀 Testing Satisfactory Layout Tool Standalone HTTP Server")
    print("=" * 60)
    
    # Wait a moment for server to fully start (if running in background)
    time.sleep(0.5)
    
    tests = [
        test_health_check,
        test_api_info,
        test_distance_calculation,
        test_curve_control_point,
        test_bezier_points,
        test_spatial_query,
        test_performance_stats,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(0.1)  # Brief pause between tests
    
    print("\n" + "=" * 60)
    print(f"🏁 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The standalone server is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the server status and configuration.")
        return 1

if __name__ == '__main__':
    import sys
    sys.exit(main())