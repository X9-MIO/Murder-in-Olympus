import { createContext, useContext, useState } from 'react';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [role, setRole] = useState(null);
  const [gameState, setGameState] = useState({
    phase: 'lobby', // lobby, night, day, ended
    round: 0,
    alivePlayers: [],
    deadPlayers: [],
  });
  const [messages, setMessages] = useState([]);

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const resetGame = () => {
    setRoomCode('');
    setPlayers([]);
    setIsHost(false);
    setRole(null);
    setGameState({
      phase: 'lobby',
      round: 0,
      alivePlayers: [],
      deadPlayers: [],
    });
    setMessages([]);
  };

  return (
    <GameContext.Provider
      value={{
        playerName,
        setPlayerName,
        roomCode,
        setRoomCode,
        players,
        setPlayers,
        isHost,
        setIsHost,
        role,
        setRole,
        gameState,
        setGameState,
        messages,
        addMessage,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
