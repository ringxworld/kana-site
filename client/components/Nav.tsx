import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { API_BASE, clearApiKey, getApiKey } from '../types/api';

export default function Nav() {
  const navigate = useNavigate();

  function handleLogout() {
    clearApiKey();
    navigate('/login');
  }

  const showLogout = !!API_BASE && !!getApiKey();

  return (
    <nav className="top-nav">
      <NavLink end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
        Tools
      </NavLink>
      <NavLink
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        to="/romaji"
      >
        Romaji
      </NavLink>
      <NavLink
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        to="/reader"
      >
        Reader
      </NavLink>
      <NavLink
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        to="/decks"
      >
        Flashcards
      </NavLink>
      {showLogout && (
        <button className="nav-link nav-logout" onClick={handleLogout}>
          Logout
        </button>
      )}
    </nav>
  );
}
