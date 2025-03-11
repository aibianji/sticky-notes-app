use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use crate::key_manager;
use std::io::{Error as IoError, ErrorKind};

// 使用单例模式管理数据库连接
static DB_CONNECTION: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

// 数据库文件名
const DB_FILENAME: &str = "stickynotes.db";

// 数据结构定义
pub struct Note {
    pub id: Option<i64>,
    pub content: String,
    pub screenshot_path: Option<String>,
    pub created_at: i64,  // Unix时间戳
    pub updated_at: Option<i64>,
    pub is_pinned: bool,
    pub color: Option<String>,
    pub category_id: Option<i64>,
    pub deleted_at: Option<i64>,  // 软删除标记
}

pub struct NoteReminder {
    pub id: Option<i64>,
    pub note_id: i64,
    pub reminder_time: i64,  // Unix时间戳
    pub completed: bool,
}

pub struct Category {
    pub id: Option<i64>,
    pub name: String,
    pub color: Option<String>,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Self {
        let db_path = get_db_path().expect("无法获取数据库路径");
        let conn = Connection::open(&db_path).expect("无法打开数据库");
        
        // 设置加密密钥
        let key = key_manager::get_encryption_key().expect("无法获取加密密钥");
        conn.execute_batch(&format!("PRAGMA key = '{}';", key))
            .expect("无法设置数据库加密密钥");
            
        Database { conn }
    }

    pub fn get_notes(&self) -> Result<Vec<Note>, IoError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, content, screenshot_path, created_at, updated_at, is_pinned, color, category_id, deleted_at 
             FROM notes 
             WHERE deleted_at IS NULL 
             ORDER BY is_pinned DESC, created_at DESC"
        ).map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
        
        let notes = stmt.query_map([], |row| {
            Ok(Note {
                id: Some(row.get(0)?),
                content: row.get(1)?,
                screenshot_path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_pinned: row.get(5)?,
                color: row.get(6)?,
                category_id: row.get(7)?,
                deleted_at: row.get(8)?,
            })
        }).map_err(|e| IoError::new(ErrorKind::Other, format!("查询便签失败: {}", e)))?;
        
        notes.collect::<Result<Vec<_>, _>>()
            .map_err(|e| IoError::new(ErrorKind::Other, format!("处理查询结果失败: {}", e)))
    }

    pub fn add_note(&self, content: &str, screenshot_path: Option<&str>) -> Result<i64, IoError> {
        let now = chrono::Utc::now().timestamp();
        
        match self.conn.execute(
            "INSERT INTO notes (content, screenshot_path, created_at, is_pinned) 
             VALUES (?1, ?2, ?3, 0)",
            params![content, screenshot_path, now],
        ) {
            Ok(_) => Ok(self.conn.last_insert_rowid()),
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("创建便签失败: {}", e))),
        }
    }
}

// 获取数据库文件路径
fn get_db_path() -> Result<PathBuf, IoError> {
    let mut path = match dirs::data_dir() {
        Some(data_dir) => data_dir,
        None => return Err(IoError::new(ErrorKind::NotFound, "无法找到数据目录")),
    };
    path.push("stickynotes");
    
    // 确保目录存在
    if !path.exists() {
        std::fs::create_dir_all(&path)?;
    }
    
    path.push(DB_FILENAME);
    Ok(path)
}

