import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Lobby } from './components/Lobby';
import { WatchRoom } from './pages/WatchRoom';

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<WatchRoom />} />
      </Routes>
    </Router>
  );
};

export default App;
