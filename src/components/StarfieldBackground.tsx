import React, { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number;
  radius: number;
};

export const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mouseRef = useRef({ x: 0, y: 0 });
  const cameraRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    // --- 3D ENGINE PARAMETERS ---
    const FOV = 300;
    const MIN_DEPTH = 50;
    const MAX_DEPTH = 1500;

    // --- TUNED VALUES ---
    const DRIFT_SPEED = 0.01;
    const CAMERA_SENSITIVITY = 0.2; // Slightly increased from 0.15
    const LERP_FACTOR = 0.03; // Slightly faster catch-up

    const createStarSprite = () => {
      const sprite = document.createElement("canvas");
      const size = 16;
      sprite.width = size;
      sprite.height = size;
      const sCtx = sprite.getContext("2d");

      if (sCtx) {
        const gradient = sCtx.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2,
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.9)");
        gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.4)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        sCtx.fillStyle = gradient;
        sCtx.fillRect(0, 0, size, size);
      }
      return sprite;
    };

    const starSprite = createStarSprite();

    const createStars = (numStars: number) => {
      stars = new Array(numStars).fill(0).map(() => {
        const z = Math.random() * (MAX_DEPTH - MIN_DEPTH) + MIN_DEPTH;
        const x = (Math.random() - 0.5) * ((width * z) / FOV) * 1.5;
        const y = (Math.random() - 0.5) * ((height * z) / FOV) * 1.5;

        return {
          x,
          y,
          z,
          // Slightly wider radius spread
          radius: Math.random() * 0.8 + 0.3,
        };
      });
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const numStars = Math.floor((width * height) / 1100);
      createStars(numStars);

      mouseRef.current = { x: width / 2, y: height / 2 };
      cameraRef.current = { x: 0, y: 0 };
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      const targetCameraX = (mouseRef.current.x - centerX) * CAMERA_SENSITIVITY;
      const targetCameraY = (mouseRef.current.y - centerY) * CAMERA_SENSITIVITY;

      cameraRef.current.x +=
        (targetCameraX - cameraRef.current.x) * LERP_FACTOR;
      cameraRef.current.y +=
        (targetCameraY - cameraRef.current.y) * LERP_FACTOR;

      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;

      stars.forEach((star) => {
        star.z += DRIFT_SPEED;

        if (star.z > MAX_DEPTH) {
          star.z = MIN_DEPTH;
          star.x = (Math.random() - 0.5) * ((width * MIN_DEPTH) / FOV) * 1.5;
          star.y = (Math.random() - 0.5) * ((height * MIN_DEPTH) / FOV) * 1.5;
        }

        const scale = FOV / star.z;
        const x2d = (star.x - camX) * scale + centerX;
        const y2d = (star.y - camY) * scale + centerY;

        if (x2d < 0 || x2d > width || y2d < 0 || y2d > height) return;

        // 1. Calculate base size (multiplier reduced from 8 to 5)
        let drawSize = star.radius * scale * 5;

        // 2. Cap the max size so bright stars don't get too huge
        drawSize = Math.min(drawSize, 10);

        // 3. Ensure far stars don't shrink into nothingness
        drawSize = Math.max(drawSize, 1.0);

        // 4. Opacity: Make far stars stay at least 20% visible
        const depthRatio = star.z / MAX_DEPTH;
        let alpha = 1 - depthRatio;
        alpha = Math.max(0.2, alpha);

        ctx.globalAlpha = alpha;

        ctx.drawImage(
          starSprite,
          x2d - drawSize / 2,
          y2d - drawSize / 2,
          drawSize,
          drawSize,
        );
      });

      ctx.globalAlpha = 1.0;

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
  );
};
