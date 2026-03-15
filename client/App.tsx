import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Romaji from './pages/Romaji';
import Reader from './pages/Reader';
import Decks from './pages/Decks';
import Review from './pages/Review';
import Browse from './pages/Browse';
import DemoDecks from './pages/demo/DemoDecks';
import DemoReview from './pages/demo/DemoReview';
import DemoBrowse from './pages/demo/DemoBrowse';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/romaji" element={<Romaji />} />
      <Route path="/reader" element={<Reader />} />
      <Route path="/decks" element={<Decks />} />
      <Route path="/decks/:deckId/review" element={<Review />} />
      <Route path="/decks/:deckId/browse" element={<Browse />} />
      <Route path="/demo/decks" element={<DemoDecks />} />
      <Route path="/demo/decks/:deckId/review" element={<DemoReview />} />
      <Route path="/demo/decks/:deckId/browse" element={<DemoBrowse />} />
    </Routes>
  );
}
