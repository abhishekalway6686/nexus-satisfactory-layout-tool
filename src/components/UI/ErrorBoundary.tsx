// Global error boundary that shows a user-friendly error screen when React crashes,
// and offers the user the option to copy the error details or open a GitHub issue.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Bug, Copy, CheckCircle } from 'lucide-react';
import { APP_VERSION } from '../../constants/version';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const errorReport = `
neXus Error Report
==================
Version: ${APP_VERSION}
Date: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Error: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}

Stack Trace:
${error?.stack || 'No stack trace'}

Component Stack:
${errorInfo?.componentStack || 'No component stack'}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorReport);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  handleReportBug = (): void => {
    const { error } = this.state;
    const issueTitle = encodeURIComponent(`[Crash] ${error?.name || 'Unknown error'}: ${error?.message || 'No message'}`);
    const issueBody = encodeURIComponent(`
## Crash Report

**Version:** ${APP_VERSION}
**Date:** ${new Date().toISOString()}

### Error Details
- **Name:** ${error?.name || 'Unknown'}
- **Message:** ${error?.message || 'No message'}

### Steps to Reproduce
1. [Please describe what you were doing when the crash occurred]

### Stack Trace
\`\`\`
${error?.stack || 'No stack trace available'}
\`\`\`

### Additional Context
[Add any other context about the problem here]
    `.trim());

    window.open(
      `https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/issues/new?title=${issueTitle}&body=${issueBody}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  render(): ReactNode {
    const { hasError, error, copied } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            {/* Error Icon */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/25 mb-4"
              >
                <AlertTriangle size={40} className="text-white" />
              </motion.div>
              <h1 className="text-lg font-bold text-white mb-2">Something went wrong</h1>
              <p className="text-slate-400">
                The application encountered an unexpected error. You can copy the details below
                and open a bug report on GitHub to help get it fixed.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Bug size={18} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-red-300 mb-1">
                    {error?.name || 'Error'}
                  </h3>
                  <p className="text-sm text-slate-400 break-words">
                    {error?.message || 'An unknown error occurred'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Reload Button */}
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <RefreshCw size={20} />
                Reload Application
              </button>

              {/* Secondary Actions */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleCopyError}
                  className="flex-1 py-2.5 px-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={18} className="text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy Error
                    </>
                  )}
                </button>

                <button
                  onClick={this.handleReportBug}
                  className="flex-1 py-2.5 px-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Bug size={18} />
                  Report Bug
                </button>
              </div>
            </div>

            {/* Version Info */}
            <p className="text-center text-xs text-slate-600 mt-6">
              Version {APP_VERSION}
            </p>
          </motion.div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
