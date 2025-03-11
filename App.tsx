import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { Note, toggleNotePin, moveNotesToTrash, restoreNotesFromTrash, permanentlyDeleteNotes, getTrashNotes, cleanupTrash } from './lib/api';
import { debounce } from './lib/api';
import { message } from '@tauri-apps/api/dialog';

// 排序选项枚举
export enum NoteSortOption {
    CreatedTimeDesc = 'CreatedTimeDesc',
    CreatedTimeAsc = 'CreatedTimeAsc',
    UpdatedTimeDesc = 'UpdatedTimeDesc',
    UpdatedTimeAsc = 'UpdatedTimeAsc',
}

// 排序选项配置
const SORT_OPTIONS = [
    { value: NoteSortOption.CreatedTimeDesc, label: '创建时间（最新）' },
    { value: NoteSortOption.CreatedTimeAsc, label: '创建时间（最早）' },
    { value: NoteSortOption.UpdatedTimeDesc, label: '修改时间（最新）' },
    { value: NoteSortOption.UpdatedTimeAsc, label: '修改时间（最早）' },
];

function App() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [sortOption, setSortOption] = useState<NoteSortOption>(NoteSortOption.CreatedTimeDesc);
    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [isTrashView, setIsTrashView] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // 加载便签列表
    const loadNotes = async () => {
        try {
            if (isTrashView) {
                const trashNotes = await getTrashNotes();
                setNotes(trashNotes);
            } else if (searchQuery.trim()) {
                setIsSearching(true);
                const searchResults = await invoke<Note[]>('search_notes', {
                    query: searchQuery,
                    categoryId: selectedCategoryId,
                });
                setNotes(searchResults);
                setIsSearching(false);
            } else {
                const notes = await invoke<Note[]>('get_notes_sorted', {
                    sortBy: sortOption,
                    categoryId: selectedCategoryId,
                });
                setNotes(notes);
            }
        } catch (err) {
            console.error('Failed to load notes:', err);
            setIsSearching(false);
        }
    };

    // 切换便签选择
    const toggleNoteSelection = (noteId: number) => {
        if (!isSelectionMode) return;
        
        setSelectedNotes(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(noteId)) {
                newSelection.delete(noteId);
            } else {
                newSelection.add(noteId);
            }
            return newSelection;
        });
    };

    // 处理批量删除
    const handleBatchDelete = async () => {
        if (selectedNotes.size === 0) return;

        const confirmed = await message(
            isTrashView 
                ? '确定要永久删除选中的便签吗？此操作不可恢复。' 
                : '确定要将选中的便签移动到回收站吗？',
            { 
                title: '确认删除',
                type: 'warning',
                okLabel: '删除',
                cancelLabel: '取消'
            }
        );

        if (confirmed) {
            try {
                const ids = Array.from(selectedNotes);
                if (isTrashView) {
                    await permanentlyDeleteNotes(ids);
                } else {
                    await moveNotesToTrash(ids);
                }
                await loadNotes();
                setSelectedNotes(new Set());
                setIsSelectionMode(false);
            } catch (err) {
                console.error('Failed to delete notes:', err);
                await message('删除便签失败', { title: '错误', type: 'error' });
            }
        }
    };

    // 处理批量恢复
    const handleBatchRestore = async () => {
        if (selectedNotes.size === 0 || !isTrashView) return;

        try {
            await restoreNotesFromTrash(Array.from(selectedNotes));
            await loadNotes();
            setSelectedNotes(new Set());
            setIsSelectionMode(false);
        } catch (err) {
            console.error('Failed to restore notes:', err);
            await message('恢复便签失败', { title: '错误', type: 'error' });
        }
    };

    // 清理回收站
    const handleCleanupTrash = async () => {
        const confirmed = await message(
            '确定要清理回收站中超过30天的便签吗？此操作不可恢复。',
            {
                title: '确认清理',
                type: 'warning',
                okLabel: '清理',
                cancelLabel: '取消'
            }
        );

        if (confirmed) {
            try {
                await cleanupTrash();
                await loadNotes();
            } catch (err) {
                console.error('Failed to cleanup trash:', err);
                await message('清理回收站失败', { title: '错误', type: 'error' });
            }
        }
    };

    // 防抖处理搜索
    const debouncedSearch = useCallback(
        debounce(() => {
            loadNotes();
        }, 300),
        [searchQuery, selectedCategoryId, sortOption]
    );

    // 当搜索条件或排序选项改变时重新加载便签
    useEffect(() => {
        debouncedSearch();
    }, [searchQuery, selectedCategoryId, sortOption]);

    // 创建新便签
    const handleCreateNote = async () => {
        try {
            const id = await invoke<number>('add_note', {
                content: '',
                categoryId: selectedCategoryId,
            });
            await loadNotes();
            const newNote = notes.find(note => note.id === id);
            if (newNote) {
                setSelectedNote(newNote);
            }
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    };

    // 删除便签
    const handleDeleteNote = async (id: number) => {
        try {
            await invoke('delete_note', { id });
            await loadNotes();
            if (selectedNote?.id === id) {
                setSelectedNote(null);
            }
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    // 处理便签置顶
    const handleTogglePin = async (e: React.MouseEvent, note: Note) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发便签选中
        try {
            await toggleNotePin(note.id);
            await loadNotes();
        } catch (err) {
            console.error('Failed to toggle note pin:', err);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* 侧边栏 */}
            <Sidebar
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(id) => {
                    setSelectedCategoryId(id);
                    setIsTrashView(false);
                }}
            />

            {/* 便签列表 */}
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b bg-white">
                    <div className="flex space-x-4 items-center">
                        {!isTrashView && (
                            <button
                                onClick={handleCreateNote}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                disabled={isSelectionMode}
                            >
                                新建便签
                            </button>
                        )}
                        
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedNotes(new Set());
                            }}
                            className={`px-4 py-2 rounded ${
                                isSelectionMode 
                                    ? 'bg-gray-200 text-gray-700' 
                                    : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {isSelectionMode ? '取消多选' : '多选'}
                        </button>

                        {isSelectionMode && selectedNotes.size > 0 && (
                            <>
                                <button
                                    onClick={handleBatchDelete}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    {isTrashView ? '永久删除' : '删除'}
                                </button>
                                {isTrashView && (
                                    <button
                                        onClick={handleBatchRestore}
                                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        恢复
                                    </button>
                                )}
                            </>
                        )}

                        <div className="flex-1 max-w-md relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索便签..."
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isTrashView}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            )}
                        </div>

                        {!isTrashView && (
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as NoteSortOption)}
                                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                disabled={isSelectionMode}
                            >
                                {SORT_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => {
                                setIsTrashView(!isTrashView);
                                setSelectedCategoryId(null);
                                setSelectedNotes(new Set());
                                setIsSelectionMode(false);
                            }}
                            className={`px-4 py-2 rounded ${
                                isTrashView 
                                    ? 'bg-gray-200 text-gray-700' 
                                    : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {isTrashView ? '返回便签' : '回收站'}
                        </button>

                        {isTrashView && (
                            <button
                                onClick={handleCleanupTrash}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                disabled={isSelectionMode}
                            >
                                清理回收站
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {notes.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            {isTrashView 
                                ? '回收站为空' 
                                : searchQuery.trim() 
                                    ? '没有找到匹配的便签' 
                                    : '暂无便签'
                            }
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    className={`group bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative ${
                                        selectedNote?.id === note.id ? 'ring-2 ring-blue-500' : ''
                                    } ${selectedNotes.has(note.id) ? 'ring-2 ring-green-500' : ''}`}
                                    style={{ backgroundColor: note.color || '#FFFFFF' }}
                                    onClick={(e) => {
                                        if (isSelectionMode) {
                                            toggleNoteSelection(note.id);
                                        } else {
                                            setSelectedNote(note);
                                        }
                                    }}
                                >
                                    {/* 选择框 */}
                                    {isSelectionMode && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedNotes.has(note.id)}
                                                onChange={() => toggleNoteSelection(note.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}

                                    {/* 置顶图标 */}
                                    {!isTrashView && !isSelectionMode && (
                                        <button
                                            className={`absolute top-2 right-2 p-1 rounded-full transition-opacity ${
                                                note.is_pinned ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 opacity-0 group-hover:opacity-100'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTogglePin(e, note);
                                            }}
                                            title={note.is_pinned ? '取消置顶' : '置顶便签'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582a1.5 1.5 0 01.646 2.415l-1.222 1.222a1 1 0 01-.293.707L12 12.334V18a1 1 0 11-2 0v-5.666l-2.085-2.085a1 1 0 01-.293-.707L6.4 8.32a1.5 1.5 0 01.646-2.415L11 4.323V3a1 1 0 011-1z" />
                                            </svg>
                                        </button>
                                    )}

                                    <div className="p-4">
                                        <div className="text-sm text-gray-500 mb-2 flex justify-between">
                                            <span>创建：{new Date(note.created_at * 1000).toLocaleString()}</span>
                                            {note.updated_at > note.created_at && (
                                                <span>修改：{new Date(note.updated_at * 1000).toLocaleString()}</span>
                                            )}
                                        </div>
                                        {note.deleted_at && (
                                            <div className="text-sm text-red-500 mb-2">
                                                删除时间：{new Date(note.deleted_at * 1000).toLocaleString()}
                                            </div>
                                        )}
                                        <div className="text-gray-700 whitespace-pre-wrap break-words line-clamp-3">
                                            {note.content || '空白便签'}
                                        </div>
                                    </div>
                                    {note.screenshot_path && (
                                        <div className="border-t">
                                            <img
                                                src={`file://${note.screenshot_path}`}
                                                alt="Screenshot"
                                                className="w-full h-32 object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 便签编辑器 */}
            {selectedNote && !isSelectionMode && (
                <NoteEditor
                    note={selectedNote}
                    onClose={() => setSelectedNote(null)}
                    onDelete={handleDeleteNote}
                    onSave={loadNotes}
                />
            )}
        </div>
    );
}

export default App; 