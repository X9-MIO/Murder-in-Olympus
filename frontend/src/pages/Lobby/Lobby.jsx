import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Lobby() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { roomCode, players, setPlayers, isHost, playerName } = useGame();
  const [maxPlayers, setMaxPlayers] = useState(8);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    // BACKEND: Listen for player updates
    socket.on('player-joined', (data) => {
      setPlayers(data.players);
      if (data.maxPlayers) {
        setMaxPlayers(data.maxPlayers);
      }
    });

    socket.on('player-left', (data) => {
      setPlayers(data.players);
    });

    // BACKEND: Listen for game start
    socket.on('game-started', () => {
      navigate('/game');
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-started');
    };
  }, [socket, roomCode, navigate, setPlayers]);

  const handleStartGame = () => {
    if (players.length < 4) {
      alert('Need at least 4 players to start');
      return;
    }

    // BACKEND: Emit start-game event
    socket.emit('start-game', { roomCode });
  };

  const handleLeaveRoom = () => {
    // BACKEND: Emit leave-room event
    socket.emit('leave-room', { roomCode });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">Lobby</h1>
          <div className="text-2xl font-mono text-olympus-gold">
            Room Code: {roomCode}
          </div>
        </div>

        {/* Player List */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Players</h2>
            <span className="text-olympus-gold">
              {players.length} / {maxPlayers}
            </span>
          </div>

          <div className="space-y-2">
            {players.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                Waiting for players to join...
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player.id || index}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-olympus-purple flex items-center justify-center font-bold">
                      {player.name ? player.name[0].toUpperCase() : '?'}
                    </div>
                    <span>{player.name}</span>
                  </div>
                  {player.isHost && (
                    <span className="text-olympus-gold text-sm">HOST</span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isHost && (
            <Button
              onClick={handleStartGame}
              disabled={players.length < 4}
              className="w-full"
              variant="primary"
            >
              Start Game {players.length < 4 && `(${4 - players.length} more needed)`}
            </Button>
          )}

          <Button
            onClick={handleLeaveRoom}
            className="w-full"
            variant="outline"
          >
            Leave Room
          </Button>
        </div>

        {/* Info */}
        <div className="text-center mt-6 text-gray-400 text-sm">
          {isHost ? (
            <p>Waiting for players... Share the room code with your friends!</p>
          ) : (
            <p>Waiting for host to start the game...</p>
          )}
        </div>
      </div>
    </div>
  );
}