// 初始化数据库连接
pub fn init_db() -> Result<(), IoError> {
    let mut db_instance = DB_CONNECTION.lock().unwrap();
    
    // 如果连接已经存在，先关闭它
    if db_instance.is_some() {
        *db_instance = None;
    }
    
    // 获取数据库路径
    let db_path = get_db_path()?;
    
    // 获取加密密钥
    let key = key_manager::get_encryption_key()?;
    
    // 连接数据库
    match Connection::open(&db_path) {
        Ok(mut conn) => {
            // 设置加密密钥
            conn.execute_batch(&format!("PRAGMA key = '{}';", key))
                .map_err(|e| IoError::new(ErrorKind::Other, format!("数据库加密失败: {}", e)))?;
            
            // 创建所需的表
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS notes (
                    id INTEGER PRIMARY KEY,
                    content TEXT NOT NULL,
                    screenshot_path TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER,
                    is_pinned BOOLEAN NOT NULL DEFAULT 0,
                    color TEXT,
                    category_id INTEGER,
                    deleted_at INTEGER,
                    FOREIGN KEY (category_id) REFERENCES categories (id)
                );
                
                CREATE TABLE IF NOT EXISTS note_reminders (
                    id INTEGER PRIMARY KEY,
                    note_id INTEGER NOT NULL,
                    reminder_time INTEGER NOT NULL,
                    completed BOOLEAN NOT NULL DEFAULT 0,
                    FOREIGN KEY (note_id) REFERENCES notes (id)
                );
                
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at);
                CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes (is_pinned);
                CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes (category_id);
                CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes (deleted_at);
                CREATE INDEX IF NOT EXISTS idx_reminders_time ON note_reminders (reminder_time);
                CREATE INDEX IF NOT EXISTS idx_reminders_note_id ON note_reminders (note_id);"
            )
            .map_err(|e| IoError::new(ErrorKind::Other, format!("创建数据库表失败: {}", e)))?;
            
            // 保存连接
            *db_instance = Some(conn);
            Ok(())
        },
        Err(e) => Err(IoError::new(ErrorKind::Other, format!("连接数据库失败: {}", e))),
    }
}

// 获取数据库连接
fn get_db() -> Result<Connection, IoError> {
    let db_instance = DB_CONNECTION.lock().unwrap();
    match &*db_instance {
        Some(conn) => Ok(conn.try_clone().map_err(|e| IoError::new(ErrorKind::Other, format!("克隆数据库连接失败: {}", e)))?),
        None => Err(IoError::new(ErrorKind::NotFound, "数据库未初始化")),
    }
}

// ======= 笔记操作 =======

// 创建或更新便签
pub fn save_note(note: &Note) -> Result<i64, IoError> {
    let conn = get_db()?;

    // 如果note.id为None，则插入新记录；否则更新现有记录
    if note.id.is_none() {
        // 插入新便签
        match conn.execute(
            "INSERT INTO notes (content, screenshot_path, created_at, updated_at, is_pinned, color, category_id, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                note.content,
                note.screenshot_path,
                note.created_at,
                note.updated_at,
                note.is_pinned,
                note.color,
                note.category_id,
                note.deleted_at
            ],
        ) {
            Ok(_) => {
                let id = conn.last_insert_rowid();
                Ok(id)
            },
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("创建便签失败: {}", e))),
        }
    } else {
        // 更新现有便签
        let id = note.id.unwrap();
        match conn.execute(
            "UPDATE notes SET 
                content = ?1, 
                screenshot_path = ?2,
                updated_at = ?3,
                is_pinned = ?4,
                color = ?5,
                category_id = ?6,
                deleted_at = ?7
             WHERE id = ?8",
            params![
                note.content,
                note.screenshot_path,
                note.updated_at,
                note.is_pinned,
                note.color,
                note.category_id,
                note.deleted_at,
                id
            ],
        ) {
            Ok(_) => Ok(id),
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("更新便签失败: {}", e))),
        }
    }
}

