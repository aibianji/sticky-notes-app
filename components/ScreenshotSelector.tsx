import React, { useEffect, useRef, useState } from 'react';
import { emit } from '@tauri-apps/api/event';
import { Window } from '@tauri-apps/api/window';

interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function ScreenshotSelector() {
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const window = Window.getCurrent();
                await window.close();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsSelecting(true);
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isSelecting) {
            setCurrentPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = async () => {
        if (!isSelecting) return;
        setIsSelecting(false);

        const region: Region = {
            x: Math.min(startPos.x, currentPos.x),
            y: Math.min(startPos.y, currentPos.y),
            width: Math.abs(currentPos.x - startPos.x),
            height: Math.abs(currentPos.y - startPos.y),
        };

        // 发送选择完成事件
        await emit('screenshot-complete', region);

        // 关闭截图窗口
        const window = Window.getCurrent();
        await window.close();
    };

    const selectionStyle = {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 bg-black bg-opacity-30 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {isSelecting && (
                <div
                    className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20"
                    style={selectionStyle}
                >
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1">
                        {selectionStyle.width} x {selectionStyle.height}
                    </div>
                </div>
            )}
        </div>
    );
} 