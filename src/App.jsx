import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Romaji from './pages/Romaji.jsx';
import Reader from './pages/Reader.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/romaji" element={<Romaji />} />
      <Route path="/reader" element={<Reader />} />
    </Routes>
  );
}
