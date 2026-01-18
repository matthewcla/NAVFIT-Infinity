import React, { useEffect, useState } from 'react';
import { ScaleContext } from '@/context/ScaleContext';

interface AppScalerProps {
    children: React.ReactNode;
    baseWidth?: number; // The width design is optimized for (e.g., 1536px)
}

export const AppScaler: React.FC<AppScalerProps> = ({ children, baseWidth = 1536 }) => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const currentWidth = window.innerWidth;
            // If screen is smaller than base, scale down.
            // If screen is larger, we can keep at 1 (or scale up if desired, but typically we cap at 1)
            const newScale = Math.min(currentWidth / baseWidth, 1);
            setScale(newScale);
        };

        // Initial calc
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [baseWidth]);

    const wrapperStyle: React.CSSProperties = {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
        // When scaling down, we need to ensure the container still takes up the full relative space
        // effectively simulating a larger viewport
    };

    return (
        <ScaleContext.Provider value={{ scale }}>
            <div
                className="app-scaler-root w-full h-full overflow-hidden"
                style={wrapperStyle}
            >
                {children}
            </div>
        </ScaleContext.Provider>
    );
};
