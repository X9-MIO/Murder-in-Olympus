import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoleReveal() {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const revealTimer = setTimeout(() => setIsFlipped(true), 2000);
    const navTimer = setTimeout(() => navigate('/game'), 5000);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {/* 1. Perspective container: gives the 3D depth */}
      <div className="w-[70vw] md:w-[350px] aspect-[2/3] [perspective:1000px]">
        
        {/* 2. Inner Wrapper: Handles the rotation state */}
        <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          
          {/* 3. Back Side (Shows first) */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
            <img 
              src="/back_card.png" 
              alt="Card Back"
              className="w-full h-full object-cover rounded-xl" 
            />
          </div>

          {/* 4. Front Side (Shows after flip) */}
          {/* Note: we rotate this 180deg initially so it's "behind" the back */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <img 
              src="/wolf.png" 
              alt="Wolf Card"
              className="w-full h-full object-cover rounded-xl" 
            />
          </div>

        </div>
      </div>
    </div>
  );
}