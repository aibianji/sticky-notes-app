import React from 'react';

interface NoteContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onSetReminder: () => void;
    onPin: () => void;
    onDelete: () => void;
    onChangeColor: () => void;
    onMoveToCategory: () => void;
    isPinned: boolean;
}

export function NoteContextMenu({
    x,
    y,
    onClose,
    onSetReminder,
    onPin,
    onDelete,
    onChangeColor,
    onMoveToCategory,
    isPinned
}: NoteContextMenuProps) {
    // 使用 useEffect 监听点击事件来关闭菜单
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.context-menu')) {
                onClose();
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [onClose]);

    return (
        <div 
            className="context-menu fixed bg-white/95 backdrop-blur-sm rounded-lg shadow-lg py-1 min-w-[220px] z-50"
            style={{ 
                left: x,
                top: y,
                animation: 'win11-menu 0.15s ease-out',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
        >
            <button
                onClick={onSetReminder}
                className="w-full px-5 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center space-x-3 group"
            >
                <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">设置提醒</span>
            </button>
            
            <button
                onClick={onPin}
                className="w-full px-5 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center space-x-3 group"
            >
                <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582a1.5 1.5 0 01.646 2.415l-1.222 1.222a1 1 0 01-.293.707L12 12.334V18a1 1 0 11-2 0v-5.666l-2.085-2.085a1 1 0 01-.293-.707L6.4 8.32a1.5 1.5 0 01.646-2.415L11 4.323V3a1 1 0 011-1z" />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">{isPinned ? '取消置顶' : '置顶便签'}</span>
            </button>

            <button
                onClick={onChangeColor}
                className="w-full px-5 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center space-x-3 group"
            >
                <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 2h10v10H5V4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">更改颜色</span>
            </button>

            <button
                onClick={onMoveToCategory}
                className="w-full px-5 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center space-x-3 group"
            >
                <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                <span className="text-gray-700 group-hover:text-blue-600">移动到分类</span>
            </button>

            <div className="h-px bg-gray-200 my-1"></div>

            <button
                onClick={onDelete}
                className="w-full px-5 py-2.5 text-left text-sm hover:bg-red-50 flex items-center space-x-3 group"
            >
                <svg className="w-4 h-4 text-gray-600 group-hover:text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 group-hover:text-red-600">删除便签</span>
            </button>
        </div>
    );
}

// 添加到全局样式文件
const style = document.createElement('style');
style.textContent = `
@keyframes win11-menu {
    from {
        opacity: 0;
        transform: scale(0.98) translateY(-2px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.context-menu {
    -webkit-font-smoothing: antialiased;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
}

.context-menu button {
    transition: all 0.15s ease;
    position: relative;
    overflow: hidden;
}

.context-menu button::after {
    content: '';
    position: absolute;
    inset: 0;
    background: transparent;
    transition: background-color 0.15s ease;
}

.context-menu button:active::after {
    background-color: rgba(0, 0, 0, 0.05);
}
`;
document.head.appendChild(style); 