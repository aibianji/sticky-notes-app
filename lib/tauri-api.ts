// 这个文件在实际应用中将导入和使用Tauri API
// 在这个示例中，我们只是模拟API调用

// 模拟Tauri的invoke函数
export async function invoke(command: string, args?: any): Promise<any> {
  console.log(`调用Tauri命令: ${command}`, args)

  // 模拟延迟
  await new Promise((resolve) => setTimeout(resolve, 300))

  // 根据命令返回模拟数据
  switch (command) {
    case "get_notes":
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

    case "add_note":
      return { id: Date.now(), ...args.note }

    case "update_note":
      return args.note

    case "delete_note":
      return true

    case "get_memory_usage":
      return { usedMB: Math.random() * 20 + 20, totalMB: 50 }

    case "take_screenshot":
      return { path: `/placeholder.svg?height=720&width=1280&time=${Date.now()}` }

    case "get_settings":
      return {
        dbPath: "C:\\Users\\Username\\AppData\\Local\\StickyNotes\\data.db",
        isEncrypted: true,
        startWithSystem: true,
      }

    case "save_settings":
      return true

    default:
      throw new Error(`未知的命令: ${command}`)
  }
}

// 便签相关API
export const notesApi = {
  // 获取所有便签
  getAllNotes: async () => {
    return invoke("get_notes")
  },

  // 添加便签
  addNote: async (note: any) => {
    return invoke("add_note", { note })
  },

  // 更新便签
  updateNote: async (note: any) => {
    return invoke("update_note", { note })
  },

  // 删除便签
  deleteNote: async (noteId: number) => {
    return invoke("delete_note", { noteId })
  },

  // 搜索便签
  searchNotes: async (query: string) => {
    return invoke("search_notes", { query })
  },
}

// 系统相关API
export const systemApi = {
  // 获取内存使用情况
  getMemoryUsage: async () => {
    return invoke("get_memory_usage")
  },

  // 截图
  takeScreenshot: async () => {
    return invoke("take_screenshot")
  },

  // 获取设置
  getSettings: async () => {
    return invoke("get_settings")
  },

  // 保存设置
  saveSettings: async (settings: any) => {
    return invoke("save_settings", { settings })
  },

  // 退出应用
  exitApp: async () => {
    return invoke("exit_app")
  },
}

