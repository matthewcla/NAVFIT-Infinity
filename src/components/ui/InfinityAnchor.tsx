import { Infinity } from 'lucide-react';
import { THEME_COLORS } from '@/styles/theme';

interface InfinityAnchorProps {
    size?: number;
    className?: string;
}

export const InfinityAnchor = ({ size = 24, className = "" }: InfinityAnchorProps) => {
    // Custom Gold Colors
    // Custom Gold Colors
    const anchorColor = THEME_COLORS.gold; // Deep Gold
    const infinityColor = THEME_COLORS.goldLight; // Light Gold / Cream

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            aria-label="Infinity Anchor Logo"
        >
            {/* 
                THE BASE ANCHOR (Custom SVG)
                We draw this manually to:
                1. Make it more prominent (bolder strokes, full size).
                2. Lower the arms to create space for the Infinity "Crossbar".
            */}
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                fill="none"
                stroke={anchorColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="z-10"
            >
                {/* Ring - Top Center */}
                <circle cx="12" cy="4" r="2.5" />

                {/* Shank - Vertical Line down the middle */}
                {/* We draw it full length, the infinity will overlay it */}
                <line x1="12" y1="6.5" x2="12" y2="22" />

                {/* Arms - Lowered & Widened */}
                {/* Standard Lucide Anchor arms are at y=12. We move them to y=15 to make room for crossbar */}
                {/* Curve: Starts at 3,15. Arcs down to bottom center (12, 21-ish) then up to 21,15 */}
                {/* Path command: Move to 3,15. Arc to 21,15 with radius 9.5 */}
                <path d="M 3 16 A 9 9 0 0 0 21 16" />

                {/* Stock - REMOVED. The Infinity Symbol replaces it. */}

            </svg>

            {/* 
                THE INFINITY SYMBOL (The "Crossbar")
                Positioned absolutely to sit across the upper third of the shank.
                It acts as the anchor's stock.
            */}
            <div
                className="absolute z-20 flex items-center justify-center"
                style={{
                    top: '40%', // Positioned at vertical 40% (approx y=9.6)
                    width: '100%',
                    transform: 'translateY(-50%)'
                }}
            >
                <Infinity
                    size={size * 0.95} // Large and wide 
                    color={infinityColor}
                    strokeWidth={2.5}
                    // Optional: Add a drop shadow or background to separate from shank
                    style={{
                        filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))',
                        // Flatten it slightly to look more like a crossbar
                        transform: 'scaleY(0.8)'
                    }}
                />
            </div>

            {/* Optional: A small masking element behind infinity if we wanted to hide the shank line, 
                but distinct overlay usually looks better for "Integration". 
            */}
        </div>
    );
};
