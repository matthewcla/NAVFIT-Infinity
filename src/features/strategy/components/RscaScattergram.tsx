import { useMemo } from 'react';


interface RscaScattergramProps {
    members: Array<{ mta: number; id: string; name: string }>;
    rsca: number;
    height?: number;
}

export function RscaScattergram({ members, rsca }: RscaScattergramProps) {
    // Canvas dimensions (internal SVG coordinates)
    const padding = { top: 25, right: 10, bottom: 20, left: 30 };
    const width = 300;
    const height = 100; // Aspect ratio controlled by parent, but viewBox is fixed

    // Data Processing
    const points = useMemo(() => {
        if (!members.length) return [];

        // Y-Axis: MTA (Range usually 2.0 - 5.0)
        // Let's dynamic range it with some buffer, or fixed 2.0-5.0 for consistency
        const maxMta = 5.0; // Math.max(...members.map(m => m.mta), 5.0);
        const minMta = 2.0; // Math.min(...members.map(m => m.mta), 2.0);

        // X-Axis: Scatter (Random or Distributed)
        // To make it look like a distribution, we can map X to index 
        // OR map X to RSCA delta? 
        // User asked: "depicts how MTAs are dispersed about the RSCA"
        // Standard scatter: Y = MTA, X = Random/Jitter just to show density

        return members.map((m, i) => {
            // Y Coordinate
            const normalizedY = (m.mta - minMta) / (maxMta - minMta);
            const y = height - padding.bottom - (normalizedY * (height - padding.top - padding.bottom));

            // X Coordinate - Apply pseudo-random jitter based on ID/Index to keep it deterministic
            // Spread across width
            const pseudoRandom = ((i * 1337) % 7919) / 7919;
            const x = padding.left + (pseudoRandom * (width - padding.left - padding.right));

            return { x, y, ...m };
        });
    }, [members]);

    // RSCA Line Y-Coordinate
    const rscaY = useMemo(() => {
        const minMta = 2.0;
        const maxMta = 5.0;
        const normalized = (rsca - minMta) / (maxMta - minMta);
        return height - padding.bottom - (normalized * (height - padding.top - padding.bottom));
    }, [rsca]);

    return (
        <div className="h-full w-full bg-white border border-slate-200 rounded-xl overflow-hidden relative">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                {/* Background Grid Lines (Optional) */}
                {[3.0, 4.0, 5.0].map(val => {
                    const norm = (val - 2.0) / 3.0;
                    const y = height - padding.bottom - (norm * (height - padding.top - padding.bottom));
                    return (
                        <line
                            key={val}
                            x1={padding.left}
                            y1={y}
                            x2={width - padding.right}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* RSCA Reference Line */}
                <line
                    x1={padding.left}
                    y1={rscaY}
                    x2={width - padding.right}
                    y2={rscaY}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                />

                {/* Points */}
                {points.map((p) => (
                    <circle
                        key={p.id}
                        cx={p.x}
                        cy={p.y}
                        r="2.5"
                        className="fill-slate-600/60 hover:fill-indigo-600 transition-colors"
                    />
                ))}

                {/* Axis Labels (Minimal) */}
                <text x={5} y={height - padding.bottom} className="text-[8px] fill-slate-400">2.0</text>
                <text x={5} y={padding.top} className="text-[8px] fill-slate-400">5.0</text>
            </svg>

            {/* Overlay Label */}
            <div className="absolute top-1 left-0 right-0 text-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                MTA Distribution
            </div>
        </div>
    );
}
