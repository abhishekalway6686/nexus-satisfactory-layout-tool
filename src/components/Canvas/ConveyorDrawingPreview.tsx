import React, { useState, useEffect } from 'react';
import { Group, Circle, Path, Text, Rect } from 'react-konva';
import { Point3D, ConveyorPole } from '../../types';
import { FLOOR_HEIGHT, PIXELS_PER_METER } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { generateConveyorPath, constrainPoint } from '../../utils/helpers';
import { calculateCurveControlPoint } from '../../logic/common/curveUtils';
import { ConveyorSegment } from '../../types';

interface ConveyorDrawingPreviewProps {
  mousePos: { x: number; y: number }; // Mouse position in pixels
  scale: number;
  position: { x: number; y: number };
  currentFloor: number;
}

// PERFORMANCE FIX: Add React.memo to prevent unnecessary re-renders
export const ConveyorDrawingPreview: React.FC<ConveyorDrawingPreviewProps> = React.memo(({ mousePos, scale, position, currentFloor }) => {
  const { drawingState, conveyorPoles, conveyorMode, mobileConstraintMode } = useLayoutStore();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [constraintMode, setConstraintMode] = useState<'none' | 'horizontal' | 'diagonal' | 'fixed'>('none');

  // Detect mobile device changes
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Reset constraint mode when switching to mobile to avoid confusion
      if (mobile && (isShiftPressed || isCtrlPressed)) {
        setIsShiftPressed(false);
        setIsCtrlPressed(false);
        setConstraintMode('none');
      }
    };
    
    window.addEventListener('resize', checkMobile);
    checkMobile();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [isShiftPressed, isCtrlPressed]);

  // Track modifier keys (desktop only)
  useEffect(() => {
    if (isMobile) return; // Skip keyboard events on mobile
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
      if (e.key === 'Control') setIsCtrlPressed(true);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
      if (e.key === 'Control') setIsCtrlPressed(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMobile]);

  // Handle mobile constraint modes
  const handleMobileConstraintChange = (mode: 'none' | 'horizontal' | 'diagonal' | 'fixed') => {
    setConstraintMode(mode);
    // Simulate keyboard states for consistency with desktop logic
    switch (mode) {
      case 'horizontal':
        setIsShiftPressed(true);
        setIsCtrlPressed(false);
        break;
      case 'diagonal':
        setIsShiftPressed(false);
        setIsCtrlPressed(true);
        break;
      case 'fixed':
        setIsShiftPressed(true);
        setIsCtrlPressed(true);
        break;
      default:
        setIsShiftPressed(false);
        setIsCtrlPressed(false);
        break;
    }
  };

  // Fallback: Update constraint mode based on layout store (if provided by MobileDrawingControls)
  useEffect(() => {
    // Assuming layoutStore might have a mobileConstraintMode state
    if (isMobile && mobileConstraintMode !== constraintMode) {
      handleMobileConstraintChange(mobileConstraintMode as 'none' | 'horizontal' | 'diagonal' | 'fixed');
    }
  }, [isMobile, mobileConstraintMode, constraintMode]);
  
  if (!drawingState.isDrawing || !drawingState.currentPath || drawingState.currentPath.length < 1) {
    return null;
  }
  
  // Transform mouse position from pixels to world coordinates (meters)
  const worldX = (mousePos.x - position.x) / scale / PIXELS_PER_METER;
  const worldY = (mousePos.y - position.y) / scale / PIXELS_PER_METER;
  const mousePosMeters: Point3D = {
    x: Math.round(worldX * 2) / 2, // Snap to 0.5m grid
    y: Math.round(worldY * 2) / 2,
    z: currentFloor * FLOOR_HEIGHT,
  };
  
  // Create a temporary poles object that includes all poles from the current path
  const tempPoles = { ...conveyorPoles };
  drawingState.currentPath.forEach(pole => {
    tempPoles[pole.id] = pole;
  });
  
  // Get the last pole in the path to apply constraints from
  const lastPole = drawingState.currentPath[drawingState.currentPath.length - 1];
  
  // Apply constraints based on keyboard modifiers or mobile constraint mode
  const constrainedPos = constrainPoint(
    { x: lastPole.x, y: lastPole.y },
    mousePosMeters,
    isShiftPressed,
    isCtrlPressed
  );
  
  // Add preview pole at constrained position
  const previewPole: ConveyorPole = {
    id: 'preview-pole',
    x: Math.round(constrainedPos.x * 2) / 2, // Snap to 0.5m grid
    y: Math.round(constrainedPos.y * 2) / 2,
    z: currentFloor * FLOOR_HEIGHT,
    floor: currentFloor
  };
  tempPoles[previewPole.id] = previewPole;
  
  // Build the complete path including the preview
  const fullPath = [...drawingState.currentPath, previewPole];
  
  return (
    <Group opacity={0.8}>
      {/* Enhanced Mobile Instructions Overlay */}
      {isMobile && drawingState.isDrawing && (
        <Group x={20} y={20} listening={false}>
          <Rect
            x={0}
            y={0}
            width={200}
            height={120}
            fill="rgba(0,0,0,0.85)"
            cornerRadius={12}
            stroke="#fa9549"
            strokeWidth={2}
            shadowBlur={12}
            shadowColor="rgba(250, 149, 73, 0.6)"
            listening={false}
          />
          <Text
            x={10}
            y={10}
            text="⚙️ CONVEYOR BELT"
            fontSize={16}
            fill="#fa9549"
            fontWeight="bold"
            listening={false}
          />
          <Text
            x={10}
            y={35}
            text={`Poles: ${drawingState.currentPath.length}`}
            fontSize={14}
            fill="#fff"
            listening={false}
          />
          <Text
            x={10}
            y={55}
            text="📱 Tap canvas to place poles"
            fontSize={12}
            fill="#ccc"
            listening={false}
          />
          <Text
            x={10}
            y={75}
            text="🎯 Tap poles to connect"
            fontSize={12}
            fill="#ccc"
            listening={false}
          />
          <Text
            x={10}
            y={95}
            text="✅ Use bottom controls to finish"
            fontSize={12}
            fill="#ccc"
            listening={false}
          />
        </Group>
      )}

      {/* Render all path segments including preview with enhanced mobile styling */}
      {fullPath.length > 1 && fullPath.map((pole, index) => {
        if (index === 0) return null;
        
        const prevPole = fullPath[index - 1];
        const isPreviewSegment = pole.id === 'preview-pole' || prevPole.id === 'preview-pole';
        
        // Determine segment type
        let segmentType: 'straight' | 'turn' = 'straight';
        let controlPoint = null;
        
        // Check for turn (only in default mode and not for preview segments)
        // Also skip curves if shift or ctrl is pressed
        if (!isPreviewSegment && index > 1 && conveyorMode === 'default' && !isShiftPressed && !isCtrlPressed) {
          const prevPrevPole = fullPath[index - 2];
          
          const angle1 = Math.atan2(prevPole.y - prevPrevPole.y, prevPole.x - prevPrevPole.x);
          const angle2 = Math.atan2(pole.y - prevPole.y, pole.x - prevPole.x);
          
          let angleDiff = angle2 - angle1;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          
          if (Math.abs(angleDiff) > 0.785) { // ~45 degrees
            segmentType = 'turn';
            // Calculate proper control point for smooth curve
            controlPoint = calculateCurveControlPoint(prevPrevPole, prevPole, pole);
          }
        }
        
        // Create temporary segment for path generation
        const segment: ConveyorSegment = {
          id: `preview-segment-${index}`,
          type: segmentType,
          startPole: prevPole.id,
          endPole: pole.id,
          length: 0,
          controlPoints: controlPoint ? [controlPoint] : undefined
        };
        
        const path = generateConveyorPath(segment, tempPoles);
        const strokeWidth = isMobile ? 18 : 14;
        
        return (
          <React.Fragment key={`preview-segment-${index}`}>
            {/* Enhanced belt shadow with depth */}
            <Path
              data={path}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={strokeWidth + 6}
              lineCap="round"
              lineJoin="round"
              offsetY={4}
              blur={4}
              listening={false}
            />
            
            {/* Belt edges with metallic appearance */}
            <Path
              data={path}
              stroke="#654321"
              strokeWidth={strokeWidth + 2}
              lineCap="round"
              lineJoin="round"
              listening={false}
              shadowBlur={6}
              shadowColor="rgba(101, 67, 33, 0.8)"
            />
            
            {/* Main belt surface with gradient effect */}
            <Path
              data={path}
              stroke="#8B4513"
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
            
            {/* Belt highlight for 3D effect */}
            <Path
              data={path}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={Math.max(4, strokeWidth / 3)}
              lineCap="round"
              lineJoin="round"
              offsetY={-3}
              listening={false}
            />
            
            {/* Belt texture pattern */}
            <Path
              data={path}
              stroke="rgba(101, 67, 33, 0.6)"
              strokeWidth={strokeWidth - 2}
              dash={[8, 6]}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
            
            {/* Preview indicator overlay */}
            <Path
              data={path}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={strokeWidth - 2}
              dash={[16, 12]}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
            
            {/* Show turn indicator on curves with enhanced mobile styling */}
            {segmentType === 'turn' && controlPoint && !isPreviewSegment && (
              <Group x={prevPole.x * PIXELS_PER_METER} y={prevPole.y * PIXELS_PER_METER}>
                <Circle
                  radius={isMobile ? 12 : 8}
                  fill="rgba(255, 215, 0, 0.6)"
                  blur={4}
                  listening={false}
                />
                <Circle
                  radius={isMobile ? 8 : 6}
                  fill="#ffd700"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  listening={false}
                />
              </Group>
            )}
          </React.Fragment>
        );
      })}
      
      {/* Show poles in path with enhanced mobile styling */}
      {fullPath.map((pole, index) => {
        // Don't show preview pole, but show anchor poles
        if (pole.id === 'preview-pole') return null;
        
        const isStartPole = index === 0;
        // Check if pole has isAnchor property (some poles might not have it)
        const isAnchor = 'isAnchor' in pole ? pole.isAnchor : false;
        const poleRadius = isMobile ? 14 : 10;
        
        return (
          <Group key={`preview-pole-${pole.id}`} x={pole.x * PIXELS_PER_METER} y={pole.y * PIXELS_PER_METER}>
            {/* Start pole special indicator */}
            {isStartPole && (
              <Circle
                radius={poleRadius + 6}
                stroke="#00ff00"
                strokeWidth={3}
                fill="rgba(0, 255, 0, 0.1)"
                dash={[8, 6]}
                listening={false}
                shadowBlur={10}
                shadowColor="#00ff00"
              />
            )}
            
            {/* Enhanced pole shadow */}
            <Circle
              radius={poleRadius}
              fill="rgba(0,0,0,0.4)"
              offsetY={3}
              blur={2}
              listening={false}
            />
            
            {/* Main pole with enhanced styling */}
            <Circle
              radius={poleRadius}
              fill="linear-gradient(145deg, #666, #444)"
              stroke={isStartPole ? '#00ff00' : isAnchor ? '#fa9549' : '#333'}
              strokeWidth={isStartPole ? 4 : 3}
              listening={false}
              shadowBlur={isStartPole ? 12 : 6}
              shadowColor={isStartPole ? '#00ff00' : 'rgba(0,0,0,0.5)'}
            />
            
            {/* Pole center with metallic appearance */}
            <Circle
              radius={poleRadius - 4}
              fill="linear-gradient(145deg, #999, #777)"
              listening={false}
            />
            
            {/* Enhanced pole highlight */}
            <Circle
              radius={poleRadius - 8}
              fill="rgba(255,255,255,0.7)"
              offsetY={-3}
              listening={false}
            />
          </Group>
        );
      })}
      
      {/* Show preview pole at mouse position with enhanced mobile styling */}
      {previewPole && (
        <Group x={previewPole.x * PIXELS_PER_METER} y={previewPole.y * PIXELS_PER_METER}>
          <Circle
            radius={isMobile ? 18 : 12}
            fill="rgba(0, 255, 0, 0.3)"
            stroke="#00ff00"
            strokeWidth={4}
            dash={[8, 4]}
            opacity={0.9}
            listening={false}
            shadowBlur={8}
            shadowColor="#00ff00"
          />
          <Circle
            radius={isMobile ? 10 : 6}
            fill="#00ff00"
            opacity={0.8}
            listening={false}
          />
        </Group>
      )}
      
      {/* Enhanced path info display with mobile optimization */}
      {fullPath.length > 1 && (
        <Group x={20} y={160}>
          <Rect
            x={0}
            y={0}
            width={isMobile ? 160 : 140}
            height={isMobile ? 40 : 35}
            fill="rgba(0,0,0,0.85)"
            cornerRadius={8}
            stroke="#8B4513"
            strokeWidth={2}
            shadowBlur={8}
            shadowColor="rgba(139, 69, 19, 0.6)"
            listening={false}
          />
          <Text
            x={10}
            y={isMobile ? 12 : 10}
            text={`Poles: ${fullPath.filter(p => p.id !== 'preview-pole').length}`}
            fontSize={isMobile ? 16 : 14}
            fill="#fa9549"
            fontWeight="bold"
            listening={false}
          />
        </Group>
      )}
      
      {/* Enhanced constraint mode indicator with mobile support */}
      {(isShiftPressed || isCtrlPressed || constraintMode !== 'none') && (
        <Group x={20} y={210}>
          <Rect
            x={0}
            y={0}
            width={isMobile ? 200 : 180}
            height={isMobile ? 35 : 30}
            fill="rgba(0,0,0,0.85)"
            cornerRadius={8}
            stroke="#00ffff"
            strokeWidth={2}
            shadowBlur={8}
            shadowColor="rgba(0, 255, 255, 0.6)"
            listening={false}
          />
          <Text
            x={10}
            y={isMobile ? 8 : 6}
            text={
              (isShiftPressed && isCtrlPressed) || constraintMode === 'fixed' ? 
                '📏 Fixed 8m segments' :
              isShiftPressed || constraintMode === 'horizontal' ? 
                '📏 Horizontal/Vertical only' :
              isCtrlPressed || constraintMode === 'diagonal' ? 
                '📐 45° angle snap' : ''
            }
            fontSize={isMobile ? 14 : 12}
            fill="#00ffff"
            fontWeight="bold"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.scale === nextProps.scale &&
    prevProps.currentFloor === nextProps.currentFloor &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    Math.abs(prevProps.mousePos.x - nextProps.mousePos.x) < 2 &&
    Math.abs(prevProps.mousePos.y - nextProps.mousePos.y) < 2
  );
});