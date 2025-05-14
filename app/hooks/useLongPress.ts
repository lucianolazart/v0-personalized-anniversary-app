import { useCallback, useRef, useState } from "react";

interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
}

export const useLongPress = ({
  onLongPress,
  onClick,
  ms = 500,
}: LongPressOptions) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isPressed = useRef(false);
  const didLongPress = useRef(false);

  const startPressTimer = useCallback(() => {
    didLongPress.current = false;
    isPressed.current = true;
    setIsLongPressing(true);
    
    timerRef.current = setTimeout(() => {
      if (isPressed.current) {
        didLongPress.current = true;
        onLongPress();
      }
    }, ms);
  }, [onLongPress, ms]);

  const handleOnClick = useCallback(() => {
    if (onClick && !didLongPress.current) {
      onClick();
    }
  }, [onClick]);

  const clearTimer = useCallback(() => {
    setIsLongPressing(false);
    isPressed.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  return {
    onMouseDown: startPressTimer,
    onMouseUp: () => {
      clearTimer();
      handleOnClick();
    },
    onMouseLeave: clearTimer,
    onTouchStart: startPressTimer,
    onTouchEnd: () => {
      clearTimer();
      handleOnClick();
    },
    isLongPressing,
  };
}; 