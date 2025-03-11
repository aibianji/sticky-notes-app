import React, { useState, useEffect } from 'react';
import { Note } from '../lib/api';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { CategoryManager } from './CategoryManager';
import * as api from '../lib/api';

export function App() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [categories, setCategories] = useState<api.Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    // 加载便签和分类
    useEffect(() => {
        loadNotes();
        loadCategories();
    }, []);

    // 根据选中的分类加载便签
    useEffect(() => {
        if (selectedCategory === null) {
            loadNotes();
        } else {
            loadNotesByCategory(selectedCategory);
        }
    }, [selectedCategory]);

    const loadNotes = async () => {
        try {
            const notes = await api.getNotes();
            setNotes(notes);
        } catch (err) {
            console.error('Failed to load notes:', err);
        }
    };

    const loadNotesByCategory = async (categoryId: number) => {
        try {
            const notes = await api.getNotesByCategory(categoryId);
            setNotes(notes);
        } catch (err) {
            console.error('Failed to load notes by category:', err);
        }
    };

    const loadCategories = async () => {
        try {
            const categories = await api.getCategories();
            setCategories(categories);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    };

    const handleNoteSelect = (note: Note) => {
        setSelectedNote(note);
    };

    const handleNoteUpdate = async (note: Note) => {
        try {
            await api.updateNote(note.id, note.content);
            loadNotes();
        } catch (err) {
            console.error('Failed to update note:', err);
        }
    };

    const handleNoteDelete = async (noteId: number) => {
        try {
            await api.deleteNote(noteId);
            setSelectedNote(null);
            loadNotes();
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    const handleNoteAdd = async (content: string) => {
        try {
            await api.addNote(content, undefined, selectedCategory);
            loadNotes();
        } catch (err) {
            console.error('Failed to add note:', err);
        }
    };

    const handleCategoryChange = () => {
        loadCategories();
        if (selectedCategory !== null) {
            loadNotesByCategory(selectedCategory);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* 侧边栏 */}
            <div className="w-64 bg-white border-r">
                <div className="p-4">
                    <button
                        onClick={() => setShowCategoryManager(true)}
                        className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        分类管理
                    </button>
                </div>
                <div className="px-4 py-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full px-4 py-2 mb-2 text-left rounded ${
                            selectedCategory === null ? 'bg-blue-100' : 'hover:bg-gray-100'
                        }`}
                    >
                        全部便签
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full px-4 py-2 mb-2 text-left rounded flex items-center ${
                                selectedCategory === category.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                            }`}
                        >
                            <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="flex-1 flex">
                <NoteList
                    notes={notes}
                    selectedNote={selectedNote}
                    onNoteSelect={handleNoteSelect}
                    onNoteAdd={handleNoteAdd}
                    onNoteDelete={handleNoteDelete}
                />
                {selectedNote && (
                    <NoteEditor
                        note={selectedNote}
                        onNoteUpdate={handleNoteUpdate}
                        onClose={() => setSelectedNote(null)}
                    />
                )}
            </div>

            {/* 分类管理对话框 */}
            {showCategoryManager && (
                <CategoryManager
                    onClose={() => setShowCategoryManager(false)}
                    onCategoryChange={handleCategoryChange}
                />
            )}
        </div>
    );
} 