// 根据ID获取便签
pub fn get_note(id: i64) -> Result<Option<Note>, IoError> {
    let conn = get_db()?;
    
    let mut stmt = conn.prepare(
        "SELECT id, content, screenshot_path, created_at, updated_at, is_pinned, color, category_id, deleted_at 
         FROM notes 
         WHERE id = ?1"
    ).map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let note_result = stmt.query_row(params![id], |row| {
        Ok(Note {
            id: Some(row.get(0)?),
            content: row.get(1)?,
            screenshot_path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            is_pinned: row.get(5)?,
            color: row.get(6)?,
            category_id: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    });
    
    match note_result {
        Ok(note) => Ok(Some(note)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(IoError::new(ErrorKind::Other, format!("查询便签失败: {}", e))),
    }
}

// 获取所有便签，按照是否置顶和创建时间排序
pub fn get_notes_sorted(limit: Option<i64>, offset: Option<i64>, search: Option<&str>) -> Result<Vec<Note>, IoError> {
    let conn = get_db()?;
    
    let mut query = String::from(
        "SELECT id, content, screenshot_path, created_at, updated_at, is_pinned, color, category_id, deleted_at 
         FROM notes 
         WHERE deleted_at IS NULL"
    );
    
    // 添加搜索条件
    if let Some(search_term) = search {
        query.push_str(&format!(" AND content LIKE '%{}%'", search_term.replace('\'', "''")));
    }
    
    // 添加排序
    query.push_str(" ORDER BY is_pinned DESC, created_at DESC");
    
    // 添加分页
    if let Some(limit_val) = limit {
        query.push_str(&format!(" LIMIT {}", limit_val));
        
        if let Some(offset_val) = offset {
            query.push_str(&format!(" OFFSET {}", offset_val));
        }
    }
    
    let mut stmt = conn.prepare(&query)
        .map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let note_iter = stmt.query_map([], |row| {
        Ok(Note {
            id: Some(row.get(0)?),
            content: row.get(1)?,
            screenshot_path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            is_pinned: row.get(5)?,
            color: row.get(6)?,
            category_id: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    }).map_err(|e| IoError::new(ErrorKind::Other, format!("执行查询失败: {}", e)))?;
    
    let mut notes = Vec::new();
    for note_result in note_iter {
        match note_result {
            Ok(note) => notes.push(note),
            Err(e) => return Err(IoError::new(ErrorKind::Other, format!("处理查询结果失败: {}", e))),
        }
    }
    
    Ok(notes)
}

// 获取回收站中的便签
pub fn get_trash_notes() -> Result<Vec<Note>, IoError> {
    let conn = get_db()?;
    
    let mut stmt = conn.prepare(
        "SELECT id, content, screenshot_path, created_at, updated_at, is_pinned, color, category_id, deleted_at 
         FROM notes 
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC"
    ).map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let note_iter = stmt.query_map([], |row| {
        Ok(Note {
            id: Some(row.get(0)?),
            content: row.get(1)?,
            screenshot_path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            is_pinned: row.get(5)?,
            color: row.get(6)?,
            category_id: row.get(7)?,
            deleted_at: row.get(8)?,
        })
    }).map_err(|e| IoError::new(ErrorKind::Other, format!("执行查询失败: {}", e)))?;
    
    let mut notes = Vec::new();
    for note_result in note_iter {
        match note_result {
            Ok(note) => notes.push(note),
            Err(e) => return Err(IoError::new(ErrorKind::Other, format!("处理查询结果失败: {}", e))),
        }
    }
    
    Ok(notes)
}

// 将便签移到回收站
pub fn move_note_to_trash(id: i64, timestamp: i64) -> Result<(), IoError> {
    let conn = get_db()?;
    
    match conn.execute(
        "UPDATE notes SET deleted_at = ?1 WHERE id = ?2",
        params![timestamp, id],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(IoError::new(ErrorKind::Other, format!("移动便签到回收站失败: {}", e))),
    }
}

// 从回收站恢复便签
pub fn restore_note_from_trash(id: i64) -> Result<(), IoError> {
    let conn = get_db()?;
    
    match conn.execute(
        "UPDATE notes SET deleted_at = NULL WHERE id = ?1",
        params![id],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(IoError::new(ErrorKind::Other, format!("从回收站恢复便签失败: {}", e))),
    }
}

// 永久删除便签
pub fn delete_note_permanently(id: i64) -> Result<(), IoError> {
    let conn = get_db()?;
    
    // 开始事务
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| IoError::new(ErrorKind::Other, format!("开始事务失败: {}", e)))?;
    
    // 先删除与便签关联的提醒
    match conn.execute(
        "DELETE FROM note_reminders WHERE note_id = ?1",
        params![id],
    ) {
        Ok(_) => {},
        Err(e) => {
            conn.execute("ROLLBACK", []).ok();
            return Err(IoError::new(ErrorKind::Other, format!("删除便签提醒失败: {}", e)));
        }
    }
    
    // 再删除便签本身
    match conn.execute(
        "DELETE FROM notes WHERE id = ?1",
        params![id],
    ) {
        Ok(_) => {
            // 提交事务
            conn.execute("COMMIT", [])
                .map_err(|e| IoError::new(ErrorKind::Other, format!("提交事务失败: {}", e)))?;
            Ok(())
        },
        Err(e) => {
            conn.execute("ROLLBACK", []).ok();
            Err(IoError::new(ErrorKind::Other, format!("永久删除便签失败: {}", e)))
        }
    }
}

// 清理回收站（删除30天前的便签）
pub fn cleanup_trash(days: i64) -> Result<i32, IoError> {
    let conn = get_db()?;
    
    // 计算30天前的时间戳
    let now = chrono::Utc::now().timestamp();
    let threshold = now - (days * 24 * 60 * 60); // days天的秒数
    
    // 获取要删除的便签ID列表
    let mut stmt = conn.prepare(
        "SELECT id FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ?1"
    ).map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let note_ids: Result<Vec<i64>, _> = stmt.query_map(params![threshold], |row| row.get(0))
        .map_err(|e| IoError::new(ErrorKind::Other, format!("执行查询失败: {}", e)))?
        .collect();
    
    let note_ids = match note_ids {
        Ok(ids) => ids,
        Err(e) => return Err(IoError::new(ErrorKind::Other, format!("收集便签ID失败: {}", e))),
    };
    
    let mut deleted_count = 0;
    
    // 开始事务
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| IoError::new(ErrorKind::Other, format!("开始事务失败: {}", e)))?;
    
    // 逐个删除便签及其关联的提醒
    for id in note_ids {
        // 先删除提醒
        match conn.execute(
            "DELETE FROM note_reminders WHERE note_id = ?1",
            params![id],
        ) {
            Ok(_) => {},
            Err(e) => {
                conn.execute("ROLLBACK", []).ok();
                return Err(IoError::new(ErrorKind::Other, format!("删除便签提醒失败: {}", e)));
            }
        }
        
        // 再删除便签
        match conn.execute(
            "DELETE FROM notes WHERE id = ?1",
            params![id],
        ) {
            Ok(_) => deleted_count += 1,
            Err(e) => {
                conn.execute("ROLLBACK", []).ok();
                return Err(IoError::new(ErrorKind::Other, format!("删除便签失败: {}", e)));
            }
        }
    }
    
    // 提交事务
    conn.execute("COMMIT", [])
        .map_err(|e| IoError::new(ErrorKind::Other, format!("提交事务失败: {}", e)))?;
    
    Ok(deleted_count)
}

// 切换便签置顶状态
pub fn toggle_note_pin(id: i64) -> Result<bool, IoError> {
    let conn = get_db()?;
    
    // 首先获取当前的置顶状态
    let mut stmt = conn.prepare("SELECT is_pinned FROM notes WHERE id = ?1")
        .map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let is_pinned = match stmt.query_row(params![id], |row| row.get::<_, bool>(0)) {
        Ok(value) => value,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Err(IoError::new(ErrorKind::NotFound, "便签不存在"));
        },
        Err(e) => {
            return Err(IoError::new(ErrorKind::Other, format!("查询便签置顶状态失败: {}", e)));
        }
    };
    
    // 更新为相反的状态
    let new_status = !is_pinned;
    match conn.execute(
        "UPDATE notes SET is_pinned = ?1 WHERE id = ?2",
        params![new_status, id],
    ) {
        Ok(_) => Ok(new_status),
        Err(e) => Err(IoError::new(ErrorKind::Other, format!("更新便签置顶状态失败: {}", e))),
    }
}

// ======= 提醒操作 =======

// 保存便签提醒
pub fn save_reminder(reminder: &NoteReminder) -> Result<i64, IoError> {
    let conn = get_db()?;
    
    if reminder.id.is_none() {
        // 插入新提醒
        match conn.execute(
            "INSERT INTO note_reminders (note_id, reminder_time, completed)
             VALUES (?1, ?2, ?3)",
            params![
                reminder.note_id,
                reminder.reminder_time,
                reminder.completed
            ],
        ) {
            Ok(_) => {
                let id = conn.last_insert_rowid();
                Ok(id)
            },
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("创建提醒失败: {}", e))),
        }
    } else {
        // 更新现有提醒
        let id = reminder.id.unwrap();
        match conn.execute(
            "UPDATE note_reminders SET 
                note_id = ?1, 
                reminder_time = ?2,
                completed = ?3
             WHERE id = ?4",
            params![
                reminder.note_id,
                reminder.reminder_time,
                reminder.completed,
                id
            ],
        ) {
            Ok(_) => Ok(id),
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("更新提醒失败: {}", e))),
        }
    }
}

