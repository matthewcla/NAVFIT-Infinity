import { createContext, useContext } from 'react';

interface ScaleContextType {
    scale: number;
}

export const ScaleContext = createContext<ScaleContextType>({ scale: 1 });

export const useScaleFactor = () => useContext(ScaleContext);
