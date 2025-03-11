import React, { useState } from 'react';
import { NoteContextMenu } from './NoteContextMenu';

interface NoteProps {
    id: number;
    content: string;
    is_pinned: boolean;
    onPin: () => void;
    onDelete: () => void;
    onChangeColor: () => void;
    onMoveToCategory: () => void;
    onClick: () => void;
}

export function Note({
    id,
    content,
    is_pinned,
    onPin,
    onDelete,
    onChangeColor,
    onMoveToCategory,
    onClick
}: NoteProps) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const root = document.getElementById('root');
        const rootRect = root?.getBoundingClientRect();
        
        let x = e.clientX;
        let y = e.clientY;
        
        // 确保菜单不会超出屏幕
        const menuWidth = 220;
        const menuHeight = 230;
        
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }
        
        setContextMenuPosition({ x, y });
        setShowContextMenu(true);
    };

    const handleCloseContextMenu = () => {
        setShowContextMenu(false);
    };

    const handleSetReminder = () => {
        console.log('设置提醒');
        handleCloseContextMenu();
    };

    return (
        <>
            <div
                className="bg-yellow-100 p-4 rounded-lg shadow-md cursor-pointer mb-4 relative"
                onClick={onClick}
                onContextMenu={handleContextMenu}
            >
                <div className="flex justify-between">
                    <div></div>
                    {is_pinned && (
                        <div className="text-blue-500">
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582a1.5 1.5 0 01.646 2.415l-1.222 1.222a1 1 0 01-.293.707L12 12.334V18a1 1 0 11-2 0v-5.666l-2.085-2.085a1 1 0 01-.293-.707L6.4 8.32a1.5 1.5 0 01.646-2.415L11 4.323V3a1 1 0 011-1z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="whitespace-pre-wrap break-words">{content}</div>
            </div>

            {showContextMenu && (
                <NoteContextMenu
                    x={contextMenuPosition.x}
                    y={contextMenuPosition.y}
                    onClose={handleCloseContextMenu}
                    onSetReminder={handleSetReminder}
                    onPin={onPin}
                    onDelete={onDelete}
                    onChangeColor={onChangeColor}
                    onMoveToCategory={onMoveToCategory}
                    isPinned={is_pinned}
                />
            )}
        </>
    );
}

export function TestNote() {
    const [isPinned, setIsPinned] = useState(false);

    const handlePin = () => {
        setIsPinned(!isPinned);
        console.log('切换置顶状态:', !isPinned);
    };

    const handleDelete = () => {
        console.log('删除便签');
    };

    const handleChangeColor = () => {
        console.log('更改颜色');
    };

    const handleMoveToCategory = () => {
        console.log('移动到分类');
    };

    const handleClick = () => {
        console.log('点击便签');
    };

    return (
        <div className="p-4">
            <Note
                id={1}
                content="这是一个测试便签，用于验证右键菜单功能。\n\n右键点击此便签可以：\n- 设置提醒\n- 切换置顶状态\n- 更改颜色\n- 移动到分类\n- 删除便签"
                is_pinned={isPinned}
                onPin={handlePin}
                onDelete={handleDelete}
                onChangeColor={handleChangeColor}
                onMoveToCategory={handleMoveToCategory}
                onClick={handleClick}
            />
        </div>
    );
} 