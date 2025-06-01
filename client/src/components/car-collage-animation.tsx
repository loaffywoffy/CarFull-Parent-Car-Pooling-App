
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
    // Initialize floating icons
    const initialIcons: FloatingIcon[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 90,
      y: Math.random() * 90,
      size: Math.random() * 15 + 20,
      speed: Math.random() * 0.3 + 0.1,
      directionX: (Math.random() - 0.5) * 2,
      directionY: (Math.random() - 0.5) * 2,
      opacity: Math.random() * 0.4 + 0.2,
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

          // Bounce off edges
          if (newX <= 0 || newX >= 95) {
            newDirectionX = -icon.directionX;
            newX = Math.max(0, Math.min(95, newX));
          }
          if (newY <= 0 || newY >= 95) {
            newDirectionY = -icon.directionY;
            newY = Math.max(0, Math.min(95, newY));
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
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 opacity-60"
        style={{
          animation: 'pulse 6s ease-in-out infinite',
        }}
      />
      
      {/* Floating icons */}
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute transition-all duration-75 ease-linear"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            opacity: icon.opacity,
          }}
        >
          {icon.type === 'car' ? (
            <Car 
              size={icon.size} 
              className="text-blue-600 drop-shadow-md animate-pulse"
              style={{ 
                animationDelay: `${icon.id * 0.5}s`, 
                animationDuration: '3s' 
              }}
            />
          ) : (
            <Users 
              size={icon.size} 
              className="text-purple-600 drop-shadow-md animate-bounce"
              style={{ 
                animationDelay: `${icon.id * 0.3}s`, 
                animationDuration: '4s' 
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
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}