// 获取便签的所有提醒
pub fn get_reminders_by_note(note_id: i64) -> Result<Vec<NoteReminder>, IoError> {
    let conn = get_db()?;
    
    let mut stmt = conn.prepare(
        "SELECT id, note_id, reminder_time, completed 
         FROM note_reminders 
         WHERE note_id = ?1
         ORDER BY reminder_time ASC"
    ).map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let reminder_iter = stmt.query_map(params![note_id], |row| {
        Ok(NoteReminder {
            id: Some(row.get(0)?),
            note_id: row.get(1)?,
            reminder_time: row.get(2)?,
            completed: row.get(3)?,
        })
    }).map_err(|e| IoError::new(ErrorKind::Other, format!("执行查询失败: {}", e)))?;
    
    let mut reminders = Vec::new();
    for reminder_result in reminder_iter {
        match reminder_result {
            Ok(reminder) => reminders.push(reminder),
            Err(e) => return Err(IoError::new(ErrorKind::Other, format!("处理查询结果失败: {}", e))),
        }
    }
    
    Ok(reminders)
}

// 删除便签提醒
pub fn delete_reminder(id: i64) -> Result<(), IoError> {
    let conn = get_db()?;
    
    match conn.execute(
        "DELETE FROM note_reminders WHERE id = ?1",
        params![id],
    ) {
        Ok(_) => Ok(()),
        Err(e) => Err(IoError::new(ErrorKind::Other, format!("删除提醒失败: {}", e))),
    }
}

