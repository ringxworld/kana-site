import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Nav() {
  return (
    <nav className="top-nav">
      <NavLink
        end
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        to="/"
      >
        Home
      </NavLink>
      <NavLink
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        to="/reader"
      >
        Reader
      </NavLink>
    </nav>
  );
}
