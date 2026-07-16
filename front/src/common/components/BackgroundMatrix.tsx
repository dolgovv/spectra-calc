import { useEffect, useRef } from 'react';

const PALETTE = ['#1F5C4E', '#2E7B67', '#3FBE93', '#B24A2B', '#C96A3B', '#B23568', '#C9487E'];
const GRID_STEP = 64;

interface Blob {
  x: number;
  y: number;
  r: number;
  c: string;
  a: number;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/**
 * Blurred colour field behind the page: a scatter of soft blobs under a faint graph grid.
 * Painted once per viewport size (it is static, not animated) and re-seeded on resize.
 */
export default function BackgroundMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let blobs: Blob[] = [];

    function seed(w: number, h: number) {
      const count = Math.floor((w * h) / 140000) + 14;
      blobs = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: rand(140, 340),
        c: PALETTE[Math.floor(rand(0, PALETTE.length))],
        a: rand(0.1, 0.3),
      }));
    }

    function draw(w: number, h: number) {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#0A0A0C';
      ctx.fillRect(0, 0, w, h);

      ctx.filter = 'blur(70px)';
      for (const b of blobs) {
        const x = b.x * w;
        const y = b.y * h;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        gradient.addColorStop(0, b.c);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = b.a;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.filter = 'none';

      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    function render() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      seed(w, h);
      draw(w, h);
    }

    render();

    let timer: number;
    function onResize() {
      window.clearTimeout(timer);
      timer = window.setTimeout(render, 150);
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
