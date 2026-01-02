import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this utility exists, typical in shadcn/ui or modern setups. If not I'll fall back to standard string templates.

interface TrashDropZoneProps {
    onDrop: (data: any) => void;
    acceptTypes: string[];
    className?: string;
}

export const TrashDropZone: React.FC<TrashDropZoneProps> = ({
    onDrop,
    acceptTypes,
    className,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);

    // Helper to check if the dragged item is of an accepted type
    // const isValidDrag = (dataTransfer: DataTransfer | null) => {
    //     if (!dataTransfer) return false;
    //     return acceptTypes.some((type) => dataTransfer.types.includes(type));
    // };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        // console.log('Drag Over Types:', e.dataTransfer.types);

        // Ensure we check correctly against the types array
        const types = Array.from(e.dataTransfer.types);
        const hasValidType = acceptTypes.some((type) => types.includes(type));

        if (hasValidType) {
            setIsDragOver(true);
            e.dataTransfer.dropEffect = 'move';
        } else {
            console.log('Invalid Drag Type. Available:', types, 'Accepted:', acceptTypes);
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
        if (!acceptTypes.some((type) => types.includes(type))) {
            console.log('Drop rejected: Invalid type', types);
            return;
        }

        // Find which accepted type matches
        const matchedType = acceptTypes.find((type) =>
            types.includes(type)
        );

        console.log('Dropped with matched type:', matchedType);

        if (matchedType) {
            try {
                const dataString = e.dataTransfer.getData(matchedType);
                console.log('Dropped Data:', dataString);
                if (dataString) {
                    try {
                        const data = JSON.parse(dataString);
                        onDrop(data);
                    } catch {
                        // If parsing fails, pass raw string (likely an ID)
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
                'relative flex items-center justify-center rounded-lg border-2 border-transparent transition-all duration-200',
                isDragOver
                    ? 'bg-red-50 border-red-300 scale-110'
                    : 'bg-transparent text-gray-400 hover:text-gray-500',
                className
            )}
        >
            <div className="flex flex-col items-center gap-1 pointer-events-none">
                <Trash2
                    size={24}
                    className={cn(
                        'transition-colors duration-200',
                        isDragOver ? 'text-red-600' : 'text-current'
                    )}
                />
                {isDragOver && (
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider animate-in fade-in zoom-in duration-200">
                        Drop to Delete
                    </span>
                )}
            </div>
        </div>
    );
};
