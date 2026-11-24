import { InterviewProvider, useInterview } from './context/InterviewContext';
import { SetupScreen } from './components/SetupScreen';
import InterviewScreen from './components/InterviewScreen';
import { ReportScreen } from './components/ReportScreen';
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Render error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg-primary p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-bold text-status-danger mb-2">Something went wrong</h1>
            <p className="text-text-secondary mb-4">An error occurred while rendering. Details:</p>
            <pre className="bg-bg-card border border-border-primary rounded-lg p-4 overflow-auto text-sm text-status-warning whitespace-pre-wrap max-h-96">
              {String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}
              {'\n\n'}
              {String(this.state.error && this.state.error.stack ? this.state.error.stack : '')}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-5 py-2.5 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { state } = useInterview();

  switch (state.currentScreen) {
    case 'setup':
      return <SetupScreen />;
    case 'interview':
      return <InterviewScreen />;
    case 'report':
      return <ReportScreen />;
    default:
      return <SetupScreen />;
  }
}

export default function App() {
  return (
    <InterviewProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </InterviewProvider>
  );
}