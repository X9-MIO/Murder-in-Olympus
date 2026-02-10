import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Settings() {
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
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Audio Settings</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span>Sound Effects</span>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span>Background Music</span>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </label>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Display Settings</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span>Animations</span>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Version 1.0.0 - Made by Team Olympus
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
