// src/components/Canvas/PipeDrawingPreview.tsx - FIXED: Corrected points prop syntax, removed unused variables

import React, { useState, useEffect } from 'react';
import { Group, Line, Circle, Text as KonvaText, Rect } from 'react-konva';
const Text = KonvaText;
import { Point3D } from '../../types';
import { FLOOR_HEIGHT, PIXELS_PER_METER, PIPE_MAX_LENGTH } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { distance3D } from '../../utils/helpers';

interface PipeDrawingPreviewProps {
  mousePos: { x: number; y: number }; // Mouse position in pixels
  scale: number;
  position: { x: number; y: number };
  currentFloor: number;
}

export const PipeDrawingPreview: React.FC<PipeDrawingPreviewProps> = ({ mousePos, scale, position, currentFloor }) => {
  const { drawingState } = useLayoutStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Detect mobile device changes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Check if we're in pipe drawing mode
  if (!drawingState.drawingPipe || !drawingState.pipeStartSupport) {
    return null;
  }
  
  // Transform mouse position from pixels to world coordinates (meters)
  const worldX = (mousePos.x - position.x) / scale / PIXELS_PER_METER;
  const worldY = (mousePos.y - position.y) / scale / PIXELS_PER_METER;
  const previewSupport: Point3D = {
    x: Math.round(worldX * 2) / 2, // Snap to 0.5m grid
    y: Math.round(worldY * 2) / 2,
    z: currentFloor * FLOOR_HEIGHT
  };
  
  // Get the last support in the current path, or use the start support if path is empty or undefined
  const lastSupport = (drawingState.pipePath && drawingState.pipePath.length > 0) 
    ? drawingState.pipePath[drawingState.pipePath.length - 1] 
    : drawingState.pipeStartSupport;
    
  // Check constraints
  const segmentLength = distance3D(lastSupport, previewSupport);
  const isValidLength = segmentLength > 0.5 && segmentLength <= PIPE_MAX_LENGTH;
  
  // Calculate head lift
  const headLift = Math.abs(previewSupport.z - lastSupport.z);
  const needsPump = headLift > 10; // Extractors can push 10m
  
  const color = isValidLength ? (needsPump ? '#ff9900' : '#00b7ff') : '#ff0000';
  
  // Calculate line points for preview pipe
  const startX = lastSupport.x * PIXELS_PER_METER;
  const startY = lastSupport.y * PIXELS_PER_METER;
  const endX = previewSupport.x * PIXELS_PER_METER;
  const endY = previewSupport.y * PIXELS_PER_METER;
  
  return (
    <Group opacity={0.8} listening={false}>
      {/* Preview pipe to mouse cursor */}
      <Group>
        {/* Pipe shadow with depth */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={isMobile ? 22 : 18}
          lineCap="round"
          offsetY={4}
          blur={4}
          listening={false}
        />
        
        {/* Pipe outer edge with metallic appearance */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke={isValidLength ? '#2c3e50' : '#8b0000'}
          strokeWidth={isMobile ? 18 : 14}
          lineCap="round"
          listening={false}
          shadowBlur={isMobile ? 8 : 6}
          shadowColor={isValidLength ? 'rgba(44, 62, 80, 0.8)' : 'rgba(139, 0, 0, 0.8)'}
        />
        
        {/* Main pipe body with gradient */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke={color}
          strokeWidth={isMobile ? 16 : 12}
          lineCap="round"
          listening={false}
        />
        
        {/* Pipe highlight for 3D effect */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={isMobile ? 6 : 4}
          lineCap="round"
          offsetY={-4}
          listening={false}
        />
        
        {/* Flow direction indicator */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={isMobile ? 3 : 2}
          dash={[8, 4]}
          lineCap="round"
          listening={false}
        />
        
        {/* Dashed overlay to show it's preview */}
        <Line
          points={[startX, startY, endX, endY]}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={isMobile ? 14 : 10}
          dash={[12, 8]}
          lineCap="round"
          listening={false}
        />
      </Group>
      
      {/* Show existing pipeline path if any */}
      {drawingState.pipePath && drawingState.pipePath.length > 1 && (
        <Group opacity={0.6}>
          {drawingState.pipePath.slice(0, -1).map((support, index) => {
            const nextSupport = drawingState.pipePath![index + 1];
            if (!nextSupport) return null;
            
            return (
              <Group key={`path-${index}`}>
                {/* Path pipe shadow */}
                <Line
                  points={[support.x * PIXELS_PER_METER, support.y * PIXELS_PER_METER, nextSupport.x * PIXELS_PER_METER, nextSupport.y * PIXELS_PER_METER]}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={isMobile ? 20 : 16}
                  lineCap="round"
                  offsetY={3}
                  blur={3}
                  listening={false}
                />
                
                {/* Path pipe */}
                <Line
                  points={[support.x * PIXELS_PER_METER, support.y * PIXELS_PER_METER, nextSupport.x * PIXELS_PER_METER, nextSupport.y * PIXELS_PER_METER]}
                  stroke="#00b7ff"
                  strokeWidth={isMobile ? 16 : 12}
                  lineCap="round"
                  listening={false}
                />
                
                {/* Path pipe highlight */}
                <Line
                  points={[support.x * PIXELS_PER_METER, support.y * PIXELS_PER_METER, nextSupport.x * PIXELS_PER_METER, nextSupport.y * PIXELS_PER_METER]}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={isMobile ? 6 : 4}
                  lineCap="round"
                  offsetY={-4}
                  listening={false}
                />
              </Group>
            );
          })}
        </Group>
      )}
      
      {/* Show all supports in the current path */}
      {drawingState.pipePath && drawingState.pipePath.map((support, index) => {
        const isStartSupport = index === 0;
        
        return (
          <Group key={`path-support-${index}`} x={support.x * PIXELS_PER_METER} y={support.y * PIXELS_PER_METER} listening={false}>
            {/* Support glow for start support */}
            {isStartSupport && (
              <Circle
                radius={isMobile ? 22 : 18}
                stroke="#00b7ff"
                strokeWidth={3}
                fill="rgba(0, 183, 255, 0.1)"
                dash={[6, 4]}
                listening={false}
                shadowBlur={isMobile ? 12 : 10}
                shadowColor="#00b7ff"
              />
            )}
            
            {/* Support shadow */}
            <Circle
              radius={isMobile ? 12 : 8}
              fill="rgba(0,0,0,0.3)"
              offsetY={2}
              listening={false}
            />
            
            {/* Main support */}
            <Circle
              radius={isMobile ? 12 : 8}
              fill="linear-gradient(145deg, #34495e, #2c3e50)"
              stroke={isStartSupport ? '#00b7ff' : '#2c3e50'}
              strokeWidth={isStartSupport ? 3 : 2}
              listening={false}
              shadowBlur={isStartSupport ? (isMobile ? 10 : 8) : (isMobile ? 6 : 4)}
              shadowColor={isStartSupport ? '#00b7ff' : 'rgba(0,0,0,0.5)'}
            />
            
            {/* Support center */}
            <Circle
              radius={isMobile ? 6 : 4}
              fill="linear-gradient(145deg, #7f8c8d, #5d6d7e)"
              listening={false}
            />
            
            {/* Support highlight */}
            <Circle
              radius={isMobile ? 3 : 2}
              fill="rgba(255,255,255,0.6)"
              offsetY={-2}
              listening={false}
            />
          </Group>
        );
      })}
      
      {/* Preview support at mouse cursor */}
      <Group x={previewSupport.x * PIXELS_PER_METER} y={previewSupport.y * PIXELS_PER_METER} listening={false}>
        {/* Support shadow */}
        <Circle
          radius={isMobile ? 14 : 10}
          fill="rgba(0,0,0,0.3)"
          offsetY={2}
          listening={false}
        />
        
        {/* Support base with metallic appearance */}
        <Circle
          radius={isMobile ? 14 : 10}
          fill="linear-gradient(145deg, #34495e, #2c3e50)"
          stroke={color}
          strokeWidth={3}
          opacity={0.9}
          listening={false}
          shadowBlur={isMobile ? 10 : 8}
          shadowColor={color}
        />
        
        {/* Support center with glow */}
        <Circle
          radius={isMobile ? 8 : 6}
          fill={color}
          opacity={0.8}
          listening={false}
          shadowBlur={isMobile ? 8 : 6}
          shadowColor={color}
        />
        
        {/* Inner detail */}
        <Circle
          radius={isMobile ? 4 : 3}
          fill="rgba(255,255,255,0.6)"
          listening={false}
        />
      </Group>
      
      {/* Length indicator with enhanced mobile design */}
      {isValidLength && (
        <Group x={(lastSupport.x + previewSupport.x) / 2 * PIXELS_PER_METER} y={(lastSupport.y + previewSupport.y) / 2 * PIXELS_PER_METER - (isMobile ? 45 : 35)} listening={false}>
          <Rect
            x={isMobile ? -35 : -25}
            y={isMobile ? -15 : -12}
            width={isMobile ? 70 : 50}
            height={isMobile ? 26 : 20}
            fill="rgba(0,0,0,0.8)"
            cornerRadius={isMobile ? 8 : 6}
            stroke={color}
            strokeWidth={1}
            shadowBlur={isMobile ? 8 : 6}
            shadowColor={color}
            listening={false}
          />
          <Text
            text={`${segmentLength.toFixed(1)}m`}
            fontSize={isMobile ? 14 : 12}
            fill={color}
            fontWeight="bold"
            align="center"
            width={isMobile ? 70 : 50}
            offsetX={isMobile ? 35 : 25}
            y={isMobile ? -8 : -6}
            listening={false}
          />
        </Group>
      )}
      
      {/* Head lift indicator with enhanced mobile styling */}
      {headLift > 0 && (
        <Group x={(lastSupport.x + previewSupport.x) / 2 * PIXELS_PER_METER} y={(lastSupport.y + previewSupport.y) / 2 * PIXELS_PER_METER - (isMobile ? 15 : 10)} listening={false}>
          <Rect
            x={isMobile ? -60 : -40}
            y={isMobile ? -15 : -12}
            width={isMobile ? 120 : 80}
            height={isMobile ? 26 : 20}
            fill={needsPump ? "rgba(255, 153, 0, 0.9)" : "rgba(102, 102, 102, 0.8)"}
            cornerRadius={isMobile ? 8 : 6}
            stroke="#fff"
            strokeWidth={1}
            shadowBlur={isMobile ? 10 : 8}
            shadowColor={needsPump ? "rgba(255, 153, 0, 0.8)" : "rgba(102, 102, 102, 0.8)"}
            listening={false}
          />
          <Text
            text={`↕ ${headLift.toFixed(1)}m ${needsPump ? '⚠️ PUMP!' : ''}`}
            fontSize={isMobile ? 12 : 10}
            fill="white"
            fontWeight="bold"
            align="center"
            width={isMobile ? 120 : 80}
            offsetX={isMobile ? 60 : 40}
            y={isMobile ? -8 : -6}
            listening={false}
          />
        </Group>
      )}
      
      {/* Mode indicator with enhanced mobile design */}
      <Group x={previewSupport.x * PIXELS_PER_METER + (isMobile ? 20 : 15)} y={previewSupport.y * PIXELS_PER_METER - (isMobile ? 20 : 15)} listening={false}>
        <Rect
          x={-5}
          y={isMobile ? -18 : -15}
          width={isMobile ? 75 : 55}
          height={isMobile ? 26 : 20}
          fill="rgba(0, 183, 255, 0.9)"
          opacity={0.9}
          cornerRadius={isMobile ? 8 : 6}
          stroke="#fff"
          strokeWidth={1}
          shadowBlur={isMobile ? 10 : 8}
          shadowColor="rgba(0, 183, 255, 0.8)"
          listening={false}
        />
        <Text
          text="🚰 PIPE"
          fontSize={isMobile ? 13 : 11}
          fill="white"
          fontWeight="bold"
          align="center"
          width={isMobile ? 65 : 45}
          offsetX={isMobile ? 32.5 : 22.5}
          y={isMobile ? -12 : -10}
          listening={false}
        />
      </Group>
      
      {/* Invalid length warning with enhanced mobile styling */}
      {!isValidLength && (
        <Group x={previewSupport.x * PIXELS_PER_METER + (isMobile ? 20 : 15)} y={previewSupport.y * PIXELS_PER_METER + (isMobile ? 20 : 15)} listening={false}>
          <Rect
            x={-5}
            y={isMobile ? -18 : -15}
            width={segmentLength > PIPE_MAX_LENGTH ? (isMobile ? 110 : 95) : (isMobile ? 100 : 85)}
            height={isMobile ? 26 : 20}
            fill="#dc2626"
            opacity={0.9}
            cornerRadius={isMobile ? 8 : 6}
            stroke="#fff"
            strokeWidth={1}
            shadowBlur={isMobile ? 10 : 8}
            shadowColor="#dc2626"
            listening={false}
          />
          <Text
            text={segmentLength > PIPE_MAX_LENGTH ? 'TOO LONG' : 'TOO SHORT'}
            fontSize={isMobile ? 12 : 10}
            fill="white"
            fontWeight="bold"
            align="center"
            width={segmentLength > PIPE_MAX_LENGTH ? (isMobile ? 100 : 85) : (isMobile ? 90 : 75)}
            offsetX={(segmentLength > PIPE_MAX_LENGTH ? (isMobile ? 100 : 85) : (isMobile ? 90 : 75)) / 2}
            y={isMobile ? -12 : -10}
            listening={false}
          />
        </Group>
      )}

      {/* Mobile help indicator */}
      {isMobile && (
        <Group x={previewSupport.x * PIXELS_PER_METER - (isMobile ? 80 : 60)} y={previewSupport.y * PIXELS_PER_METER + (isMobile ? 50 : 40)} listening={false}>
          <Rect
            x={-5}
            y={-18}
            width={160}
            height={30}
            fill="rgba(0,0,0,0.8)"
            opacity={0.9}
            cornerRadius={8}
            stroke="#00b7ff"
            strokeWidth={1}
            shadowBlur={8}
            shadowColor="rgba(0, 183, 255, 0.8)"
            listening={false}
          />
          <Text
            text="📱 Tap to place pipe supports"
            fontSize={12}
            fill="#fff"
            fontWeight="bold"
            align="center"
            width={150}
            offsetX={75}
            y={-12}
            listening={false}
          />
        </Group>
      )}
      
      {/* Pump requirement indicator for mobile */}
      {isMobile && needsPump && (
        <Group x={previewSupport.x * PIXELS_PER_METER} y={previewSupport.y * PIXELS_PER_METER + 80} listening={false}>
          <Rect
            x={-80}
            y={-18}
            width={160}
            height={30}
            fill="rgba(255, 153, 0, 0.9)"
            opacity={0.9}
            cornerRadius={8}
            stroke="#fff"
            strokeWidth={1}
            shadowBlur={8}
            shadowColor="rgba(255, 153, 0, 0.8)"
            listening={false}
          />
          <Text
            text="⚠️ Head lift >10m requires pump"
            fontSize={12}
            fill="white"
            fontWeight="bold"
            align="center"
            width={150}
            offsetX={75}
            y={-12}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};