declare module 'react-native-confetti' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  interface ConfettiProps extends ViewProps {
    confettiCount?: number;
    timeout?: number;
    untilStopped?: boolean;
    duration?: number;
    size?: number;
    bsize?: number;
    colors?: string[];
  }

  export default class Confetti extends Component<ConfettiProps> {
    startConfetti(): void;
    stopConfetti(): void;
  }
}
