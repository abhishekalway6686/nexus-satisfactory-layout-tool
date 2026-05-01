// src/components/StickyNotes/StickyNoteShape.tsx - Enhanced with sci-fi styling and better readability

import React, { useState, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { StickyNote } from '../../types';
import { PIXELS_PER_METER, GRID_SIZE } from '../../constants';
import { useLayoutStore } from '../../store/layoutStore';
import { snapToGrid } from '../../utils/helpers';

interface StickyNoteShapeProps {
  note: StickyNote;
  isSelected: boolean;
  onSelect?: () => void;
  onDragEnd?: (e: any) => void;
}

// Color scheme for better text readability based on note background color
const getTextColors = (noteColor: string) => {
  // Use dark text for light backgrounds, light text for dark backgrounds
  const textColorMap: Record<string, { primary: string; secondary: string; header: string }> = {
    '#ffeb3b': { primary: '#1a1a1a', secondary: '#333333', header: '#000000' }, // Yellow - dark text
    '#4caf50': { primary: '#ffffff', secondary: '#e0e0e0', header: '#ffffff' }, // Green - light text
    '#2196f3': { primary: '#ffffff', secondary: '#e0e0e0', header: '#ffffff' }, // Blue - light text
    '#ff9800': { primary: '#1a1a1a', secondary: '#333333', header: '#000000' }, // Orange - dark text
    '#e91e63': { primary: '#ffffff', secondary: '#e0e0e0', header: '#ffffff' }, // Pink - light text
  };
  return textColorMap[noteColor] || { primary: '#1a1a1a', secondary: '#333333', header: '#000000' };
};

// Parse markdown and return formatted text components with improved readability
const parseMarkdown = (text: string, x: number, y: number, width: number, noteColor: string) => {
  const lines = text.split('\n');
  const textElements: React.ReactElement[] = [];
  let currentY = y;
  const textColors = getTextColors(noteColor);
  const padding = 4; // Inner padding for text

  lines.forEach((line, lineIndex) => {
    // Skip empty lines but add spacing
    if (!line.trim()) {
      currentY += 8;
      return;
    }

    // Headers (# ## ###)
    const headerMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const fontSize = level === 1 ? 16 : level === 2 ? 14 : 13;
      const lineHeight = fontSize + 8;

      textElements.push(
        <Text
          key={`line-${lineIndex}`}
          x={x + padding}
          y={currentY}
          width={width - (padding * 2)}
          text={content}
          fontSize={fontSize}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
          fontStyle="bold"
          fill={textColors.header}
          wrap="word"
          lineHeight={1.3}
          listening={false}
        />
      );
      currentY += lineHeight;
      return;
    }

    // Bullet points (- or *)
    const bulletMatch = line.match(/^[\-\*]\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[1];

      // Bullet point indicator
      textElements.push(
        <Text
          key={`bullet-${lineIndex}`}
          x={x + padding}
          y={currentY}
          text="•"
          fontSize={12}
          fontFamily="Inter, Arial, sans-serif"
          fill={textColors.primary}
          listening={false}
        />
      );

      // Bullet content
      textElements.push(
        <Text
          key={`line-${lineIndex}`}
          x={x + padding + 12}
          y={currentY}
          width={width - padding - 16}
          text={content}
          fontSize={12}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
          fill={textColors.primary}
          wrap="word"
          lineHeight={1.4}
          listening={false}
        />
      );
      currentY += 18;
      return;
    }

    // Process inline formatting (bold, italic)
    // For simplicity and better rendering, we'll render the whole line with detected formatting
    let displayText = line;
    let fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic' = 'normal';

    // Check for bold (**text**)
    const hasBold = /\*\*(.+?)\*\*/.test(line);
    // Check for italic (*text*)
    const hasItalic = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/.test(line);

    // Remove markdown syntax for display
    displayText = displayText.replace(/\*\*(.+?)\*\*/g, '$1'); // Remove bold markers
    displayText = displayText.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1'); // Remove italic markers

    // Determine font style (simplified - applies to whole line if any formatting found)
    if (hasBold && hasItalic) {
      fontStyle = 'bold italic';
    } else if (hasBold) {
      fontStyle = 'bold';
    } else if (hasItalic) {
      fontStyle = 'italic';
    }

    textElements.push(
      <Text
        key={`line-${lineIndex}`}
        x={x + padding}
        y={currentY}
        width={width - (padding * 2)}
        text={displayText}
        fontSize={12}
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
        fontStyle={fontStyle}
        fill={textColors.primary}
        wrap="word"
        lineHeight={1.4}
        listening={false}
      />
    );

    // Estimate line height based on text wrapping
    const estimatedLines = Math.ceil(displayText.length * 7 / (width - padding * 2));
    currentY += Math.max(16, estimatedLines * 16);
  });

  return textElements;
};

