import { useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import * as THREE from 'three';

/** Max tilt in radians (~9°) – kept subtle and elegant, never hectic. */
const MAX_TILT = THREE.MathUtils.degToRad(9);
/** How softly the butterfly springs back toward the cursor target. */
const DAMPING = 2.6;

export interface CursorTilt {
  /** Call every frame with the frame delta; updates and returns the eased tilt. */
  update: (delta: number) => { x: number; y: number };
}

/**
 * Reads the normalised pointer (−1..1) from the R3F state and produces a gently
 * damped tilt, clamped to a few degrees so the butterfly reacts to the cursor
 * and softly springs back. Pointer is unavailable on touch, so it simply rests.
 */
export function useCursorInteraction(): CursorTilt {
  const { pointer } = useThree();
  const current = useRef({ x: 0, y: 0 });

  const update = useCallback(
    (delta: number) => {
      // pointer.y up is positive → tilt nose up; pointer.x right → yaw right.
      const targetX = -pointer.y * MAX_TILT;
      const targetY = pointer.x * MAX_TILT;

      const t = 1 - Math.exp(-DAMPING * delta); // frame-rate independent easing
      current.current.x += (targetX - current.current.x) * t;
      current.current.y += (targetY - current.current.y) * t;

      return current.current;
    },
    [pointer]
  );

  return { update };
}
