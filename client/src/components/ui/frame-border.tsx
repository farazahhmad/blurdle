import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react';

export interface FrameBorderHandle {
  pulse: (x?: number, y?: number) => void;
  replay: () => void;
}

export interface FrameBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  background?: string;
  radius?: number;
  lineWidth?: number;
  inset?: number;
  glow?: number;
  glowWidth?: number;
  noise?: number;
  noiseScale?: number;
  flowSpeed?: number;
  pulseSpeed?: number;
  idlePulses?: number;
  idleSpeed?: number;
  idleStrength?: number;
  intensity?: number;
  opacity?: number;
  grain?: number;
  interactive?: boolean;
  intro?: boolean;
  paused?: boolean;
  dpr?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
  color?: string; // Hex or rgb, defaults to cinema accent '#e8a045'
}

interface PulseEvent {
  startDistance: number;
  progress: number;
  speed: number;
}

export const FrameBorder = forwardRef<FrameBorderHandle, FrameBorderProps>(
  (
    {
      children,
      background = 'transparent',
      radius = 20,
      lineWidth = 1,
      inset = 0,
      glow = 0.1,
      glowWidth = 16,
      noise = 0.15,
      noiseScale = 2,
      flowSpeed = 0.6,
      pulseSpeed = 1.0,
      idlePulses = 1,
      idleSpeed = 0.5,
      idleStrength = 0.3,
      intensity = 0.8,
      opacity = 0.85,
      grain = 0,
      interactive = true,
      intro = false,
      paused = false,
      dpr = 2,
      width = '100%',
      height = '100%',
      className = '',
      color = '#ffffff',
      style,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isHovered, setIsHovered] = useState(false);
    const introProgressRef = useRef(intro ? 0 : 1);
    const flowOffsetRef = useRef(0);
    const pulsesRef = useRef<PulseEvent[]>([]);
    const lastTimeRef = useRef(performance.now());
    const animFrameRef = useRef<number | null>(null);

    // Parse base color components
    const parseColor = useCallback((hex: string) => {
      let c = hex.replace('#', '');
      if (c.length === 3) {
        c = c.split('').map((x) => x + x).join('');
      }
      const num = parseInt(c, 16);
      if (isNaN(num)) return { r: 232, g: 160, b: 69 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }, []);

    const rgb = parseColor(color);

    // Calculate perimeter path coordinates
    const getPerimeterPoint = (
      dist: number,
      totalLength: number,
      w: number,
      h: number,
      r: number
    ) => {
      const straightTop = Math.max(0, w - 2 * r);
      const straightRight = Math.max(0, h - 2 * r);
      const straightBottom = Math.max(0, w - 2 * r);
      const straightLeft = Math.max(0, h - 2 * r);
      const arcLen = (Math.PI / 2) * r;

      let d = ((dist % totalLength) + totalLength) % totalLength;

      // 1. Top edge (left to right)
      if (d <= straightTop) {
        return { x: r + d, y: 0 };
      }
      d -= straightTop;

      // 2. Top-right corner
      if (d <= arcLen) {
        const theta = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
        return {
          x: w - r + Math.cos(theta) * r,
          y: r + Math.sin(theta) * r,
        };
      }
      d -= arcLen;

      // 3. Right edge (top to bottom)
      if (d <= straightRight) {
        return { x: w, y: r + d };
      }
      d -= straightRight;

      // 4. Bottom-right corner
      if (d <= arcLen) {
        const theta = 0 + (d / arcLen) * (Math.PI / 2);
        return {
          x: w - r + Math.cos(theta) * r,
          y: h - r + Math.sin(theta) * r,
        };
      }
      d -= arcLen;

      // 5. Bottom edge (right to left)
      if (d <= straightBottom) {
        return { x: w - r - d, y: h };
      }
      d -= straightBottom;

      // 6. Bottom-left corner
      if (d <= arcLen) {
        const theta = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
        return {
          x: r + Math.cos(theta) * r,
          y: h - r + Math.sin(theta) * r,
        };
      }
      d -= arcLen;

      // 7. Left edge (bottom to top)
      if (d <= straightLeft) {
        return { x: 0, y: h - r - d };
      }
      d -= straightLeft;

      // 8. Top-left corner
      const theta = Math.PI + (d / Math.max(0.001, arcLen)) * (Math.PI / 2);
      return {
        x: r + Math.cos(theta) * r,
        y: r + Math.sin(theta) * r,
      };
    };

    // Find closest distance on perimeter to point (x, y)
    const findClosestPerimeterDistance = (
      px: number,
      py: number,
      w: number,
      h: number,
      totalLength: number
    ) => {
      let minDist = Infinity;
      let bestD = 0;
      const steps = 60;
      for (let i = 0; i < steps; i++) {
        const d = (i / steps) * totalLength;
        const pt = getPerimeterPoint(d, totalLength, w, h, radius);
        const distSq = (pt.x - px) ** 2 + (pt.y - py) ** 2;
        if (distSq < minDist) {
          minDist = distSq;
          bestD = d;
        }
      }
      return bestD;
    };

    const triggerPulseAt = (x?: number, y?: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clickX = x !== undefined ? x : rect.width / 2;
      const clickY = y !== undefined ? y : 0;
      const rClamped = Math.min(radius, rect.width / 2, rect.height / 2);
      const totalLen = 2 * (rect.width + rect.height - 4 * rClamped) + 2 * Math.PI * rClamped;
      const startD = findClosestPerimeterDistance(clickX, clickY, rect.width, rect.height, totalLen);

      pulsesRef.current.push({
        startDistance: startD,
        progress: 0,
        speed: 1.5 * pulseSpeed,
      });
    };

    useImperativeHandle(ref, () => ({
      pulse: (x, y) => triggerPulseAt(x, y),
      replay: () => {
        introProgressRef.current = 0;
      },
    }));

    // Main Canvas Render Loop
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let destroyed = false;

      const render = (time: number) => {
        if (destroyed) return;

        const dt = Math.min(0.1, (time - lastTimeRef.current) / 1000);
        lastTimeRef.current = time;

        const rect = container.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        if (w <= 0 || h <= 0) {
          animFrameRef.current = requestAnimationFrame(render);
          return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, dpr);
        const targetW = Math.round(w * pixelRatio);
        const targetH = Math.round(h * pixelRatio);

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, w, h);

        const effRadius = Math.max(2, Math.min(radius, (w - 2 * inset) / 2, (h - 2 * inset) / 2));
        const effW = Math.max(0, w - 2 * inset);
        const effH = Math.max(0, h - 2 * inset);
        const totalPerimeter =
          2 * (effW + effH - 4 * effRadius) + 2 * Math.PI * effRadius;

        // Intro progression
        if (introProgressRef.current < 1) {
          introProgressRef.current = Math.min(1, introProgressRef.current + dt * 1.6);
        }

        // Flow speed with hover boost
        if (!paused) {
          const speedMultiplier = isHovered && interactive ? 2.2 : 1;
          flowOffsetRef.current =
            (flowOffsetRef.current + dt * 45 * flowSpeed * speedMultiplier) % totalPerimeter;

          // Update pulses
          pulsesRef.current = pulsesRef.current
            .map((p) => ({
              ...p,
              progress: p.progress + dt * p.speed * 0.9,
            }))
            .filter((p) => p.progress < 1);
        }

        // Draw Frame Path
        const drawRoundedFrame = (offset: number) => {
          ctx.beginPath();
          ctx.roundRect(
            inset + offset,
            inset + offset,
            effW - 2 * offset,
            effH - 2 * offset,
            Math.max(0, effRadius - offset)
          );
        };

        // 1. Soft inner and outer ambient glow
        if (glow > 0) {
          ctx.save();
          drawRoundedFrame(0);
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.18 * glow * intensity * opacity * introProgressRef.current})`;
          ctx.lineWidth = Math.max(lineWidth, lineWidth + 2);
          ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.7 * glow * intensity})`;
          ctx.shadowBlur = Math.min(glowWidth, 32);
          ctx.stroke();
          ctx.restore();
        }

        // 2. Base crisp border line
        ctx.save();
        drawRoundedFrame(0);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.35 * intensity * opacity * introProgressRef.current})`;
        ctx.stroke();
        ctx.restore();

        // 3. Dynamic traveling light highlights & idle swells
        if (totalPerimeter > 0 && introProgressRef.current > 0.05) {
          const numSwells = Math.max(0, idlePulses);
          const activeSwells = [
            flowOffsetRef.current,
            ...Array.from({ length: numSwells }, (_, i) =>
              (flowOffsetRef.current + ((i + 1) * totalPerimeter) / (numSwells + 1)) % totalPerimeter
            ),
          ];

          activeSwells.forEach((swellPos, idx) => {
            const swellStrength = idx === 0 ? 1 : idleStrength * 0.65;
            const swellLen = Math.min(effW * 0.45, 120);

            // Draw glowing segment
            const segments = 16;
            for (let s = 0; s < segments; s++) {
              const fraction = s / segments;
              const alphaCurve = Math.sin(fraction * Math.PI) ** 1.8;
              const segDist = swellPos - swellLen / 2 + fraction * swellLen;

              const pt = getPerimeterPoint(segDist, totalPerimeter, effW, effH, effRadius);
              const nextPt = getPerimeterPoint(
                segDist + swellLen / segments,
                totalPerimeter,
                effW,
                effH,
                effRadius
              );

              // Sub-pixel noise offset
              const noiseJitter = (Math.sin(segDist * 0.1 * noiseScale + time * 0.003) * noise) * 0.7;

              ctx.beginPath();
              ctx.moveTo(inset + pt.x + noiseJitter, inset + pt.y + noiseJitter);
              ctx.lineTo(inset + nextPt.x, inset + nextPt.y);
              ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${
                alphaCurve * swellStrength * intensity * opacity * introProgressRef.current * 0.95
              })`;
              ctx.lineWidth = lineWidth + 1.2 * alphaCurve;
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          });

          // 4. Twin click pulses
          pulsesRef.current.forEach((pulse) => {
            const pulseLen = 80;
            const pulseDist = pulse.progress * totalPerimeter * 0.6;
            const pulseAlpha = Math.max(0, 1 - pulse.progress);

            // Twin waves moving in opposite directions
            [-1, 1].forEach((dir) => {
              const headDist = pulse.startDistance + dir * pulseDist;
              for (let s = 0; s < 12; s++) {
                const fraction = s / 12;
                const alphaCurve = Math.sin(fraction * Math.PI);
                const pDist = headDist - (dir * (pulseLen * (1 - fraction)));

                const pt = getPerimeterPoint(pDist, totalPerimeter, effW, effH, effRadius);
                const nextPt = getPerimeterPoint(pDist + dir * (pulseLen / 12), totalPerimeter, effW, effH, effRadius);

                ctx.beginPath();
                ctx.moveTo(inset + pt.x, inset + pt.y);
                ctx.lineTo(inset + nextPt.x, inset + nextPt.y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${alphaCurve * pulseAlpha * 0.9})`;
                ctx.lineWidth = lineWidth + 2 * alphaCurve;
                ctx.stroke();
              }
            });
          });
        }

        // 5. Film grain overlay texture
        if (grain > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 * grain})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        ctx.restore();

        if (!paused) {
          animFrameRef.current = requestAnimationFrame(render);
        }
      };

      animFrameRef.current = requestAnimationFrame(render);

      return () => {
        destroyed = true;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, [
      radius,
      lineWidth,
      inset,
      glow,
      glowWidth,
      noise,
      noiseScale,
      flowSpeed,
      pulseSpeed,
      idlePulses,
      idleSpeed,
      idleStrength,
      intensity,
      opacity,
      grain,
      interactive,
      paused,
      dpr,
      rgb,
      isHovered,
    ]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactive && !paused) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          triggerPulseAt(e.clientX - rect.left, e.clientY - rect.top);
        }
      }
      props.onClick?.(e);
    };

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{
          width,
          height,
          backgroundColor: background,
          borderRadius: `${radius}px`,
          ...style,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        {...props}
      >
        {/* Animated Crisp Glowing Light Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10 block w-full h-full"
        />

        {/* Inner Content Layer */}
        <div className="relative z-20 w-full h-full">{children}</div>
      </div>
    );
  }
);

FrameBorder.displayName = 'FrameBorder';

export default FrameBorder;
