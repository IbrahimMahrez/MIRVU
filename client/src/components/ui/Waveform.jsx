import { useEffect, useRef, useState } from 'react';

export function Waveform({ 
  speaking = false, 
  listening = false, 
  bars = 16, 
  height = 48, 
  className = '',
  color = 'accent',
  ...props 
}) {
  const [levels, setLevels] = useState(() => Array(bars).fill(0.1));
  const intervalRef = useRef(null);

  const colors = {
    accent: speaking ? 'bg-gradient-to-t from-accent-primary to-accent-secondary' : 'bg-border-primary',
    success: 'bg-gradient-to-t from-status-success to-emerald-400',
    warning: 'bg-gradient-to-t from-status-warning to-amber-400',
    danger: 'bg-gradient-to-t from-status-danger to-red-400',
  };

  useEffect(() => {
    if (speaking) {
      intervalRef.current = setInterval(() => {
        setLevels(prev => prev.map(() => Math.random() * 0.85 + 0.15));
      }, 60);
    } else if (listening) {
      intervalRef.current = setInterval(() => {
        const time = Date.now() / 150;
        setLevels(prev => prev.map((_, i) => {
          const wave = Math.sin(time + i * 0.4) * 0.35 + 0.45;
          return Math.max(0.1, wave);
        }));
      }, 40);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setLevels(Array(bars).fill(0.12));
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speaking, listening, bars]);

  return (
    <div 
      className={`waveform flex items-end gap-1 ${className}`}
      style={{ height }}
      role="img"
      aria-label={speaking ? 'AI speaking' : listening ? 'AI listening' : 'Audio visualization'}
      {...props}
    >
      {levels.map((level, i) => (
        <div
          key={i}
          className={`
            waveform-bar flex-1 max-w-1.5 rounded-sm transition-all duration-70 ease-out
            ${colors[color]}
          `}
          style={{ 
            height: `${level * 100}%`,
            animationDelay: `${i * 40}ms`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}

export function CircularWaveform({ 
  speaking = false, 
  listening = false, 
  size = 120, 
  className = '',
  ...props 
}) {
  const [levels, setLevels] = useState(() => Array(32).fill(0.1));
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    if (speaking) {
      intervalRef.current = setInterval(() => {
        setLevels(prev => prev.map(() => Math.random() * 0.8 + 0.2));
      }, 50);
    } else if (listening) {
      intervalRef.current = setInterval(() => {
        const time = Date.now() / 100;
        setLevels(prev => prev.map((_, i) => {
          const wave = Math.sin(time + i * 0.2) * 0.3 + 0.4;
          return Math.max(0.1, wave);
        }));
      }, 30);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setLevels(Array(32).fill(0.15));
    }

    const animate = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.clearRect(0, 0, size, size);
      
      const center = size / 2;
      const radius = size * 0.35;
      const bars = levels.length;
      
      // Draw background circle
      ctx.beginPath();
      ctx.arc(center, center, radius * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = '#14243A';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw bars
      levels.forEach((level, i) => {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const barLength = radius * level;
        const innerRadius = radius * 0.4;
        
        const x1 = center + Math.cos(angle) * innerRadius;
        const y1 = center + Math.sin(angle) * innerRadius;
        const x2 = center + Math.cos(angle) * (innerRadius + barLength);
        const y2 = center + Math.sin(angle) * (innerRadius + barLength);
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, '#087CFF');
        gradient.addColorStop(1, '#00A6FF');
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = speaking ? gradient : '#14243A';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
      
      // Center circle
      ctx.beginPath();
      ctx.arc(center, center, innerRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = speaking ? 'rgba(8, 124, 255, 0.2)' : '#0B1322';
      ctx.fill();
      ctx.strokeStyle = '#14243A';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      if (speaking || listening) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speaking, listening, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
      aria-label={speaking ? 'AI speaking visualization' : listening ? 'AI listening visualization' : 'Audio visualization'}
      {...props}
    />
  );
}