
import { useEffect, useState } from 'react';
import { Car, Users } from 'lucide-react';

interface FloatingIcon {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  directionX: number;
  directionY: number;
  opacity: number;
  type: 'car' | 'users';
}

export default function CarCollageAnimation() {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    console.log('CarCollageAnimation: Initializing icons...');
    
    // Initialize floating icons with much larger visibility
    const initialIcons: FloatingIcon[] = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60, // Keep well away from edges
      y: 20 + Math.random() * 60,
      size: 80 + Math.random() * 40, // Even larger icons (80-120px)
      speed: Math.random() * 0.2 + 0.1, // Slower for better visibility
      directionX: (Math.random() - 0.5) * 2,
      directionY: (Math.random() - 0.5) * 2,
      opacity: 1, // Maximum visibility
      type: i % 2 === 0 ? 'car' : 'users',
    }));
    
    setIcons(initialIcons);
    console.log('CarCollageAnimation: Icons set:', initialIcons);

    const interval = setInterval(() => {
      setIcons(prevIcons => 
        prevIcons.map(icon => {
          let newX = icon.x + icon.directionX * icon.speed;
          let newY = icon.y + icon.directionY * icon.speed;
          let newDirectionX = icon.directionX;
          let newDirectionY = icon.directionY;

          // Bounce off edges with better boundaries
          if (newX <= 2 || newX >= 93) {
            newDirectionX = -icon.directionX;
            newX = Math.max(2, Math.min(93, newX));
          }
          if (newY <= 2 || newY >= 93) {
            newDirectionY = -icon.directionY;
            newY = Math.max(2, Math.min(93, newY));
          }

          return {
            ...icon,
            x: newX,
            y: newY,
            directionX: newDirectionX,
            directionY: newDirectionY,
          };
        })
      );
    }, 60); // Smoother animation

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Lighter background for better icon contrast */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
        style={{
          animation: 'pulse 10s ease-in-out infinite',
        }}
      />
      
      {/* Debug indicator */}
      <div className="absolute top-4 left-4 text-xs text-gray-600 z-10 pointer-events-none">
        Animation Active ({icons.length} icons)
      </div>
      
      {/* Floating icons */}
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute transition-all duration-100 ease-linear transform"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            opacity: icon.opacity,
            transform: 'translate(-50%, -50%)', // Center the icons
          }}
        >
          {icon.type === 'car' ? (
            <Car 
              size={icon.size} 
              className="text-blue-600 animate-bounce"
              style={{ 
                animationDelay: `${icon.id * 0.5}s`, 
                animationDuration: '2s',
                filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.8))',
                strokeWidth: 3,
                fill: 'rgba(59, 130, 246, 0.2)'
              }}
            />
          ) : (
            <Users 
              size={icon.size} 
              className="text-purple-600 animate-pulse"
              style={{ 
                animationDelay: `${icon.id * 0.4}s`, 
                animationDuration: '3s',
                filter: 'drop-shadow(0 4px 8px rgba(147, 51, 234, 0.8))',
                strokeWidth: 3,
                fill: 'rgba(147, 51, 234, 0.2)'
              }}
            />
          )}
        </div>
      ))}
      
      {/* Subtle dot pattern overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 2px, transparent 2px), radial-gradient(circle at 75% 75%, #8b5cf6 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
