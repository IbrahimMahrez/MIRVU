import { useEffect, useRef, useState } from 'react';

export function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  status, 
  speaking = false,
  className = '',
  ring = false,
  ...props 
}) {
  const [imageError, setImageError] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg',
    '2xl': 'w-32 h-32 text-xl',
    '3xl': 'w-40 h-40 text-2xl',
  };

  // Generate gradient avatar from initials
  const getInitials = (name) => {
    if (!name) return 'AI';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name) => {
    if (!name) return 0;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const renderCanvasAvatar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const name = alt || 'AI';
    const initials = getInitials(name);
    const hue = getColorFromName(name) % 360;
    
    // Clear
    ctx.clearRect(0, 0, size, size);
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
    gradient.addColorStop(1, `hsl(${hue + 30}, 70%, 40%)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.35}px Inter, system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size/2, size/2 + size * 0.05);
  };

  useEffect(() => {
    if (!src && canvasRef.current) {
      renderCanvasAvatar();
    }
  }, [src, alt]);

  // Speaking animation
  useEffect(() => {
    if (speaking) {
      animationRef.current = requestAnimationFrame(function animate() {
        if (canvasRef.current && !src) {
          renderCanvasAvatar();
        }
        animationRef.current = requestAnimationFrame(animate);
      });
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speaking, src]);

  return (
    <div className="relative inline-flex" {...props}>
      <div className={`
        avatar relative overflow-hidden rounded-full border border-border-primary
        bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20
        ${sizes[size]} ${className}
      `}>
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={sizes[size].match(/\d+/)?.[0] || 48}
            height={sizes[size].match(/\d+/)?.[0] || 48}
            className="w-full h-full"
          />
        )}
        
        {speaking && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 animate-pulse-slow" />
        )}
        
        {ring && (
          <div className="absolute -inset-1 rounded-full border-2 border-accent-primary/50 animate-pulse-slow" />
        )}
      </div>
      
      {status && (
        <span className={`
          status-dot absolute bottom-0 right-0 border-2 border-bg-primary
          ${size === 'xs' || size === 'sm' ? '-bottom-0.5 -right-0.5' : size === 'lg' ? '-bottom-1 -right-1' : size === 'xl' ? '-bottom-1.5 -right-1.5' : '-bottom-0.5 -right-0.5'}
          ${size === 'xl' ? 'w-3 h-3' : size === '2xl' ? 'w-4 h-4' : size === '3xl' ? 'w-5 h-5' : 'w-2.5 h-2.5'}
        `}>
          <span className="absolute inset-0 rounded-full animate-pulse-slow opacity-75" style={{ backgroundColor: 'inherit' }} />
        </span>
      )}
    </div>
  );
}

export function AIInterviewerAvatar({ 
  size = 'xl', 
  speaking = false, 
  listening = false,
  className = '',
  ...props 
}) {
  const canvasRef = useRef(null);
  const [waveform, setWaveform] = useState(Array(16).fill(0.1));

  useEffect(() => {
    if (speaking) {
      const interval = setInterval(() => {
        setWaveform(prev => prev.map(() => Math.random() * 0.8 + 0.2));
      }, 80);
      return () => clearInterval(interval);
    } else if (listening) {
      const interval = setInterval(() => {
        setWaveform(prev => prev.map((v, i) => {
          const wave = Math.sin(Date.now() / 200 + i * 0.5) * 0.3 + 0.4;
          return Math.max(0.1, wave);
        }));
      }, 50);
      return () => clearInterval(interval);
    } else {
      setWaveform(Array(16).fill(0.15));
    }
  }, [speaking, listening]);

  const sizes = {
    sm: 64,
    md: 96,
    lg: 128,
    xl: 160,
    '2xl': 200,
  };

  const sizeValue = sizes[size] || 160;

  return (
    <div className="relative flex items-center justify-center" {...props}>
      {/* Outer glow ring when speaking */}
      {speaking && (
        <div className={`
          absolute inset-0 rounded-full border-2 border-accent-primary/30 animate-pulse-slow
          ${size === 'xl' ? '-inset-4' : size === '2xl' ? '-inset-6' : '-inset-3'}
        `} />
      )}
      
      {/* Main avatar */}
      <div className="relative flex items-center justify-center" style={{ width: sizeValue, height: sizeValue }}>
        {/* Background gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-primary/30 via-accent-primary/10 to-accent-secondary/30" />
        
        {/* Animated rings */}
        <div className={`
          absolute inset-2 rounded-full border border-accent-primary/20 
          ${speaking ? 'animate-pulse-slow' : ''}
        `} />
        <div className={`
          absolute inset-6 rounded-full border border-accent-primary/10 
          ${speaking ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}
        `} />
        
        {/* Core circle */}
        <div className={`
          relative rounded-full bg-gradient-to-br from-bg-card to-bg-card-hover 
          flex items-center justify-center
          ${speaking ? 'shadow-glow-md' : 'shadow-[0_0_20px_rgba(0,0,0,0.5)]'}
        `} style={{ width: sizeValue * 0.85, height: sizeValue * 0.85 }}>
          
          {/* Waveform visualization */}
          <div className="flex items-center justify-center h-full w-full px-4">
            <div className="waveform waveform-speaking h-1/2 w-full">
              {waveform.map((height, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{ 
                    height: `${height * 100}%`,
                    animationDelay: `${i * 50}ms`,
                    background: speaking 
                      ? `linear-gradient(to top, #087CFF, #00A6FF)` 
                      : listening 
                        ? `linear-gradient(to top, #087CFF/80, #00A6FF/60)`
                        : '#14243A'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Center AI indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-text-muted text-xs font-mono opacity-60">
            <span className={speaking ? 'text-accent-primary animate-pulse' : 'text-text-muted'}>
              {speaking ? 'SPEAKING' : listening ? 'LISTENING' : 'READY'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Status indicator */}
      <div className={`
        absolute bottom-0 right-0 w-5 h-5 rounded-full border-3 border-bg-primary flex items-center justify-center
        ${speaking ? 'bg-status-success animate-pulse-slow' : listening ? 'bg-status-warning' : 'bg-text-muted'}
      `}>
        {speaking && <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse-slow" />}
        {listening && <div className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />}
      </div>
    </div>
  );
}