import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrashDropZoneProps {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    onDrop: (data: any) => void;
    acceptTypes: string[];
    caption?: string;
    className?: string;
}

export const TrashDropZone: React.FC<TrashDropZoneProps> = ({
    onDrop,
    acceptTypes,
    caption = "Drop to Delete",
    className,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Trigger expansion shortly after mount
    useEffect(() => {
        // Short delay to ensure the initial render as a circle is seen before expanding
        const timer = setTimeout(() => {
            setIsExpanded(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const types = Array.from(e.dataTransfer.types);
        const hasValidType = acceptTypes.some((type) => types.includes(type));

        if (hasValidType) {
            setIsDragOver(true);
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const types = Array.from(e.dataTransfer.types);
        const matchedType = acceptTypes.find((type) => types.includes(type));

        if (matchedType) {
            try {
                const dataString = e.dataTransfer.getData(matchedType);
                if (dataString) {
                    try {
                        const data = JSON.parse(dataString);
                        onDrop(data);
                    } catch {
                        onDrop(dataString);
                    }
                }
            } catch (err) {
                console.error('Failed to parse dropped data:', err);
            }
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                // Base styles: centered flex, rounded full, shadow, overflow hidden for pill expansion
                'flex items-center rounded-full shadow-lg transition-all duration-300 ease-out overflow-hidden h-14',
                // Size & Layout transition
                isExpanded ? 'w-48 px-6 justify-center' : 'w-14 justify-center',
                // Colors
                isDragOver ? 'bg-red-600 scale-105' : 'bg-red-500',
                className
            )}
        >
            <div className="flex items-center gap-2 pointer-events-none">
                <Trash2
                    className={cn(
                        'text-white shrink-0 transition-transform duration-300',
                        isExpanded ? 'w-5 h-5' : 'w-6 h-6'
                    )}
                />

                <span
                    className={cn(
                        "whitespace-nowrap font-bold text-white uppercase tracking-wider text-sm transition-all duration-300 delay-100",
                        // Opacity transition: only visible when expanded
                        isExpanded ? 'opacity-100 max-w-full ml-2' : 'opacity-0 max-w-0 ml-0 overflow-hidden'
                    )}
                >
                    {caption}
                </span>
            </div>
        </div>
    );
};
