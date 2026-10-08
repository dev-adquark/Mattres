'use client';

import { Component, type ReactNode } from 'react';

interface SceneBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}

interface SceneBoundaryState {
  failed: boolean;
}

/** Catches a crash in the WebGL scene (or its lazy chunk) so the poster stays up. */
export default class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  override state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
