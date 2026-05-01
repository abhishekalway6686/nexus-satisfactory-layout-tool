import { useEffect, useCallback, useState } from 'react';
import { useLayoutStore } from '../store/layoutStore';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'tool' | 'drawing' | 'view' | 'edit';
}

export const useKeyboardShortcuts = () => {
  const [activeModifiers, setActiveModifiers] = useState({
    shift: false,
    ctrl: false,
    alt: false
  });

  const {
    selectedTool,
    setSelectedTool,
    showGrid,
    toggleGrid,
    showKeyboardShortcuts,
    toggleKeyboardShortcuts,
    debugOverlay,
    toggleDebugOverlay,
    showBuildingPalette,
    toggleBuildingPalette,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteBuilding,
    deletePole,
    deletePipeSupport,
    deleteStickyNote,
    deleteRailwayNode,
    deleteConveyorLift,
    deletePipeFloorConnection,
    deleteFoundation,
    deleteWall,
    deletePipeSegment,
    deleteConveyorSegment,
    deleteRailwaySegment,
    selectedBuilding,
    selectedPole,
    selectedPipeSupport,
    selectedStickyNote,
    selectedRailwayNode,
    selectedRailwaySegment,
    selectedConveyorLift,
    selectedPipeFloorConnection,
    selectedFoundation,
    selectedWall,
    selectedPipeSegment,
    selectedConveyorSegment,
    setSelectedPipeSegment,
    setSelectedConveyorSegment,
    setSelectedRailwaySegment,
    rotateBuilding,
    setDrawingState,
    drawingState,
    conveyorMode,
    setConveyorMode,
    cancelDrawing,
    finishDrawingConveyor,
    finishPipeDrawing,
    finishRailwayDrawing,
    clearSelection,
    currentFloor,
    setCurrentFloor,
    toggleProductionOverlays,
    toggleProductionPanel
  } = useLayoutStore();

  // Get any selected item
  const getSelectedItem = useCallback(() => {
    if (selectedBuilding) return { type: 'building', id: selectedBuilding };
    if (selectedPole) return { type: 'pole', id: selectedPole };
    if (selectedPipeSupport) return { type: 'pipeSupport', id: selectedPipeSupport };
    if (selectedStickyNote) return { type: 'stickyNote', id: selectedStickyNote };
    if (selectedRailwayNode) return { type: 'railwayNode', id: selectedRailwayNode };
    if (selectedConveyorLift) return { type: 'conveyorLift', id: selectedConveyorLift };
    if (selectedPipeFloorConnection) return { type: 'pipeFloorConnection', id: selectedPipeFloorConnection };
    if (selectedFoundation) return { type: 'foundation', id: selectedFoundation };
    if (selectedWall) return { type: 'wall', id: selectedWall };
    if (selectedPipeSegment) return { type: 'pipeSegment', id: selectedPipeSegment };
    if (selectedConveyorSegment) return { type: 'conveyorSegment', id: selectedConveyorSegment };
    if (selectedRailwaySegment) return { type: 'railwaySegment', id: selectedRailwaySegment };
    return null;
  }, [
    selectedBuilding, selectedPole, selectedPipeSupport, selectedStickyNote,
    selectedRailwayNode, selectedConveyorLift, selectedPipeFloorConnection,
    selectedFoundation, selectedWall, selectedPipeSegment, selectedConveyorSegment, selectedRailwaySegment
  ]);

  // Delete selected item
  const deleteSelected = useCallback(() => {
    const selected = getSelectedItem();
    if (!selected) return;

    switch (selected.type) {
      case 'building':
        deleteBuilding(selected.id);
        break;
      case 'pipeSupport':
        deletePipeSupport(selected.id);
        break;
      case 'stickyNote':
        deleteStickyNote(selected.id);
        break;
      case 'railwayNode':
        deleteRailwayNode(selected.id);
        break;
      case 'conveyorLift':
        deleteConveyorLift(selected.id);
        break;
      case 'pipeFloorConnection':
        deletePipeFloorConnection(selected.id);
        break;
      case 'foundation':
        deleteFoundation(selected.id);
        break;
      case 'wall':
        deleteWall(selected.id);
        break;
      case 'pipeSegment':
        deletePipeSegment(selected.id);
        setSelectedPipeSegment(null);
        break;
      case 'conveyorSegment':
        deleteConveyorSegment(selected.id);
        setSelectedConveyorSegment(null);
        break;
      case 'railwaySegment':
        deleteRailwaySegment(selected.id);
        setSelectedRailwaySegment(null);
        break;
    }
  }, [
    getSelectedItem, deleteBuilding, deletePole, deletePipeSupport,
    deleteStickyNote, deleteRailwayNode, deleteConveyorLift,
    deletePipeFloorConnection, deleteFoundation, deleteWall,
    deletePipeSegment, setSelectedPipeSegment,
    deleteConveyorSegment, setSelectedConveyorSegment,
    deleteRailwaySegment, setSelectedRailwaySegment
  ]);

  // Finish current drawing operation
  // NOTE: We read the state directly from the store to avoid stale closure issues.
  // If we used the captured `drawingState`, pressing Enter quickly after finishing
  // a railway could use an old state value and incorrectly trigger another finish.
  const finishDrawing = useCallback(() => {
    const currentState = useLayoutStore.getState().drawingState;
    if (currentState.isDrawing) {
      finishDrawingConveyor();
    } else if (currentState.drawingPipe) {
      finishPipeDrawing();
    } else if (currentState.drawingRailway) {
      finishRailwayDrawing();
    }
  }, [finishDrawingConveyor, finishPipeDrawing, finishRailwayDrawing]);

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Tool switching
    { key: 'q', action: () => setSelectedTool('select'), description: 'Select tool', category: 'tool' },
    { key: 'w', action: () => setSelectedTool('move'), description: 'Move tool', category: 'tool' },
    { key: 'e', action: () => {
      if (selectedBuilding) {
        rotateBuilding(selectedBuilding);
      } else {
        setSelectedTool('rotate');
      }
    }, description: 'Rotate selected building / Rotate tool', category: 'tool' },
    { key: 'r', action: () => {
      if (drawingState.isDrawing) {
        setConveyorMode(conveyorMode === 'default' ? 'straight' : 'default');
      } else {
        setSelectedTool('railway');
      }
    }, description: 'Railway tool / Toggle conveyor mode (during drawing)', category: 'tool' },
    { key: 't', action: () => setSelectedTool('delete'), description: 'Delete tool', category: 'tool' },
    { key: 'b', action: () => toggleBuildingPalette(), description: 'Toggle building palette', category: 'view' },

    // Drawing operations
    { key: 'Enter', action: finishDrawing, description: 'Finish current drawing', category: 'drawing' },
    { key: 'f', action: finishDrawing, description: 'Finish current drawing', category: 'drawing' },
    { key: 'Escape', action: () => {
      cancelDrawing();
      clearSelection();
    }, description: 'Cancel drawing/Clear selection', category: 'drawing' },

    // View controls
    { key: 'g', action: () => toggleGrid(), description: 'Toggle grid', category: 'view' },
    { key: 'h', action: () => toggleKeyboardShortcuts(), description: 'Toggle help/shortcuts panel', category: 'view' },
    { key: 'd', ctrl: true, action: () => toggleDebugOverlay(), description: 'Toggle debug overlay', category: 'view' },
    { key: 'o', action: () => toggleProductionOverlays(), description: 'Toggle production overlays', category: 'view' },
    { key: 'o', shift: true, action: () => toggleProductionPanel(), description: 'Toggle production panel', category: 'view' },

    // Floor navigation
    { key: 'PageUp', action: () => setCurrentFloor(currentFloor + 1), description: 'Go to floor above', category: 'view' },
    { key: 'PageDown', action: () => currentFloor > 0 && setCurrentFloor(currentFloor - 1), description: 'Go to floor below', category: 'view' },

    // Edit operations
    { key: 'Delete', action: deleteSelected, description: 'Delete selected', category: 'edit' },
    { key: 'Backspace', action: deleteSelected, description: 'Delete selected', category: 'edit' },
    { key: 'z', ctrl: true, action: () => canUndo() && undo(), description: 'Undo', category: 'edit' },
    { key: 'y', ctrl: true, action: () => canRedo() && redo(), description: 'Redo', category: 'edit' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Update modifier states
      setActiveModifiers({
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey
      });

      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore if event was already handled by another handler
      if (e.defaultPrevented) {
        return;
      }

      // Ignore repeated key events (key held down) for drawing operations
      // This prevents multiple finish calls when Enter is held
      if (e.repeat && (e.key === 'Enter' || e.key === 'f' || e.key === 'F' || e.key === 'Escape')) {
        return;
      }

      // Find and execute matching shortcut
      const shortcut = shortcuts.find(s => {
        const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = (s.ctrl || false) === (e.ctrlKey || e.metaKey);
        const shiftMatch = (s.shift || false) === e.shiftKey;
        const altMatch = (s.alt || false) === e.altKey;
        
        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }

      // Space + drag handled in canvas for panning
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Update modifier states
      setActiveModifiers({
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [shortcuts]);

  return {
    shortcuts,
    activeModifiers
  };
};

// Export keyboard shortcut categories for help panel
export const KEYBOARD_SHORTCUT_CATEGORIES = {
  tool: 'Tool Selection',
  drawing: 'Drawing Operations',
  view: 'View Controls',
  edit: 'Edit Operations'
};