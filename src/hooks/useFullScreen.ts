import { useState, useEffect, useCallback } from 'react';

export function useFullScreen() {
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);

        // Check initial state
        setIsFullScreen(!!document.fullscreenElement);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, []);

    const toggleFullScreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error("Error attempting to toggle full-screen mode:", err);
        }
    }, []);

    return { isFullScreen, toggleFullScreen };
}
