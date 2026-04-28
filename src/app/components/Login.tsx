'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.title = 'Sign in - Newsroom';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setAuthError('Invalid username or password.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#FAFAFA' }}
    >
      <div
        className="bg-white"
        style={{
          width: '360px',
          border: '0.5px solid #E5E5E5',
          borderRadius: '12px',
          padding: '32px'
        }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 500,
            marginBottom: '24px',
            color: '#000'
          }}
        >
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="username"
              className="block"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#666',
                marginBottom: '6px'
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setAuthError('');
              }}
              className="w-full transition-colors"
              style={{
                height: '36px',
                border: '0.5px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '13px',
                paddingLeft: '10px',
                paddingRight: '10px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#000';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E5E5';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="password"
              className="block"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#666',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthError('');
              }}
              className="w-full transition-colors"
              style={{
                height: '36px',
                border: '0.5px solid #E5E5E5',
                borderRadius: '8px',
                fontSize: '13px',
                paddingLeft: '10px',
                paddingRight: '10px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#000';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E5E5';
              }}
            />
          </div>

          {authError && (
            <p
              role="alert"
              style={{
                fontSize: '12px',
                color: '#B42318',
                lineHeight: '1.4',
                marginBottom: '16px'
              }}
            >
              {authError}
            </p>
          )}

          <button
            type="submit"
            className="w-full transition-all"
            disabled={isSubmitting}
            style={{
              height: '36px',
              backgroundColor: isSubmitting ? '#E5E5E5' : '#000',
              color: isSubmitting ? '#999' : '#fff',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '8px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
