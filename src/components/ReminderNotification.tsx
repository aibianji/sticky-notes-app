import React, { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface ReminderNotificationProps {
    id: number;
    content: string;
    onClose: () => void;
}

export function ReminderNotification({ id, content, onClose }: ReminderNotificationProps) {
    useEffect(() => {
        const markAsTriggered = async () => {
            try {
                await invoke('mark_reminder_triggered', { id });
            } catch (err) {
                console.error('Failed to mark reminder as triggered:', err);
            }
        };
        markAsTriggered();
    }, [id]);

    return (
        <div 
            className="fixed bottom-5 right-5 bg-white rounded-lg shadow-lg p-4 max-w-sm w-full"
            style={{
                animation: 'shake 0.5s ease-in-out',
                zIndex: 9999,
                transform: 'translate3d(0,0,0)' // 启用GPU加速
            }}
        >
            <div className="flex items-start">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                        提醒
                    </p>
                    <p className="mt-1 text-sm text-gray-500 break-words">
                        {content}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                    <span className="sr-only">关闭</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
} 