import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { environment } from '../../../../environments';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [location]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const baseURL = environment.urls.middlewareURL;
      const response = await fetch(`${baseURL}/user/setPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          token,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to update password');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div
          className="rounded border border-red bg-redLight px-4 py-3 text-red"
          role="alert"
          aria-live="assertive"
        >
          <p>Invalid reset link. Please request a new password reset.</p>
          <button
            onClick={() => navigate('/reset-password')}
            className="mt-2 block font-semibold text-primary hover:underline"
          >
            Go to Reset Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_8px_16px_rgba(0,0,0,0.1)]">
        <h2 className="mb-6 text-center text-2xl font-bold">Set New Password</h2>

        {error && (
          <div
            className="mb-4 rounded border border-red bg-redLight px-4 py-3 text-red"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-800">
              New Password
            </label>
            <input
              data-testid="password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-primary px-3 py-2.5 outline-none transition focus:border-primary focus:ring-4 focus:ring-soft"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-800">
              Confirm Password
            </label>
            <input
              data-testid="confirmPassword"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-primary px-3 py-2.5 outline-none transition focus:border-primary focus:ring-4 focus:ring-soft"
              required
              disabled={isLoading}
            />
          </div>

          <button
            data-testid="setBtn"
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-lg bg-primary px-4 py-3 font-semibold text-dark transition ${
              isLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#69b51d]'
            }`}
            aria-busy={isLoading}
          >
            {isLoading ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
