import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

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
                        top: position.top,
                        left: position.left,
                        // Ensure it stays on screen (basic logic)
                        transform: 'none'
                    }}
                >
                    {content}
                </div>,
                document.body
            )}
        </div>
    );
};
