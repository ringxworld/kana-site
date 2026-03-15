import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setApiKey } from '../types/api';
import '../styles/login.css';

export default function Login() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) { setError('API key is required'); return; }
    setApiKey(trimmed);
    navigate('/');
  }

  return (
    <main className="login-page">
      <h1>Kotoba-Lab</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="api-key">API Key</label>
        <input
          id="api-key"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your KOTOBA_API_KEY"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        {error && <p className="login-error">{error}</p>}
        <button className="btn-primary" type="submit">Connect</button>
      </form>
    </main>
  );
}
