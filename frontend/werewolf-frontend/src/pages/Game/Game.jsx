import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Game() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { 
    roomCode, 
    players, 
    setPlayers,
    role, 
    setRole,
    gameState, 
    setGameState,
    messages,
    addMessage 
  } = useGame();

  const [chatInput, setChatInput] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    // BACKEND: Listen for role assignment
    socket.on('role-assigned', (data) => {
      setRole(data.role);
    });

    // BACKEND: Listen for game state updates
    socket.on('game-state-update', (data) => {
      setGameState(data.gameState);
      setPlayers(data.players);
    });

    // BACKEND: Listen for chat messages
    socket.on('chat-message', (data) => {
      addMessage({
        sender: data.sender,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // BACKEND: Listen for phase changes
    socket.on('phase-change', (data) => {
      setGameState(prev => ({
        ...prev,
        phase: data.phase,
        round: data.round || prev.round,
      }));
    });

    // BACKEND: Listen for game end
    socket.on('game-ended', (data) => {
      alert(`Game Over! ${data.winner} wins!`);
      navigate('/');
    });

    return () => {
      socket.off('role-assigned');
      socket.off('game-state-update');
      socket.off('chat-message');
      socket.off('phase-change');
      socket.off('game-ended');
    };
  }, [socket, roomCode, navigate, setRole, setGameState, setPlayers, addMessage]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    // BACKEND: Emit chat message
    socket.emit('send-message', {
      roomCode,
      message: chatInput,
    });

    setChatInput('');
  };

  const handleVote = () => {
    if (!selectedTarget) return;

    // BACKEND: Emit vote
    socket.emit('vote', {
      roomCode,
      targetId: selectedTarget,
    });

    setSelectedTarget(null);
  };

  const handleNightAction = () => {
    if (!selectedTarget) return;

    // BACKEND: Emit night action (kill for werewolf, revive for doctor)
    socket.emit('night-action', {
      roomCode,
      targetId: selectedTarget,
      action: role === 'werewolf' ? 'kill' : 'revive',
    });

    setSelectedTarget(null);
  };

  const alivePlayers = players.filter(p => p.isAlive);
  const deadPlayers = players.filter(p => !p.isAlive);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Murder in Olympus</h1>
          <div className="flex justify-center gap-6 text-sm">
            <span className="text-olympus-gold">Room: {roomCode}</span>
            <span>Round: {gameState.round}</span>
            <span className="capitalize">Phase: {gameState.phase}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Player List */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-xl font-bold mb-4">Players</h2>
              
              {/* Your Role */}
              {role && (
                <div className="mb-4 p-3 bg-olympus-purple rounded-lg">
                  <p className="text-sm text-gray-300">Your Role</p>
                  <p className="text-lg font-bold capitalize">{role}</p>
                </div>
              )}

              {/* Alive Players */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2 text-green-400">
                  Alive ({alivePlayers.length})
                </h3>
                <div className="space-y-2">
                  {alivePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="p-2 bg-gray-800 rounded flex items-center justify-between"
                    >
                      <span>{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dead Players */}
              {deadPlayers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-red-400">
                    Dead ({deadPlayers.length})
                  </h3>
                  <div className="space-y-2 opacity-50">
                    {deadPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="p-2 bg-gray-800 rounded line-through"
                      >
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Middle Column: Chat */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <h2 className="text-xl font-bold mb-4">Chat</h2>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No messages yet...
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={index} className="p-2 bg-gray-800 rounded">
                      <p className="text-xs text-olympus-gold">{msg.sender}</p>
                      <p>{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-olympus-gold focus:outline-none"
                />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Actions */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-xl font-bold mb-4">Actions</h2>

              {/* Day Phase - Voting */}
              {gameState.phase === 'day' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Vote to Eliminate</h3>
                  <div className="space-y-2 mb-4">
                    {alivePlayers.map((player) => (
                      <label
                        key={player.id}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                      >
                        <input
                          type="radio"
                          name="vote"
                          value={player.id}
                          checked={selectedTarget === player.id}
                          onChange={() => setSelectedTarget(player.id)}
                          className="w-4 h-4"
                        />
                        <span>{player.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleVote}
                    disabled={!selectedTarget}
                    className="w-full"
                    variant="primary"
                  >
                    Cast Vote
                  </Button>
                </div>
              )}

              {/* Night Phase - Werewolf */}
              {gameState.phase === 'night' && role === 'werewolf' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-red-400">
                    Choose Target to Kill
                  </h3>
                  <div className="space-y-2 mb-4">
                    {alivePlayers
                      .filter(p => p.role !== 'werewolf')
                      .map((player) => (
                        <label
                          key={player.id}
                          className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                        >
                          <input
                            type="radio"
                            name="target"
                            value={player.id}
                            checked={selectedTarget === player.id}
                            onChange={() => setSelectedTarget(player.id)}
                            className="w-4 h-4"
                          />
                          <span>{player.name}</span>
                        </label>
                      ))}
                  </div>
                  <Button
                    onClick={handleNightAction}
                    disabled={!selectedTarget}
                    className="w-full"
                    variant="primary"
                  >
                    Confirm Kill
                  </Button>
                </div>
              )}

              {/* Night Phase - Doctor */}
              {gameState.phase === 'night' && role === 'doctor' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-400">
                    Choose Player to Revive
                  </h3>
                  <div className="space-y-2 mb-4">
                    {alivePlayers.map((player) => (
                      <label
                        key={player.id}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                      >
                        <input
                          type="radio"
                          name="target"
                          value={player.id}
                          checked={selectedTarget === player.id}
                          onChange={() => setSelectedTarget(player.id)}
                          className="w-4 h-4"
                        />
                        <span>{player.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleNightAction}
                    disabled={!selectedTarget}
                    className="w-full"
                    variant="secondary"
                  >
                    Confirm Revive
                  </Button>
                </div>
              )}

              {/* Night Phase - Villager */}
              {gameState.phase === 'night' && role === 'villager' && (
                <div className="text-center py-8 text-gray-400">
                  <p>You are asleep...</p>
                  <p className="text-sm mt-2">Wait for the night phase to end</p>
                </div>
              )}

              {/* Lobby Phase */}
              {gameState.phase === 'lobby' && (
                <div className="text-center py-8 text-gray-400">
                  <p>Waiting for game to start...</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