// 获取即将到期的提醒
pub fn get_upcoming_reminders(limit: Option<i64>) -> Result<Vec<(NoteReminder, Note)>, IoError> {
    let conn = get_db()?;
    
    let mut query = String::from(
        "SELECT r.id, r.note_id, r.reminder_time, r.completed, 
                n.id, n.content, n.screenshot_path, n.created_at, n.updated_at, n.is_pinned, n.color, n.category_id, n.deleted_at 
         FROM note_reminders r
         JOIN notes n ON r.note_id = n.id
         WHERE r.completed = 0 AND n.deleted_at IS NULL
         ORDER BY r.reminder_time ASC"
    );
    
    // 添加限制
    if let Some(limit_val) = limit {
        query.push_str(&format!(" LIMIT {}", limit_val));
    }
    
    let mut stmt = conn.prepare(&query)
        .map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let result_iter = stmt.query_map([], |row| {
        let reminder = NoteReminder {
            id: Some(row.get(0)?),
            note_id: row.get(1)?,
            reminder_time: row.get(2)?,
            completed: row.get(3)?,
        };
        
        let note = Note {
            id: Some(row.get(4)?),
            content: row.get(5)?,
            screenshot_path: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            is_pinned: row.get(9)?,
            color: row.get(10)?,
            category_id: row.get(11)?,
            deleted_at: row.get(12)?,
        };
        
        Ok((reminder, note))
    }).map_err(|e| IoError::new(ErrorKind::Other, format!("执行查询失败: {}", e)))?;
    
    let mut results = Vec::new();
    for result in result_iter {
        match result {
            Ok(pair) => results.push(pair),
            Err(e) => return Err(IoError::new(ErrorKind::Other, format!("处理查询结果失败: {}", e))),
        }
    }
    
    Ok(results)
}

