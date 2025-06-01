
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
    // Initialize floating icons with better visibility
    const initialIcons: FloatingIcon[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 85 + 5, // Keep away from edges
      y: Math.random() * 85 + 5,
      size: Math.random() * 20 + 25, // Larger icons
      speed: Math.random() * 0.5 + 0.2, // Faster movement
      directionX: (Math.random() - 0.5) * 2,
      directionY: (Math.random() - 0.5) * 2,
      opacity: Math.random() * 0.4 + 0.5, // More visible
      type: i % 2 === 0 ? 'car' : 'users',
    }));
    
    setIcons(initialIcons);

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
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100"
        style={{
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      
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
              className="text-blue-600 drop-shadow-lg animate-bounce"
              style={{ 
                animationDelay: `${icon.id * 0.4}s`, 
                animationDuration: '2s',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
              }}
            />
          ) : (
            <Users 
              size={icon.size} 
              className="text-purple-600 drop-shadow-lg animate-pulse"
              style={{ 
                animationDelay: `${icon.id * 0.3}s`, 
                animationDuration: '2.5s',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
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
