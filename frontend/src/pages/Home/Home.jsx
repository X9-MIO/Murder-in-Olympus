import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section - REPLACE WITH YOUR CUSTOM LOGO */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {/* TODO: Replace this with your custom logo image */}
            {/* <img src="/logo.png" alt="Murder in Olympus" className="mx-auto w-32 h-32" /> */}
            🏛️
          </div>
          <h1 className="text-4xl font-bold mb-2">Murder in Olympus</h1>
          <p className="text-olympus-gold text-sm uppercase tracking-widest">
            Social Deduction Game
          </p>
        </div>

        {/* Main Menu Card */}
        <Card>
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/create')}
              className="w-full"
              variant="primary"
            >
              Create Room
            </Button>

            <Button
              onClick={() => navigate('/join')}
              className="w-full"
              variant="secondary"
            >
              Join Game
            </Button>

            <Button
              onClick={() => navigate('/info')}
              className="w-full"
              variant="outline"
            >
              Game Info
            </Button>

            <Button
              onClick={() => navigate('/settings')}
              className="w-full"
              variant="outline"
            >
              Settings
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>Made by Team Olympus</p>
        </div>
      </div>
    </div>
  );
}
