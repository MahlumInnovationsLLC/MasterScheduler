import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * SimpleLogin - A minimal login component that works regardless of any restrictions
 * This is completely self-contained with direct API calls and no dependencies on other components
 */
export default function SimpleLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // CRITICAL: Make sure this page is always interactive
  useEffect(() => {
    // This direct DOM manipulation ensures the login form always works
    const enableForm = () => {
      // Remove any view-only mode classes
      document.body.classList.remove('viewer-mode');
      document.body.classList.add('auth-override');
      
      // Apply a style override to ensure all elements are interactive
      const styleEl = document.createElement('style');
      styleEl.id = 'simple-login-style';
      styleEl.innerHTML = `
        .simple-login-container * {
          pointer-events: auto !important;
          opacity: 1 !important;
          cursor: auto !important;
        }
        .simple-login-container button {
          cursor: pointer !important;
        }
        .simple-login-container input {
          cursor: text !important;
        }
        body.viewer-mode .simple-login-container input,
        body.viewer-mode .simple-login-container button {
          pointer-events: auto !important;
          filter: none !important;
          opacity: 1 !important;
        }
      `;
      document.head.appendChild(styleEl);
      
      // Make sure all elements in the form are interactive
      setTimeout(() => {
        const container = document.querySelector('.simple-login-container');
        if (container) {
          const inputs = container.querySelectorAll('input');
          const buttons = container.querySelectorAll('button');
          
          inputs.forEach(input => {
            if (input instanceof HTMLElement) {
              input.style.pointerEvents = 'auto';
              input.style.opacity = '1';
              input.style.cursor = 'text';
            }
          });
          
          buttons.forEach(button => {
            if (button instanceof HTMLElement) {
              button.style.pointerEvents = 'auto';
              button.style.opacity = '1';
              button.style.cursor = 'pointer';
            }
          });
        }
      }, 100);
      
      return () => {
        const styleEl = document.getElementById('simple-login-style');
        if (styleEl) styleEl.remove();
      };
    };
    
    // Call immediately
    const cleanup = enableForm();
    
    // Also set an interval to continuously ensure form works
    const interval = setInterval(enableForm, 250);
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);
  
  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Use production-safe login endpoint
      const response = await fetch('/api/auth/production-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Login failed');
      }
      
      // Successfully logged in
      const userData = await response.json();
      console.log('Login successful:', userData);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dev auto-login for development
  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/dev-login', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Dev login failed');
      }
      
      // Successfully logged in
      const userData = await response.json();
      console.log('Dev login successful:', userData);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="simple-login-container min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          TIERIV<sup className="text-sm">PRO</sup> Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Nomad GCS Project Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  style={{ pointerEvents: 'auto', cursor: 'text' }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  style={{ pointerEvents: 'auto', cursor: 'text' }}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6">
              <button
                onClick={handleDevLogin}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                {loading ? 'Signing in...' : 'Dev Auto-Login'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}