"use client";

import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Screen, screensService } from '@/services/screens.service';
import { CaretUp, CaretDown, AppWindow, ListNumbers } from '@phosphor-icons/react';

interface ManageScreensOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  screens: Screen[];
  onOrderSaved?: (updatedList: Screen[]) => void;
}

export function ManageScreensOrderModal({ isOpen, onClose, screens, onOrderSaved }: ManageScreensOrderModalProps) {
  const [localList, setLocalList] = useState<Screen[]>(screens);
  const [saving, setSaving] = useState(false);

  // Update local state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalList([...screens]);
    }
  }, [isOpen, screens]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...localList];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    setLocalList(items);
  };

  const handleMoveDown = (index: number) => {
    if (index === localList.length - 1) return;
    const items = [...localList];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    setLocalList(items);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = localList.map((s, idx) => ({ id: s.id, position: idx }));
      await screensService.updateScreenPositions(updates);
      if (onOrderSaved) {
        // Return updated list, mimicking the backend merge
        const merged = localList.map((s, idx) => ({ ...s, position: idx }));
        onOrderSaved(merged);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update sort orders', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reorder Screens" subtitle="Arrange your dashboard">
      <div className="flex flex-col gap-2 mt-2">
        {localList.map((screen, index) => (
          <div
            key={screen.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border-primary bg-background-tertiary"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center text-modules-aly shrink-0">
                <AppWindow size={14} weight="duotone" />
              </div>
              <p className="font-bold text-sm text-text-primary truncate">{screen.name}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0 || saving}
                className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-tertiary transition-colors"
                title="Move Up"
              >
                <CaretUp size={16} weight="bold" />
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === localList.length - 1 || saving}
                className="p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-tertiary transition-colors"
                title="Move Down"
              >
                <CaretDown size={16} weight="bold" />
              </button>
            </div>
          </div>
        ))}

        {localList.length === 0 && (
          <div className="text-center p-6 text-text-tertiary text-sm">
            No screens to reorder.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-text-tertiary hover:text-text-secondary transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-modules-aly/10 border border-modules-aly/20 text-modules-aly hover:bg-modules-aly/20 transition-all flex items-center gap-2"
        >
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>
    </Modal>
  );
}
