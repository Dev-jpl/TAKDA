"use client";

import React, { useCallback } from 'react';
import { CanvasPos } from './CanvasWidgetNode';

interface MinimapViewport { x: number; y: number; scale: number }

interface CanvasMinimapProps {
  widgets: { id: string; pos: CanvasPos }[];
  viewport: MinimapViewport;
  containerW: number;
  containerH: number;
  onViewportChange: (vp: MinimapViewport) => void;
}

const MAP_W = 160;
const MAP_H = 100;
const PADDING = 40;

export function CanvasMinimap({ widgets, viewport, containerW, containerH, onViewportChange }: CanvasMinimapProps) {
  if (widgets.length === 0) return null;

  // Compute world bounding box of all widgets
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { pos } of widgets) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.w);
    maxY = Math.max(maxY, pos.y + pos.h);
  }
  // Add padding
  minX -= PADDING; minY -= PADDING;
  maxX += PADDING; maxY += PADDING;

  const worldW = maxX - minX;
  const worldH = maxY - minY;
  if (worldW <= 0 || worldH <= 0) return null;

  // Scale factor from world → minimap
  const scaleX = MAP_W / worldW;
  const scaleY = MAP_H / worldH;
  const s = Math.min(scaleX, scaleY);

  const toMapX = (wx: number) => (wx - minX) * s;
  const toMapY = (wy: number) => (wy - minY) * s;

  // Viewport rectangle in world coords
  const vpWorldLeft   = -viewport.x / viewport.scale;
  const vpWorldTop    = -viewport.y / viewport.scale;
  const vpWorldRight  = vpWorldLeft + containerW / viewport.scale;
  const vpWorldBottom = vpWorldTop  + containerH / viewport.scale;

  const vpMapLeft   = Math.max(0, toMapX(vpWorldLeft));
  const vpMapTop    = Math.max(0, toMapY(vpWorldTop));
  const vpMapRight  = Math.min(MAP_W, toMapX(vpWorldRight));
  const vpMapBottom = Math.min(MAP_H, toMapY(vpWorldBottom));

  // Click on minimap → teleport viewport so clicked world point is centred
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / s + minX;
    const my = (e.clientY - rect.top)  / s + minY;
    onViewportChange({
      ...viewport,
      x: -(mx * viewport.scale) + containerW / 2,
      y: -(my * viewport.scale) + containerH / 2,
    });
  }, [s, minX, minY, viewport, containerW, containerH, onViewportChange]);

  return (
    <div
      className="absolute bottom-4 right-4 bg-background-secondary/90 backdrop-blur border border-border-primary rounded-xl overflow-hidden shadow-xl"
      style={{ width: MAP_W, height: MAP_H }}
    >
      <svg
        width={MAP_W}
        height={MAP_H}
        onClick={handleClick}
        className="cursor-crosshair"
      >
        {/* Widget rects */}
        {widgets.map(({ id, pos }) => (
          <rect
            key={id}
            x={toMapX(pos.x)}
            y={toMapY(pos.y)}
            width={pos.w * s}
            height={pos.h * s}
            rx={2}
            fill="var(--modules-aly)"
            fillOpacity={0.25}
            stroke="var(--modules-aly)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}

        {/* Viewport rect */}
        {vpMapRight > vpMapLeft && vpMapBottom > vpMapTop && (
          <rect
            x={vpMapLeft}
            y={vpMapTop}
            width={vpMapRight - vpMapLeft}
            height={vpMapBottom - vpMapTop}
            rx={2}
            fill="none"
            stroke="white"
            strokeOpacity={0.5}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        )}
      </svg>
    </div>
  );
}
