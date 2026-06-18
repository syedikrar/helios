import { Component, type ReactNode } from "react";

interface State {
  hasError: boolean;
  message?: string;
}

// Catches render-time crashes so a single broken panel doesn't blank the app.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : "Unexpected error" };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-navy-50 p-6">
        <div className="h-card max-w-md p-6 text-center">
          <h1 className="text-lg font-bold text-navy-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-navy-700/70">{this.state.message}</p>
          <button
            className="mt-4 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
            onClick={() => window.location.assign("/")}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
