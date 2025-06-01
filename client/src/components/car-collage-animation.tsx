
import { useEffect, useState } from 'react';
import { Car, Users } from 'lucide-react';

interface FloatingCar {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: number;
  opacity: number;
}

export default function CarCollageAnimation() {
  const [cars, setCars] = useState<FloatingCar[]>([]);

  useEffect(() => {
    // Initialize floating cars
    const initialCars: FloatingCar[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 15,
      speed: Math.random() * 0.5 + 0.2,
      direction: Math.random() * 360,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    
    setCars(initialCars);

    const interval = setInterval(() => {
      setCars(prevCars => 
        prevCars.map(car => ({
          ...car,
          x: (car.x + Math.cos(car.direction) * car.speed + 100) % 100,
          y: (car.y + Math.sin(car.direction) * car.speed + 100) % 100,
          direction: car.direction + (Math.random() - 0.5) * 0.1,
        }))
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 animate-pulse" 
           style={{ animationDuration: '4s' }} />
      
      {/* Floating cars */}
      {cars.map((car) => (
        <div
          key={car.id}
          className="absolute transition-all duration-100 ease-linear"
          style={{
            left: `${car.x}%`,
            top: `${car.y}%`,
            opacity: car.opacity,
            transform: `rotate(${car.direction}deg)`,
          }}
        >
          {car.id % 2 === 0 ? (
            <Car 
              size={car.size} 
              className="text-blue-600 drop-shadow-lg animate-bounce opacity-60"
              style={{ animationDelay: `${car.id * 0.5}s`, animationDuration: '2s' }}
            />
          ) : (
            <Users 
              size={car.size} 
              className="text-purple-600 drop-shadow-lg animate-pulse opacity-60"
              style={{ animationDelay: `${car.id * 0.3}s`, animationDuration: '3s' }}
            />
          )}
        </div>
      ))}
      
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23667eea' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3Ccircle cx='10' cy='10' r='1'/%3E%3Ccircle cx='50' cy='10' r='1'/%3E%3Ccircle cx='10' cy='50' r='1'/%3E%3Ccircle cx='50' cy='50' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
