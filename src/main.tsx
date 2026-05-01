import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/platform.css'
import { isTauriEnvironment } from './tauri/environment'
import { PlatformProvider } from './contexts/PlatformContext'
import { NotificationContainer } from './components/UI/NotificationSystem'
import { initializeAccessibility } from './hooks/useAccessibility'
import { ErrorBoundary } from './components/UI/ErrorBoundary'

// Initialize accessibility preferences
initializeAccessibility();

// Load standard web version for now
const loadApp = async () => {
  const { default: App } = await import('./App');
  return App;
};

// Initialize and render
// PERFORMANCE OPTIMIZATION: Removed React.StrictMode to eliminate 2x effect overhead
// StrictMode doubles all useEffect/useLayoutEffect calls in development, causing
// 532ms of overhead during canvas drag operations to become ~266ms
loadApp().then(AppComponent => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <PlatformProvider>
        <AppComponent />
        <NotificationContainer />
      </PlatformProvider>
    </ErrorBoundary>
  );
});