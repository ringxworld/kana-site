import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Nav() {
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
    </nav>
  );
}
