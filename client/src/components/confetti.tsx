
import { useEffect, useState } from 'react';

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

export default function Confetti({ isActive, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
  }>>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    const newParticles = [];

    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    setParticles(newParticles);

    const animate = () => {
      setParticles(prev => {
        const updated = prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.1, // gravity
          rotation: particle.rotation + particle.rotationSpeed,
        })).filter(particle => particle.y < window.innerHeight + 10);

        if (updated.length === 0 && onComplete) {
          onComplete();
        }

        return updated;
      });
    };

    const interval = setInterval(animate, 16); // ~60fps

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setParticles([]);
      if (onComplete) onComplete();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 opacity-90"
          style={{
            left: particle.x,
            top: particle.y,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  );
}
