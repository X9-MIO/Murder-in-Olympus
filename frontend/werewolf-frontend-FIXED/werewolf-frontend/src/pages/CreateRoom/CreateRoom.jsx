import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

export default function CreateRoom() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { setRoomCode, setIsHost, setPlayerName } = useGame();

  const [formData, setFormData] = useState({
    playerName: '',
    maxPlayers: 8,
    numWerewolves: 2,
    enableDoctor: true,
    enableLittleGirl: false,
  });

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
        socket.off('room-created');
        socket.off('create-room-error');
      }
    };
  }, [socket]);

  const handleCreate = () => {
    if (!formData.playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (formData.numWerewolves >= formData.maxPlayers) {
      setError('Too many werewolves for the player count');
      return;
    }

    setLoading(true);
    setError('');

    // Set a timeout to reset loading state if no response (10 seconds)
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Failed to create room. Please try again.');
      // Clean up listeners
      socket.off('room-created');
      socket.off('create-room-error');
    }, 10000);

    // BACKEND: Emit create-room event
    socket.emit('create-room', {
      hostName: formData.playerName,
      maxPlayers: formData.maxPlayers,
      gameSettings: {
        numWerewolves: formData.numWerewolves,
        enableDoctor: formData.enableDoctor,
        enableLittleGirl: formData.enableLittleGirl,
      }
    });

    // BACKEND: Listen for room-created response
    socket.once('room-created', (data) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPlayerName(formData.playerName);
      setRoomCode(data.roomCode);
      setIsHost(true);
      navigate('/lobby');
    });

    // BACKEND: Listen for errors
    socket.once('create-room-error', (data) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setError(data.message || 'Failed to create room. Please try again.');
      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="mr-4"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">Create Room</h1>
        </div>

        <Card>
          <div className="space-y-6">
            {/* Player Name */}
            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={formData.playerName}
              onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
              error={error && !formData.playerName.trim() ? error : ''}
            />

            {/* Max Players */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Players: {formData.maxPlayers}
              </label>
              <input
                type="range"
                min="4"
                max="12"
                value={formData.maxPlayers}
                onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>4</span>
                <span>12</span>
              </div>
            </div>

            {/* Number of Werewolves */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Werewolves: {formData.numWerewolves}
              </label>
              <input
                type="range"
                min="1"
                max={Math.floor(formData.maxPlayers / 2)}
                value={formData.numWerewolves}
                onChange={(e) => setFormData({ ...formData, numWerewolves: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Role Toggles */}
            <div className="space-y-3">
              <label className="block text-sm font-medium mb-2">Enable Roles</label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableDoctor}
                  onChange={(e) => setFormData({ ...formData, enableDoctor: e.target.checked })}
                  className="w-5 h-5 accent-olympus-gold"
                />
                <span>Doctor (Can revive players)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableLittleGirl}
                  onChange={(e) => setFormData({ ...formData, enableLittleGirl: e.target.checked })}
                  className="w-5 h-5 accent-olympus-gold"
                />
                <span>Little Girl (Can peek during night phase)</span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
