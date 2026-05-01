// src/components/Canvas/layers/StickyNotesLayer.tsx
import React from 'react';
import { Layer } from 'react-konva';
import { StickyNoteShape } from '../../StickyNotes/StickyNoteShape';
import { StickyNote } from '../../../types';

// Memoized component for better performance
const MemoizedStickyNoteShape = React.memo(StickyNoteShape);

interface StickyNotesLayerProps {
  stickyNotes: Record<string, StickyNote>;
  currentFloor: number;
  selectedStickyNote: string | null;
  handleStickyNoteSelect: (id: string) => void;
  handleStickyNoteDragEnd: (id: string, e: any) => void;
}

export const StickyNotesLayer = React.memo<StickyNotesLayerProps>(({
  stickyNotes,
  currentFloor,
  selectedStickyNote,
  handleStickyNoteSelect,
  handleStickyNoteDragEnd
}) => {
  const notesArray = stickyNotes ? Object.values(stickyNotes) : [];
  const notesOnFloor = notesArray.filter(note => note.floor === currentFloor);

  return (
    <Layer>
      {/* Render sticky notes for the current floor */}
      {notesOnFloor.map(note => (
          <MemoizedStickyNoteShape
            key={note.id}
            note={note}
            isSelected={selectedStickyNote === note.id}
            onSelect={() => handleStickyNoteSelect(note.id)}
            onDragEnd={(e) => handleStickyNoteDragEnd(note.id, e)}
          />
        ))}
    </Layer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders during canvas drag
  return (
    prevProps.stickyNotes === nextProps.stickyNotes &&
    prevProps.currentFloor === nextProps.currentFloor &&
    prevProps.selectedStickyNote === nextProps.selectedStickyNote &&
    prevProps.handleStickyNoteSelect === nextProps.handleStickyNoteSelect &&
    prevProps.handleStickyNoteDragEnd === nextProps.handleStickyNoteDragEnd
  );
});

StickyNotesLayer.displayName = 'StickyNotesLayer';