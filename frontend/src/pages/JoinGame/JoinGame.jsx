import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

export default function JoinGame() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { setRoomCode, setPlayerName } = useGame();

  const [playerName, setPlayerNameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Clean up any lingering event listeners
      if (socket) {
        socket.off('join-success');
        socket.off('join-error');
      }
    };
  }, [socket]);

  const handleQuickTest = () => {
  setRoomCode(roomCodeInput || "TEST12"); // Set the state so Game.js doesn't kick you out
  setPlayerName(playerName || "Player");
  navigate('/game');
};


  const handleJoin = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCodeInput.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');

    // Set a timeout to reset loading state if no response (10 seconds)
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Failed to join room. Please try again.');
      // Clean up listeners
      socket.off('join-success');
      socket.off('join-error');
    }, 10000);

    // BACKEND: Emit join-room event
    socket.emit('join-room', {
      playerName: playerName,
      roomCode: roomCodeInput.toUpperCase(),
    });

    // BACKEND: Listen for success
    socket.once('join-success', (data) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPlayerName(playerName);
      setRoomCode(roomCodeInput.toUpperCase());
      navigate('/lobby');
    });

    // BACKEND: Listen for errors
    socket.once('join-error', (data) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setError(data.message || 'Failed to join room. Please try again.');
      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="mr-4"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">Join Game</h1>
        </div>

        <Card>
          <div className="space-y-6">
            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerNameInput(e.target.value)}
            />

            <Input
              label="Room Code"
              placeholder="Enter room code (e.g., ABC123)"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button onClick={handleQuickTest} className="w-full">
              Join Game (Test Mode)
            </Button>

            <Button
              onClick={handleJoin}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}