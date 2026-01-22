import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Infinity, ArrowRight } from 'lucide-react';

interface StartupAnimationProps {
    onComplete: () => void;
}

export function StartupAnimation({ onComplete }: StartupAnimationProps) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // Sequence automation
        const timers = [
            setTimeout(() => setStep(1), 500),  // Logo
            setTimeout(() => setStep(2), 1500), // Title
            setTimeout(() => setStep(3), 2500), // Disclaimer
        ];

        return () => timers.forEach(clearTimeout);
    }, []);

    const handleEnter = () => {
        setStep(4); // Fade out
        setTimeout(onComplete, 1000); // Complete after fade
    };

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans"
            initial={{ opacity: 1 }}
            animate={{ opacity: step === 4 ? 0 : 1 }}
            transition={{ duration: 1 }}
        >
            <div className="relative flex flex-col items-center">
                {/* Logo Animation */}
                <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -180 }}
                    animate={{
                        scale: step >= 1 ? 1 : 0,
                        opacity: step >= 1 ? 1 : 0,
                        rotate: step >= 1 ? 0 : -180
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="mb-8"
                >
                    <Infinity className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </motion.div>

                {/* Title Animation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                        opacity: step >= 2 ? 1 : 0,
                        y: step >= 2 ? 0 : 20
                    }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center space-y-2 mb-12"
                >
                    <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-2xl">
                        NAVFIT <span className="text-slate-400">Infinity</span>
                    </h1>
                    <div className="px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full">
                        <span className="text-xs uppercase tracking-[0.3em] text-yellow-400 font-semibold">
                            Experimental Project
                        </span>
                    </div>
                </motion.div>

                {/* Disclaimer Animation */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: step >= 3 ? 1 : 0 }}
                    transition={{ duration: 1 }}
                    className="absolute top-full mt-8 max-w-md text-center space-y-8"
                >
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm leading-relaxed border-t border-slate-800 pt-6">
                            <span className="text-red-400 font-semibold">DISCLAIMER:</span> This application is loaded with <span className="text-slate-200">TEST DATA ONLY</span> and is NOT connected to any Personally Identifiable Information (PII) systems.
                        </p>
                        <p className="text-slate-500 text-xs text-opacity-70">
                            Not an official project of the Commander, Navy Personnel Command (CNPC).
                        </p>
                    </div>

                    {/* Manual Entry Button */}
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                            opacity: step >= 3 ? 1 : 0,
                            y: step >= 3 ? 0 : 10
                        }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleEnter}
                        className="group flex items-center space-x-2 mx-auto px-6 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/50 rounded-full transition-all duration-300 outline-none focus:ring-2 focus:ring-yellow-400/50"
                    >
                        <span className="text-yellow-400 font-medium tracking-wider uppercase text-sm">Enter System</span>
                        <ArrowRight className="w-4 h-4 text-yellow-400 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </motion.div>
            </div>
        </motion.div>
    );
}
