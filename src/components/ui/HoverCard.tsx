import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './HoverCard.css';

interface HoverCardProps {
  children: React.ReactNode;
  content: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
}

export function HoverCard({ children, content, openDelay = 150, closeDelay = 150 }: HoverCardProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const handleMouseEnter = () => {
    clearTimers();
    openTimer.current = window.setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 340) });
        setOpen(true);
      }
    }, openDelay);
  };

  const handleMouseLeave = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), closeDelay);
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="hovercard-trigger"
    >
      {children}
      {open && position && createPortal(
        <div
          className="hovercard-content"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          onMouseEnter={() => {
            clearTimers();
            setOpen(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}


