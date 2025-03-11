import React, { useState } from 'react';
import { Note } from '../lib/api';

export interface NoteListProps {
    notes: Note[];
    selectedNote: Note | null;
    onNoteSelect: (note: Note) => void;
    onNoteAdd: (content: string) => void;
    onNoteDelete: (noteId: number) => void;
}

export function NoteList({ notes, selectedNote, onNoteSelect, onNoteAdd, onNoteDelete }: NoteListProps) {
    const [newNoteContent, setNewNoteContent] = useState('');

    const handleAddNote = () => {
        if (newNoteContent.trim()) {
            onNoteAdd(newNoteContent);
            setNewNoteContent('');
        }
    };

    return (
        <div className="w-80 border-r bg-white">
            {/* 添加新便签 */}
            <div className="p-4 border-b">
                <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="输入新便签内容..."
                    className="w-full p-2 border rounded resize-none"
                    rows={3}
                />
                <button
                    onClick={handleAddNote}
                    className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    添加便签
                </button>
            </div>

            {/* 便签列表 */}
            <div className="overflow-y-auto h-[calc(100vh-200px)]">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                            selectedNote?.id === note.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => onNoteSelect(note)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1 mr-4">
                                <p className="text-sm text-gray-600 line-clamp-3">{note.content}</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNoteDelete(note.id);
                                }}
                                className="text-red-500 hover:text-red-700"
                            >
                                删除
                            </button>
                        </div>
                        {note.screenshot_path && (
                            <div className="mt-2">
                                <img
                                    src={note.screenshot_path}
                                    alt="Screenshot"
                                    className="max-w-full h-auto rounded"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 