import React, { useEffect, useState } from 'react';
import { testRustConnection } from '../../tauri/commands';

export function TauriConnectionTest() {
  const [status, setStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🧪 Testing Tauri connection...');
        const result = await testRustConnection();
        console.log('✅ Tauri test successful:', result);
        setStatus('connected');
        setMessage(result);
      } catch (err) {
        console.error('❌ Tauri test failed:', err);
        setStatus('failed');
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    // Test immediately and log environment info
    console.log('🔍 Environment check:', {
      hasWindow: typeof window !== 'undefined',
      hasTauri: typeof window !== 'undefined' && '__TAURI__' in window,
      userAgent: navigator?.userAgent
    });

    testConnection();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: status === 'connected' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#eab308',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 10000
    }}>
      <div>🦀 Rust: {status.toUpperCase()}</div>
      {message && <div>✅ {message}</div>}
      {error && <div>❌ {error}</div>}
    </div>
  );
}