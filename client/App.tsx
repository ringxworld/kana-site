import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Romaji from './pages/Romaji';
import Reader from './pages/Reader';
import Decks from './pages/Decks';
import Review from './pages/Review';
import Browse from './pages/Browse';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/romaji" element={<Romaji />} />
      <Route path="/reader" element={<Reader />} />
      <Route path="/decks" element={<Decks />} />
      <Route path="/decks/:deckId/review" element={<Review />} />
      <Route path="/decks/:deckId/browse" element={<Browse />} />
    </Routes>
  );
}
