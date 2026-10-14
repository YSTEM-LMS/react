import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { environment } from '../../../../environments';

const ResetPassword = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleResetRequest = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const baseURL = environment.urls.middlewareURL;
      const response = await fetch(
        `${baseURL}/user/sendMail?username=${encodeURIComponent(
          username
        )}&email=${encodeURIComponent(email)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.token) {
        navigate(`/set-password?token=${data.token}`);
      } else {
        setError(data.message || 'Error requesting password reset');
      }
    } catch (error) {
      setError('Error connecting to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
      <h1 className="mb-8 text-center text-4xl font-bold text-slate-800">Reset Password</h1>

      {error && (
        <div className="mb-4 w-full max-w-md rounded border border-red bg-redLight px-4 py-3 font-semibold text-red" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <form onSubmit={handleResetRequest} className="w-full max-w-md space-y-6 rounded-[20px] bg-white p-8 shadow-[0_8px_16px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col text-left">
          <label htmlFor="username" className="mb-2 text-base font-semibold text-slate-800">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            placeholder="Enter your username"
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border-2 border-primary px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-soft"
            required
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col text-left">
          <label htmlFor="email" className="mb-2 text-base font-semibold text-slate-800">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border-2 border-primary px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-soft"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary px-6 py-3 text-base font-semibold text-dark transition hover:-translate-y-0.5 hover:bg-[#69b51d] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="reset-submit"
          aria-busy={isLoading}
        >
          {isLoading ? 'Sending...' : 'Reset Password'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <a href="/login" className="font-semibold text-slate-800 transition hover:text-primary hover:underline">Back to Login</a>
      </div>
    </div>
  );
};

export default ResetPassword;
