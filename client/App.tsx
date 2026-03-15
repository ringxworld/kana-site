import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Romaji from './pages/Romaji';
import Reader from './pages/Reader';
import Decks from './pages/Decks';
import Review from './pages/Review';
import Browse from './pages/Browse';
import DemoDecks from './pages/demo/DemoDecks';
import DemoReview from './pages/demo/DemoReview';
import DemoBrowse from './pages/demo/DemoBrowse';
import { API_BASE, getApiKey } from './types/api';

/** Redirect to /login when a real server is configured but no key is stored. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  if (API_BASE && !getApiKey()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/romaji" element={<RequireAuth><Romaji /></RequireAuth>} />
      <Route path="/reader" element={<RequireAuth><Reader /></RequireAuth>} />
      <Route path="/decks" element={<RequireAuth><Decks /></RequireAuth>} />
      <Route path="/decks/:deckId/review" element={<RequireAuth><Review /></RequireAuth>} />
      <Route path="/decks/:deckId/browse" element={<RequireAuth><Browse /></RequireAuth>} />
      <Route path="/demo/decks" element={<DemoDecks />} />
      <Route path="/demo/decks/:deckId/review" element={<DemoReview />} />
      <Route path="/demo/decks/:deckId/browse" element={<DemoBrowse />} />
    </Routes>
  );
}
