import React, { useEffect, useRef, useState } from "react";

export const RocketCursor: React.FC = () => {
  const rocketRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -100, y: -100 });
  const posRef = useRef({ x: -100, y: -100 });
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mediaQuery.matches) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    const render = () => {
      posRef.current.x += (mouseRef.current.x - posRef.current.x) * 0.4;
      posRef.current.y += (mouseRef.current.y - posRef.current.y) * 0.4;

      if (rocketRef.current) {
        rocketRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) rotate(-20deg)`;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <style>
        {`
          /* This forces the default cursor to be hidden on EVERYTHING */
          * {
            cursor: none !important;
          }

          @keyframes wobble {
            0% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(0.8) rotate(-15deg); }
            50% { transform: scale(1.1) rotate(10deg); }
            75% { transform: scale(0.95) rotate(-5deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          .rocket-wobble {
            animation: wobble 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          }
        `}
      </style>

      <div
        ref={rocketRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          width: "48px",
          height: "48px",
          marginLeft: "-24px",
          marginTop: "-24px",
          willChange: "transform",
        }}
      >
        <img
          src="/rocket.png"
          alt="cursor"
          className={`w-full h-full object-contain drop-shadow-2xl ${isClicked ? "rocket-wobble" : ""}`}
        />
      </div>
    </>
  );
};
