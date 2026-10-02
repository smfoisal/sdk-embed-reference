import { Component, type ReactNode } from 'react';

/** A crash inside Flarie must never take the partner page down with it. */
export class ErrorBoundary extends Component<
  { name: string; onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Flarie] ${this.props.name} crashed:`, error);
    this.props.onError(message);
    // Production: report to Flarie telemetry with partnerId / orgId / runtime version.
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="fl-crash" role="alert">
          This part of the page couldn't load. Reload the page to try again.
        </div>
      );
    }
    return this.props.children;
  }
}