export const StickyNoteShape: React.FC<StickyNoteShapeProps> = ({ 
  note, 
  isSelected, 
  onSelect, 
  onDragEnd 
}) => {
  const { selectedTool, updateStickyNote } = useLayoutStore();
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const groupRef = useRef<any>(null);
  
  const pixelWidth = note.width * PIXELS_PER_METER;
  const pixelHeight = note.height * PIXELS_PER_METER;
  
  const handleResizeStart = (e: any) => {
    e.cancelBubble = true;
    setIsResizing(true);
  };
  
  const handleResizeMove = (e: any) => {
    if (!isResizing) return;
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    const groupPos = groupRef.current.getAbsolutePosition();
    
    // Calculate raw size in world coordinates
    const { gridSnappingEnabled } = useLayoutStore.getState();
    const rawWidth = (pointer.x - groupPos.x) / PIXELS_PER_METER;
    const rawHeight = (pointer.y - groupPos.y) / PIXELS_PER_METER;
    const newWidth = Math.max(4, snapToGrid(rawWidth, GRID_SIZE, gridSnappingEnabled));
    const newHeight = Math.max(3, snapToGrid(rawHeight, GRID_SIZE, gridSnappingEnabled));
    
    updateStickyNote(note.id, {
      width: newWidth,
      height: newHeight
    });
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
  };
  
  const handleDoubleClick = (e: any) => {
    e.cancelBubble = true;
    setIsEditingText(true);
    
    // Create a temporary input for text editing
    const stage = e.target.getStage();
    const container = stage.container();
    const groupPos = groupRef.current.getAbsolutePosition();
    
    // Get the appropriate text color for this note background
    const textColors = getTextColors(note.color);

    const input = document.createElement('textarea');
    input.value = note.text;
    input.style.position = 'absolute';
    input.style.left = `${groupPos.x + 12}px`;
    input.style.top = `${groupPos.y + 12}px`;
    input.style.width = `${pixelWidth - 24}px`;
    input.style.height = `${pixelHeight - 24}px`;
    input.style.fontSize = '13px';
    input.style.fontFamily = 'Inter, Arial, sans-serif';
    // Use the note's actual color for the background instead of glass blur
    input.style.background = colorScheme.bg;
    input.style.border = `2px solid ${colorScheme.border}`;
    input.style.borderRadius = '8px';
    input.style.padding = '8px';
    // Use the appropriate text color based on the note's background
    input.style.color = textColors.primary;
    input.style.resize = 'none';
    input.style.zIndex = '1000';
    input.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${colorScheme.shadow}`;
    input.placeholder = 'Supports **bold**, *italic*, # headers';
    
    container.parentElement?.appendChild(input);
    input.focus();
    input.select();
    
    const handleBlur = () => {
      updateStickyNote(note.id, { text: input.value });
      input.remove();
      setIsEditingText(false);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleBlur();
      } else if (e.key === 'Escape') {
        input.remove();
        setIsEditingText(false);
      }
    };
    
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);
  };
  
  React.useEffect(() => {
    if (isResizing) {
      const stage = groupRef.current?.getStage();
      if (stage) {
        const handleMouseMove = (e: any) => handleResizeMove(e);
        const handleMouseUp = () => handleResizeEnd();
        
        stage.on('mousemove', handleMouseMove);
        stage.on('mouseup', handleMouseUp);
        
        return () => {
          stage.off('mousemove', handleMouseMove);
          stage.off('mouseup', handleMouseUp);
        };
      }
    }
  }, [isResizing]);
  
  // Enhanced color scheme with better contrast and readability
  // Using higher opacity backgrounds for better text legibility
  const noteColors = {
    '#ffeb3b': { bg: 'rgba(255, 235, 59, 0.92)', border: 'rgba(230, 210, 40, 1)', shadow: 'rgba(255, 235, 59, 0.5)' }, // Yellow - high opacity for dark text
    '#4caf50': { bg: 'rgba(56, 142, 60, 0.92)', border: 'rgba(46, 125, 50, 1)', shadow: 'rgba(76, 175, 80, 0.5)' },   // Green - darker for light text
    '#2196f3': { bg: 'rgba(25, 118, 210, 0.92)', border: 'rgba(21, 101, 192, 1)', shadow: 'rgba(33, 150, 243, 0.5)' }, // Blue - darker for light text
    '#ff9800': { bg: 'rgba(255, 167, 38, 0.92)', border: 'rgba(245, 124, 0, 1)', shadow: 'rgba(255, 152, 0, 0.5)' },  // Orange - high opacity for dark text
    '#e91e63': { bg: 'rgba(194, 24, 91, 0.92)', border: 'rgba(173, 20, 87, 1)', shadow: 'rgba(233, 30, 99, 0.5)' },   // Pink - darker for light text
  };

  const colorScheme = noteColors[note.color as keyof typeof noteColors] || noteColors['#ffeb3b'];
  
  return (
    <Group
      ref={groupRef}
      x={note.x * PIXELS_PER_METER}
      y={note.y * PIXELS_PER_METER}
      draggable={selectedTool === 'select' && !isResizing && !isEditingText}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onDblClick={handleDoubleClick}
      rotation={note.rotation}
    >
      {/* Optimized shadow */}
      <Rect
        x={2}
        y={2}
        width={pixelWidth}
        height={pixelHeight}
        fill="rgba(0,0,0,0.25)"
        cornerRadius={8}
        listening={false}
      />
      
      {/* Main note background */}
      <Rect
        x={0}
        y={0}
        width={pixelWidth}
        height={pixelHeight}
        fill={colorScheme.bg}
        stroke={isSelected ? '#fa9549' : colorScheme.border}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={8}
        shadowBlur={isSelected ? 8 : 4}
        shadowColor={isSelected ? colorScheme.shadow : 'rgba(0,0,0,0.15)'}
        shadowOffsetY={isSelected ? 0 : 1}
      />
      
      {/* Subtle highlight overlay */}
      <Rect
        x={1}
        y={1}
        width={pixelWidth - 2}
        height={pixelHeight - 2}
        fill="rgba(255,255,255,0.08)"
        cornerRadius={7}
        listening={false}
      />
      
      {/* Simplified folded corner */}
      <Group>
        {/* Folded corner */}
        <Rect
          x={pixelWidth - 14}
          y={0}
          width={14}
          height={14}
          fill="rgba(0,0,0,0.15)"
          cornerRadius={[0, 8, 0, 0]}
          listening={false}
        />
        
        {/* Corner highlight */}
        <Rect
          x={pixelWidth - 14}
          y={0}
          width={14}
          height={14}
          fill="rgba(255,255,255,0.1)"
          cornerRadius={[0, 8, 0, 14]}
          listening={false}
        />
      </Group>
      
      {/* Simplified corner accents */}
      <Group opacity={0.5}>
        {/* Top-left corner accent */}
        <Rect x={6} y={6} width={8} height={1} fill={colorScheme.border} listening={false} />
        <Rect x={6} y={6} width={1} height={8} fill={colorScheme.border} listening={false} />
      </Group>
      
      {/* Rendered markdown text with better contrast */}
      {!isEditingText && parseMarkdown(note.text, 12, 12, pixelWidth - 24, note.color)}
      
      {/* Editing indicator with enhanced styling */}
      {isEditingText && (
        <Rect
          x={0}
          y={0}
          width={pixelWidth}
          height={pixelHeight}
          stroke="#fa9549"
          strokeWidth={3}
          dash={[8, 4]}
          fill="transparent"
          cornerRadius={8}
          shadowBlur={8}
          shadowColor="rgba(250, 149, 73, 0.5)"
        />
      )}
      
      {/* Optimized resize handle when selected */}
      {isSelected && !isEditingText && (
        <Group>
          {/* Resize handle background */}
          <Rect
            x={pixelWidth - 14}
            y={pixelHeight - 14}
            width={14}
            height={14}
            fill="rgba(250, 149, 73, 0.4)"
            cornerRadius={3}
            stroke="#fa9549"
            strokeWidth={1}
            onMouseDown={handleResizeStart}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'se-resize';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
          />
          
          {/* Simple resize icon */}
          <Group x={pixelWidth - 10} y={pixelHeight - 10}>
            <Rect x={0} y={0} width={1} height={1} fill="#fa9549" />
            <Rect x={2} y={2} width={1} height={1} fill="#fa9549" />
            <Rect x={4} y={4} width={1} height={1} fill="#fa9549" />
            <Rect x={0} y={4} width={1} height={1} fill="#fa9549" />
            <Rect x={4} y={0} width={1} height={1} fill="#fa9549" />
          </Group>
          
          {/* Simplified instructions */}
          <Text
            x={12}
            y={pixelHeight + 6}
            text="Double-click to edit • Drag corner to resize"
            fontSize={9}
            fill="#fa9549"
            opacity={0.8}
            width={pixelWidth * 2}
            listening={false}
          />
        </Group>
      )}
      
      {/* Markdown help tooltip - positioned within note bounds */}
      {isSelected && !isEditingText && (
        <Group>
          {/* Help background - clipped to note width */}
          <Rect
            x={0}
            y={-28}
            width={Math.min(pixelWidth, 220)}
            height={22}
            fill="rgba(20, 20, 30, 0.95)"
            cornerRadius={4}
            stroke="rgba(250, 149, 73, 0.4)"
            strokeWidth={1}
            listening={false}
          />

          {/* Help text - truncated to fit */}
          <Text
            x={6}
            y={-24}
            text={pixelWidth >= 180 ? "# Header  **bold**  *italic*  - list" : "# **bold** *italic* -"}
            fontSize={10}
            fontFamily="'Consolas', 'Monaco', monospace"
            fill="#e2e8f0"
            width={Math.min(pixelWidth - 12, 208)}
            ellipsis={true}
            listening={false}
          />
        </Group>
      )}
      
      {/* Simplified status indicator when selected */}
      {isSelected && (
        <Group opacity={0.9}>
          <Rect
            x={-1}
            y={-1}
            width={6}
            height={6}
            fill="#fa9549"
            cornerRadius={3}
            listening={false}
          />
          <Rect
            x={1}
            y={1}
            width={2}
            height={2}
            fill="#ffffff"
            cornerRadius={1}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};