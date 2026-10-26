import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        })
      }

      return (
        <div className="flex h-full w-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-xs">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {this.props.title || 'Something went wrong'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
