import { useRef } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT - 340;
const SHEET_MIN_HEIGHT = 100;
const SHEET_MID_HEIGHT = 360;

export function useBottomSheet() {
  const animatedHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;
  const sheetPosition = useRef<'collapsed' | 'middle' | 'expanded'>('middle');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        let newHeight = SHEET_MID_HEIGHT;
        if (sheetPosition.current === 'middle') {
          newHeight = SHEET_MID_HEIGHT - gestureState.dy;
        } else if (sheetPosition.current === 'collapsed') {
          newHeight = SHEET_MIN_HEIGHT - gestureState.dy;
        } else if (sheetPosition.current === 'expanded') {
          newHeight = SHEET_MAX_HEIGHT - gestureState.dy;
        }
        
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          animatedHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        let targetHeight = SHEET_MID_HEIGHT;
        let finalPosition: 'collapsed' | 'middle' | 'expanded' = 'middle';
        const currentVal = (animatedHeight as any)._value;

        if (currentVal < (SHEET_MID_HEIGHT + SHEET_MIN_HEIGHT) / 2) {
          targetHeight = SHEET_MIN_HEIGHT;
          finalPosition = 'collapsed';
        } else if (currentVal > (SHEET_MAX_HEIGHT + SHEET_MID_HEIGHT) / 2) {
          targetHeight = SHEET_MAX_HEIGHT;
          finalPosition = 'expanded';
        } else {
          targetHeight = SHEET_MID_HEIGHT;
          finalPosition = 'middle';
        }

        sheetPosition.current = finalPosition;
        Animated.spring(animatedHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          damping: 20,
          stiffness: 100,
        }).start();
      },
    })
  ).current;

  const snapTo = (position: 'collapsed' | 'middle' | 'expanded') => {
    let targetHeight = SHEET_MID_HEIGHT;
    if (position === 'collapsed') targetHeight = SHEET_MIN_HEIGHT;
    if (position === 'expanded') targetHeight = SHEET_MAX_HEIGHT;

    sheetPosition.current = position;
    Animated.spring(animatedHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      damping: 20,
      stiffness: 100,
    }).start();
  };

  return {
    animatedHeight,
    panResponder,
    sheetPosition,
    snapTo,
    SHEET_MAX_HEIGHT,
    SHEET_MIN_HEIGHT,
    SHEET_MID_HEIGHT
  };
}
