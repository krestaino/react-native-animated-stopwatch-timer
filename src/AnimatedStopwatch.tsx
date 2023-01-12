import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
} from 'react';
import Animated, {
  EntryAnimationsValues,
  ExitAnimationsValues,
  SharedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import useStopwatch from './useStopwatch';

const DEFAULT_ANIMATION_DELAY = 0;
const DEFAULT_ANIMATION_DISTANCE = 80;
const DEFAULT_ANIMATION_DURATION = 200;

export interface StopwatchProps {
  /**
   * The enter/exit animation duration in milliseconds of a stopwatch digit.
   */
  animationDuration?: number;
  /**
   * The enter/exit animation delay in milliseconds of a stopwatch digit.
   */
  animationDelay?: number;
  /**
   * The enter/exit animation distance in dp of a stopwatch digit.
   */
  animationDistance?: number;
  /**
   * The style of the stopwatch View container.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Extra style applied only to each digit, excluding separators.
   */
  digitStyle?: StyleProp<TextStyle>;
  /**
   * The number of zeros for the minutes.
   */
  leadingZeros?: 1 | 2;
  /**
   * Whether the new digit should enter from the top or the bottom.
   */
  enterAnimationType?: 'slide-in-up' | 'slide-in-down';
  /**
   * Extra style applied only to separators. In this case, the colon (:) and the comma (,)
   */
  separatorStyle?: StyleProp<TextStyle>;
  /**
   * The style applied to each individual character of the stopwatch.
   */
  textCharStyle?: StyleProp<TextStyle>;
  /**
   * If 0, the stopwatch will only display seconds and minutes.
   * If 1, the stopwatch will display seconds, minutes and hundredth of ms.
   */
  trailingZeros?: 0 | 1 | 2;
}

export interface StopWatchMethods {
  /**
   * Starts the stopwatch or resumes it if paused. Has no effect if the stopwatch is already running.
   */
  play: () => void;
  /**
   * Pauses the stopwatch and returns the current elapsed time in milliseconds.
   */
  pause: () => number;
  /**
   * Resets the stopwatch.
   */
  reset: () => void;
  /**
   * Returns the current elapsed time in milliseconds.
   */
  getSnapshot: () => number;
}

function Stopwatch(
  {
    animationDelay = DEFAULT_ANIMATION_DELAY,
    animationDistance = DEFAULT_ANIMATION_DISTANCE,
    animationDuration = DEFAULT_ANIMATION_DURATION,
    containerStyle,
    enterAnimationType = 'slide-in-up',
    digitStyle,
    leadingZeros = 1,
    separatorStyle,
    textCharStyle,
    trailingZeros = 1,
  }: StopwatchProps,
  ref: ForwardedRef<StopWatchMethods>
) {
  const {
    tensOfMs,
    lastDigit,
    tens,
    minutes,
    play,
    reset,
    pause,
    getSnapshot,
  } = useStopwatch();

  useImperativeHandle(ref, () => ({
    play,
    pause,
    reset,
    getSnapshot,
  }));

  const oldLastDigit = useSharedValue<number>(-1);
  const oldTens = useSharedValue<number>(-1);
  const oldMinutes = useSharedValue<number>(-1);

  const newLastDigit = useSharedValue<number>(lastDigit);
  const newTens = useSharedValue<number>(tens);
  const newMinutes = useSharedValue<number>(minutes);

  useEffect(() => {
    newLastDigit.value = lastDigit;
    newTens.value = tens;
    newMinutes.value = minutes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDigit, tens, minutes]);

  const createEntering =
    (oldValue: SharedValue<number>, numericValue: number) =>
    (values: EntryAnimationsValues) => {
      'worklet';
      if (oldValue.value === -1) {
        // skip entering animation on first render
        oldValue.value = numericValue;
        return { initialValues: {}, animations: {} };
      }
      oldValue.value = numericValue;
      const animations = {
        originY: withDelay(
          animationDelay,
          withTiming(values.targetOriginY, {
            duration: animationDuration,
          })
        ),
      };
      const enterDirection = enterAnimationType === 'slide-in-up' ? -1 : 1;
      const initialValues = {
        originY: values.targetOriginY + animationDistance * enterDirection,
      };
      return {
        initialValues,
        animations,
      };
    };

  const exiting = (values: ExitAnimationsValues) => {
    'worklet';
    const exitDirection = enterAnimationType === 'slide-in-up' ? 1 : -1;
    const animations = {
      originY: withDelay(
        animationDelay,
        withTiming(values.currentOriginY + animationDistance * exitDirection, {
          duration: animationDuration,
        })
      ),
    };
    const initialValues = {
      originY: values.currentOriginY,
    };
    return {
      initialValues,
      animations,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { width, ...textCharStyleWithoutWidth } =
    StyleSheet.flatten(textCharStyle);

  return (
    <View style={[styles.container, containerStyle]}>
      {leadingZeros === 2 && (
        <Text
          style={[
            styles.defaultCharStyle,
            textCharStyleWithoutWidth,
            digitStyle,
          ]}
        >
          0
        </Text>
      )}
      <Animated.Text
        key={`${minutes}-minutes`}
        style={[styles.defaultCharStyle, textCharStyleWithoutWidth, digitStyle]}
        entering={createEntering(oldMinutes, minutes)}
        exiting={exiting}
      >
        {minutes}
      </Animated.Text>
      <Text
        style={[
          styles.defaultCharStyle,
          textCharStyleWithoutWidth,
          separatorStyle,
        ]}
      >
        :
      </Text>
      <Animated.Text
        key={`${tens}-tens`}
        style={[styles.defaultCharStyle, textCharStyleWithoutWidth, digitStyle]}
        entering={createEntering(oldTens, tens)}
        exiting={exiting}
      >
        {tens}
      </Animated.Text>
      <Animated.Text
        key={`${lastDigit}-count`}
        style={[styles.defaultCharStyle, textCharStyleWithoutWidth, digitStyle]}
        entering={createEntering(oldLastDigit, lastDigit)}
        exiting={exiting}
      >
        {lastDigit}
      </Animated.Text>
      {trailingZeros > 0 && (
        <>
          <Text
            style={[
              styles.defaultCharStyle,
              textCharStyleWithoutWidth,
              separatorStyle,
            ]}
          >
            ,
          </Text>
          <Text
            style={[
              styles.defaultCharStyle,
              textCharStyleWithoutWidth,
              digitStyle,
            ]}
          >
            {tensOfMs >= 10 ? String(tensOfMs).charAt(0) : 0}
          </Text>
          {trailingZeros === 2 && (
            <Text
              style={[
                styles.defaultCharStyle,
                textCharStyleWithoutWidth,
                digitStyle,
              ]}
            >
              {tensOfMs >= 10
                ? String(tensOfMs).charAt(1)
                : String(tensOfMs).charAt(0)}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  defaultCharStyle: {
    textAlign: 'center',
  },
});

const AnimatedStopwatch = forwardRef<StopWatchMethods, StopwatchProps>(
  Stopwatch
);

export default AnimatedStopwatch;
