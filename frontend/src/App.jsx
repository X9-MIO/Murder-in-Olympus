import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';

// Pages
import Home from './pages/Home/Home';
import CreateRoom from './pages/CreateRoom/CreateRoom';
import JoinGame from './pages/JoinGame/JoinGame';
import Lobby from './pages/Lobby/Lobby';
import Game from './pages/Game/Game';
import GameInfo from './pages/GameInfo/GameInfo';
import Settings from './pages/Settings/Settings';

function App() {
  return (
    <Router>
      <SocketProvider>
        <GameProvider>
          <div className="min-h-screen bg-gradient-to-b from-olympus-purple via-olympus-dark to-black">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateRoom />} />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/game" element={<Game />} />
              <Route path="/info" element={<GameInfo />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </GameProvider>
      </SocketProvider>
    </Router>
  );
}

export default App;