// ======= 分类操作 =======

// 保存分类
pub fn save_category(category: &Category) -> Result<i64, IoError> {
    let conn = get_db()?;
    
    if category.id.is_none() {
        // 插入新分类
        match conn.execute(
            "INSERT INTO categories (name, color)
             VALUES (?1, ?2)",
            params![
                category.name,
                category.color
            ],
        ) {
            Ok(_) => {
                let id = conn.last_insert_rowid();
                Ok(id)
            },
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("创建分类失败: {}", e))),
        }
    } else {
        // 更新现有分类
        let id = category.id.unwrap();
        match conn.execute(
            "UPDATE categories SET 
                name = ?1, 
                color = ?2
             WHERE id = ?3",
            params![
                category.name,
                category.color,
                id
            ],
        ) {
            Ok(_) => Ok(id),
            Err(e) => Err(IoError::new(ErrorKind::Other, format!("更新分类失败: {}", e))),
        }
    }
}

// 获取所有分类
pub fn get_all_categories() -> Result<Vec<Category>, IoError> {
    let conn = get_db()?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, color
         FROM categories
         ORDER BY name ASC"
    ).map_err(|e| IoError::new(ErrorKind::Other, format!("准备查询语句失败: {}", e)))?;
    
    let category_iter = stmt.query_map([], |row| {
        Ok(Category {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            color: row.get(2)?,
        })
    }).map_err(|e| IoError::new(ErrorKind::Other, format!("执行查询失败: {}", e)))?;
    
    let mut categories = Vec::new();
    for category_result in category_iter {
        match category_result {
            Ok(category) => categories.push(category),
            Err(e) => return Err(IoError::new(ErrorKind::Other, format!("处理查询结果失败: {}", e))),
        }
    }
    
    Ok(categories)
}

// 删除分类
pub fn delete_category(id: i64) -> Result<(), IoError> {
    let conn = get_db()?;
    
    // 开始事务
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| IoError::new(ErrorKind::Other, format!("开始事务失败: {}", e)))?;
    
    // 先将该分类下的便签的分类ID设为NULL
    match conn.execute(
        "UPDATE notes SET category_id = NULL WHERE category_id = ?1",
        params![id],
    ) {
        Ok(_) => {},
        Err(e) => {
            conn.execute("ROLLBACK", []).ok();
            return Err(IoError::new(ErrorKind::Other, format!("更新便签分类失败: {}", e)));
        }
    }
    
    // 再删除分类
    match conn.execute(
        "DELETE FROM categories WHERE id = ?1",
        params![id],
    ) {
        Ok(_) => {
            // 提交事务
            conn.execute("COMMIT", [])
                .map_err(|e| IoError::new(ErrorKind::Other, format!("提交事务失败: {}", e)))?;
            Ok(())
        },
        Err(e) => {
            conn.execute("ROLLBACK", []).ok();
            Err(IoError::new(ErrorKind::Other, format!("删除分类失败: {}", e)))
        }
    }
}

// 为了兼容性提供的别名函数
pub fn init_database() -> Result<(), IoError> {
    init_db()
}

// 获取所有便签的包装函数
pub fn get_notes() -> Result<Vec<Note>, IoError> {
    get_notes_sorted(None, None, None)
} 