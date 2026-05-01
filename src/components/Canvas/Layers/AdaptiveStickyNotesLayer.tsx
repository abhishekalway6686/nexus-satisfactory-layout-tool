/**
 * Adaptive Sticky Notes Layer - Renderer-agnostic sticky notes
 */

import React from 'react';
import { RendererAdapter } from '../../../renderer/adapters/RendererAdapter';
import { StickyNote } from '../../../types';

interface AdaptiveStickyNotesLayerProps {
  adapter: RendererAdapter;
  stickyNotes: StickyNote[];
  currentFloor: number;
  selectedIds: Set<string>;
}

export const AdaptiveStickyNotesLayer: React.FC<AdaptiveStickyNotesLayerProps> = ({
  adapter,
  stickyNotes,
  currentFloor,
  selectedIds
}) => {
  const visibleNotes = stickyNotes.filter(note => note.z === currentFloor);

  return adapter.createGroup({
    id: 'sticky-notes-group',
    children: visibleNotes.map(note => (
      adapter.createGroup({
        id: `sticky-note-${note.id}`,
        key: note.id,
        children: (
          <>
            {adapter.createRect({
              id: `sticky-note-bg-${note.id}`,
              x: note.x - 50,
              y: note.y - 25,
              width: 100,
              height: 50,
              fill: note.color || '#FFEB3B',
              stroke: selectedIds.has(note.id) ? '#FF6B35' : '#FDD835',
              strokeWidth: selectedIds.has(note.id) ? 2 : 1,
              cornerRadius: 4
            })}
            {adapter.createText({
              id: `sticky-note-text-${note.id}`,
              x: note.x,
              y: note.y,
              text: note.text,
              fontSize: 12,
              fontFamily: 'Arial',
              fill: '#333',
              align: 'center'
            })}
          </>
        )
      })
    ))
  });
};

export default AdaptiveStickyNotesLayer;