import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScaleFactor } from '@/context/ScaleContext';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const { scale } = useScaleFactor();

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Position tooltip below the element by default, left-aligned
            setPosition({
                top: rect.bottom + 8 + window.scrollY,
                left: rect.left + window.scrollX
            });
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    // Close on scroll to prevent detached tooltips
    useEffect(() => {
        const handleScroll = () => {
            if (isVisible) setIsVisible(false);
        }
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isVisible]);

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="inline-block"
        >
            {children}
            {isVisible && createPortal(
                <div
                    className="fixed z-infinity-tooltip bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl border border-slate-700 w-64 animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                    style={{
                        top: position.top, // getBoundingClientRect returns viewport coords which are already scaled implicitly by the visual appearance, but the portal is unscaled.
                        // Wait, if the APP is scaled 0.5x, the rect.left will be visually correct for the scaled app, but the portal is unscaled.
                        // If rect says 100px left, on a 0.5x scale app that means effectively 200px in 'unscaled' dom if we didn't transform?
                        // No. "transform: scale(0.5)" on app means the app takes up half the pixels.
                        // rect.left will report the actual screen pixels.
                        // If we render the portal at top: 100px, left: 100px, it will be at screen pixels 100,100.
                        // This MATCHES the element's screen position.
                        // HOWEVER, the tooltip CONTENT will be large (scale 1) while the app is small (scale 0.5).
                        // So we MUST scale the tooltip down.
                        left: position.left,
                        transformOrigin: 'top left',
                        transform: `scale(${scale})`
                    }}
                >
                    {content}
                </div>,
                document.body
            )}
        </div>
    );
};
