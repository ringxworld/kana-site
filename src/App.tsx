import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Romaji from './pages/Romaji';
import Reader from './pages/Reader';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/romaji" element={<Romaji />} />
      <Route path="/reader" element={<Reader />} />
    </Routes>
  );
}
