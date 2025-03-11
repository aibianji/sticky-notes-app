"use client"

import { useState, useEffect } from "react"
import { Search, Plus, SettingsIcon, X, Clock, StickyNote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import NoteItem from "@/components/note-item"
import { ScrollArea } from "@/components/ui/scroll-area"
import NoteEditor from "@/components/note-editor"
import { useToast } from "@/components/ui/use-toast"

// 模拟Tauri API调用
const mockTauriAPI = {
  // 从SQLite数据库获取便签
  getNotes: async () => {
    // 在实际应用中，这将是对Tauri后端的调用
    console.log("调用Tauri API: 获取便签列表")
    return [
      {
        id: 1,
        content: "下午3点与团队会议",
        type: "text",
        createdAt: new Date("2023-05-15T15:00:00").toISOString(),
        color: "bg-yellow-100",
      },
      {
        id: 2,
        content: "/placeholder.svg?height=720&width=1280",
        type: "image",
        createdAt: new Date("2023-05-14T12:05:30").toISOString(),
        color: "bg-blue-100",
      },
      {
        id: 3,
        content: "购物清单：牛奶、鸡蛋、面包",
        type: "text",
        createdAt: new Date("2023-05-14T10:15:00").toISOString(),
        color: "bg-green-100",
      },
      {
        id: 4,
        content: "给妈妈打电话",
        type: "text",
        createdAt: new Date("2023-05-13T18:30:00").toISOString(),
        color: "bg-purple-100",
      },
      {
        id: 5,
        content: "/placeholder.svg?height=720&width=1280",
        type: "image",
        createdAt: new Date("2023-05-13T14:30:22").toISOString(),
        color: "bg-pink-100",
      },
    ]
  },
  // 添加新便签到SQLite数据库
  addNote: async (note) => {
    console.log("调用Tauri API: 添加便签", note)
    return { id: Date.now(), ...note }
  },
  // 更新便签
  updateNote: async (note) => {
    console.log("调用Tauri API: 更新便签", note)
    return note
  },
  // 删除便签
  deleteNote: async (noteId) => {
    console.log("调用Tauri API: 删除便签", noteId)
    return true
  },
  // 搜索便签
  searchNotes: async (query) => {
    console.log("调用Tauri API: 搜索便签", query)
    // 实际应用中会在SQLite中执行搜索
    return []
  },
  // 获取应用内存使用情况
  getMemoryUsage: async () => {
    console.log("调用Tauri API: 获取内存使用情况")
    return { usedMB: 32.5, totalMB: 50 }
  },
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [memoryUsage, setMemoryUsage] = useState({ usedMB: 0, totalMB: 50 })
  const { toast } = useToast()

  // 加载便签数据
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setIsLoading(true)
        // 在实际应用中，这将从Tauri后端获取数据
        const loadedNotes = await mockTauriAPI.getNotes()
        setNotes(loadedNotes)

        // 获取内存使用情况
        const memory = await mockTauriAPI.getMemoryUsage()
        setMemoryUsage(memory)
      } catch (error) {
        console.error("加载便签失败:", error)
        toast({
          title: "加载失败",
          description: "无法加载便签数据，请重试",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadNotes()

    // 设置定期检查内存使用情况
    const memoryCheckInterval = setInterval(async () => {
      const memory = await mockTauriAPI.getMemoryUsage()
      setMemoryUsage(memory)
    }, 30000) // 每30秒检查一次

    return () => clearInterval(memoryCheckInterval)
  }, [toast])

  // 过滤便签
  const filteredNotes = notes.filter((note) =>
    note.type === "text" ? note.content.toLowerCase().includes(searchQuery.toLowerCase()) : true,
  )

  // 添加便签
  const handleAddNote = async (newNote) => {
    try {
      // 在实际应用中，这将调用Tauri API保存到SQLite
      const savedNote = await mockTauriAPI.addNote({
        ...newNote,
        createdAt: new Date().toISOString(),
      })

      setNotes([savedNote, ...notes])
      setIsNewNoteOpen(false)

      toast({
        title: "便签已保存",
        description: "您的便签已成功保存",
      })
    } catch (error) {
      console.error("保存便签失败:", error)
      toast({
        title: "保存失败",
        description: "无法保存便签，请重试",
        variant: "destructive",
      })
    }
  }

  // 更新便签
  const handleUpdateNote = async (updatedNote) => {
    try {
      // 在实际应用中，这将调用Tauri API更新SQLite
      await mockTauriAPI.updateNote(updatedNote)
      setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)))

      toast({
        title: "便签已更新",
        description: "您的便签已成功更新",
      })
    } catch (error) {
      console.error("更新便签失败:", error)
      toast({
        title: "更新失败",
        description: "无法更新便签，请重试",
        variant: "destructive",
      })
    }
  }

  // 删除便签
  const handleDeleteNote = async (noteId) => {
    try {
      // 在实际应用中，这将调用Tauri API从SQLite删除
      await mockTauriAPI.deleteNote(noteId)
      setNotes(notes.filter((note) => note.id !== noteId))

      toast({
        title: "便签已删除",
        description: "您的便签已成功删除",
      })
    } catch (error) {
      console.error("删除便签失败:", error)
      toast({
        title: "删除失败",
        description: "无法删除便签，请重试",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">轻量级便签工具</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground mr-2">
              内存: {memoryUsage.usedMB.toFixed(1)}MB / {memoryUsage.totalMB}MB
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.close()}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索便签..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsNewNoteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建便签
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="all">所有便签</TabsTrigger>
            <TabsTrigger value="text">文本便签</TabsTrigger>
            <TabsTrigger value="image">截图便签</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {filteredNotes.map((note) => (
                    <NoteItem key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">没有找到便签</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : filteredNotes.filter((note) => note.type === "text").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {filteredNotes
                    .filter((note) => note.type === "text")
                    .map((note) => (
                      <NoteItem key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                    ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">没有找到文本便签</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="image" className="mt-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">加载中...</p>
                </div>
              ) : filteredNotes.filter((note) => note.type === "image").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                  {filteredNotes
                    .filter((note) => note.type === "image")
                    .map((note) => (
                      <NoteItem key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                    ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">没有找到截图便签</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isNewNoteOpen} onOpenChange={setIsNewNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建便签</DialogTitle>
          </DialogHeader>
          <NoteEditor onSave={handleAddNote} />
        </DialogContent>
      </Dialog>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <div className="fixed bottom-4 right-4 bg-card rounded-full shadow-lg p-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Win+Shift+C: 打开输入 | Win+Shift+X: 截图</span>
        </div>
      </div>
    </main>
  )
}

function SettingsDialog({ open, onOpenChange }) {
  const [dbPath, setDbPath] = useState("C:\\Users\\Username\\AppData\\Local\\StickyNotes\\data.db")
  const [isEncrypted, setIsEncrypted] = useState(true)

  const handleSaveSettings = () => {
    // 在实际应用中，这将调用Tauri API保存设置
    console.log("保存设置:", { dbPath, isEncrypted })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium col-span-1">打开输入</label>
            <div className="col-span-3 flex gap-1">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Win</kbd>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift</kbd>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">C</kbd>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium col-span-1">截图工具</label>
            <div className="col-span-3 flex gap-1">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Win</kbd>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift</kbd>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">X</kbd>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium col-span-1">开机启动</label>
            <div className="col-span-3">
              <input type="checkbox" id="autostart" className="mr-2" />
              <label htmlFor="autostart" className="text-sm">
                系统启动时自动运行
              </label>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium col-span-1">数据库路径</label>
            <div className="col-span-3 flex gap-2">
              <Input value={dbPath} onChange={(e) => setDbPath(e.target.value)} />
              <Button variant="outline" size="sm">
                浏览
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium col-span-1">数据加密</label>
            <div className="col-span-3">
              <input
                type="checkbox"
                id="encrypt"
                className="mr-2"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
              />
              <label htmlFor="encrypt" className="text-sm">
                启用SQLite数据加密
              </label>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium col-span-1">应用信息</label>
            <div className="col-span-3 text-xs text-muted-foreground">
              <p>轻量级便签工具 v1.0.0</p>
              <p>安装包大小: 8.5MB</p>
              <p>内存占用: &lt;50MB</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings}>保存设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

