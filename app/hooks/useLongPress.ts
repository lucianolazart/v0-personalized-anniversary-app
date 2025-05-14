import { useCallback, useRef, useState } from "react";

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
  moveThreshold?: number;
}

export const useLongPress = ({
  onLongPress,
  onClick,
  ms = 500,
  moveThreshold = 10,
}: LongPressOptions) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPressed = useRef(false);
  const didLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const startPressTimer = useCallback((x: number, y: number) => {
    didLongPress.current = false;
    isPressed.current = true;
    startPos.current = { x, y };
    setIsLongPressing(true);
    
    timerRef.current = setTimeout(() => {
      if (isPressed.current) {
        didLongPress.current = true;
        onLongPress();
      }
    }, ms);
  }, [onLongPress, ms]);

  const handleOnClick = useCallback(() => {
    if (onClick && !didLongPress.current && startPos.current) {
      onClick();
    }
  }, [onClick]);

  const clearTimer = useCallback(() => {
    setIsLongPressing(false);
    isPressed.current = false;
    startPos.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const checkMovement = useCallback((x: number, y: number) => {
    if (!startPos.current) return false;
    
    const deltaX = Math.abs(x - startPos.current.x);
    const deltaY = Math.abs(y - startPos.current.y);
    
    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      clearTimer();
      return true;
    }
    return false;
  }, [moveThreshold, clearTimer]);

  return {
    onMouseDown: (e: React.MouseEvent) => startPressTimer(e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent) => checkMovement(e.clientX, e.clientY),
    onMouseUp: () => {
      clearTimer();
      handleOnClick();
    },
    onMouseLeave: clearTimer,
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startPressTimer(touch.clientX, touch.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      checkMovement(touch.clientX, touch.clientY);
    },
    onTouchEnd: () => {
      clearTimer();
      handleOnClick();
    },
    isLongPressing,
  };
}; 