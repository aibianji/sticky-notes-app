import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { message } from '@tauri-apps/api/dialog';

interface ReminderModalProps {
    noteId: number;
    onClose: () => void;
}

interface Reminder {
    id: number;
    note_id: number;
    remind_at: number;
    is_triggered: boolean;
    created_at: number;
}

export function ReminderModal({ noteId, onClose }: ReminderModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    // 加载提醒列表
    const loadReminders = async () => {
        try {
            const result = await invoke<Reminder[]>('get_reminders_by_note', { noteId });
            setReminders(result);
        } catch (err) {
            console.error('Failed to load reminders:', err);
        }
    };

    useEffect(() => {
        loadReminders();
    }, [noteId]);

    // 处理添加或更新提醒
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const reminderDate = new Date(`${date}T${time}`);
        const timestamp = Math.floor(reminderDate.getTime() / 1000);
        
        try {
            if (editingReminder) {
                await invoke('update_reminder', {
                    id: editingReminder.id,
                    remindAt: timestamp
                });
                setEditingReminder(null);
            } else {
                await invoke('add_reminder', {
                    noteId,
                    remindAt: timestamp
                });
            }
            await loadReminders();
            setDate('');
            setTime('');
        } catch (err) {
            console.error('Failed to save reminder:', err);
        }
    };

    // 处理删除提醒
    const handleDelete = async (reminder: Reminder) => {
        const confirmed = await message(
            '确定要删除这个提醒吗？',
            {
                title: '确认删除',
                type: 'warning',
                okLabel: '删除',
                cancelLabel: '取消'
            }
        );

        if (confirmed) {
            try {
                await invoke('delete_reminder', { id: reminder.id });
                await loadReminders();
            } catch (err) {
                console.error('Failed to delete reminder:', err);
            }
        }
    };

    // 处理编辑提醒
    const handleEdit = (reminder: Reminder) => {
        const reminderDate = new Date(reminder.remind_at * 1000);
        setDate(reminderDate.toISOString().split('T')[0]);
        setTime(reminderDate.toTimeString().slice(0, 5));
        setEditingReminder(reminder);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-[480px] transform transition-transform"
                style={{ 
                    animation: 'modal-slide-up 0.3s ease-out'
                }}
            >
                <h2 className="text-xl font-semibold mb-4">
                    {editingReminder ? '编辑提醒' : '添加提醒'}
                </h2>
                
                <form onSubmit={handleSubmit} className="mb-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                日期
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                时间
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        {editingReminder && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingReminder(null);
                                    setDate('');
                                    setTime('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                取消编辑
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            关闭
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {editingReminder ? '更新' : '添加'}
                        </button>
                    </div>
                </form>

                {reminders.length > 0 && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">现有提醒</h3>
                        <div className="space-y-2">
                            {reminders.map(reminder => (
                                <div
                                    key={reminder.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                >
                                    <span className="text-sm text-gray-600">
                                        {new Date(reminder.remind_at * 1000).toLocaleString()}
                                    </span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(reminder)}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDelete(reminder)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// 添加到全局样式文件
const style = document.createElement('style');
style.textContent = `
@keyframes modal-slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes shake {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-5px, -5px); }
    50% { transform: translate(5px, 5px); }
    75% { transform: translate(-5px, 5px); }
}
`;
document.head.appendChild(style); 