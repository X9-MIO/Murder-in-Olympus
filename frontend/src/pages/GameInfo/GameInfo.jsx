import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function GameInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center mb-6">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="mr-4"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">How to Play</h1>
        </div>

        <Card className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-3">Game Overview</h2>
            <p className="text-gray-300">
              Murder in Olympus is a social deduction game where players are secretly assigned roles. 
              Werewolves try to eliminate villagers, while villagers work together to identify and eliminate the werewolves.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Roles</h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-red-400">Werewolf</h3>
                <p className="text-sm text-gray-300">Eliminate villagers during the night phase</p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-blue-400">Villager</h3>
                <p className="text-sm text-gray-300">Vote to eliminate suspected werewolves during the day</p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-green-400">Doctor</h3>
                <p className="text-sm text-gray-300">Revive one player per game</p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-purple-400">Little Girl</h3>
                <p className="text-sm text-gray-300">Peek at werewolf actions during night</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Game Phases</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li><strong>Night Phase:</strong> Werewolves choose a victim, Doctor chooses who to protect</li>
              <li><strong>Day Phase:</strong> All players discuss and vote to eliminate a suspect</li>
              <li>Repeat until one team wins</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Win Conditions</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li><strong>Villagers win:</strong> All werewolves are eliminated</li>
              <li><strong>Werewolves win:</strong> Werewolves equal or outnumber villagers</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
