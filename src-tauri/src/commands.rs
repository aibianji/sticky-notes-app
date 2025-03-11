use crate::db::{Database, Note, Category};
use std::sync::Mutex;
use tauri::State;
use std::path::PathBuf;
use tauri::api::shell;
use std::fs;
use base64;
use image;
use chrono::Local;
use uuid::Uuid;
use rusqlite::params;
use std::time::{SystemTime, Duration};
use serde::{Deserialize, Serialize};
use chrono::Utc;

pub struct DatabaseState(pub Mutex<Database>);

// 前端响应类型
#[derive(Serialize, Deserialize)]
pub struct NoteResponse {
    pub id: i64,
    pub content: String,
    pub screenshot_path: Option<String>,
    pub created_at: u64,
    pub updated_at: Option<u64>,
    pub is_pinned: bool,
    pub color: Option<String>,
    pub category_id: Option<i64>,
    pub deleted_at: Option<u64>,
}

#[derive(Serialize, Deserialize)]
pub struct NoteReminderResponse {
    pub id: i64,
    pub note_id: i64,
    pub reminder_time: u64,
    pub completed: bool,
}

#[derive(Serialize, Deserialize)]
pub struct CategoryResponse {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
}

#[tauri::command]
pub async fn add_note(
    content: String,
    screenshot_path: Option<String>,
    db: State<'_, DatabaseState>,
) -> Result<i64, String> {
    db.0.lock()
        .unwrap()
        .add_note(&content, screenshot_path.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_notes(db: State<'_, DatabaseState>) -> Result<Vec<NoteResponse>, String> {
    db.0.lock()
        .unwrap()
        .get_notes()
        .map(|notes| {
            notes
                .into_iter()
                .map(|note| NoteResponse {
                    id: note.id.unwrap_or(0),
                    content: note.content,
                    screenshot_path: note.screenshot_path,
                    created_at: note.created_at as u64,
                    updated_at: note.updated_at.map(|t| t as u64),
                    is_pinned: note.is_pinned,
                    color: note.color,
                    category_id: note.category_id,
                    deleted_at: note.deleted_at.map(|t| t as u64),
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note(id: i64, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .delete_note(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_note(id: i64, content: String, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .update_note(id, &content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_link(url: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    shell::open(&app_handle.shell_scope(), url, None)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_pasted_image(
    image_data: String,
    app_handle: tauri::AppHandle,
    db: State<'_, DatabaseState>,
) -> Result<String, String> {
    // 获取应用数据目录
    let app_dir = tauri::api::path::app_data_dir(&app_handle.config())
        .ok_or("无法获取应用数据目录")?;
    let images_dir = app_dir.join("images");
    
    // 创建图片存储目录
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // 解码base64图片数据
    let image_data = image_data.replace("data:image/png;base64,", "");
    let image_bytes = base64::decode(image_data).map_err(|e| e.to_string())?;

    // 生成唯一文件名
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let unique_id = Uuid::new_v4().to_string().split('-').next().unwrap();
    let filename = format!("paste_{}_{}.png", timestamp, unique_id);
    let file_path = images_dir.join(&filename);

    // 保存图片文件
    fs::write(&file_path, image_bytes).map_err(|e| e.to_string())?;

    // 返回相对路径
    Ok(format!("./images/{}", filename))
}

#[tauri::command]
pub async fn handle_file_drop(
    file_path: String,
    app_handle: tauri::AppHandle,
    db: State<'_, DatabaseState>,
) -> Result<String, String> {
    // 获取应用数据目录
    let app_dir = tauri::api::path::app_data_dir(&app_handle.config())
        .ok_or("无法获取应用数据目录")?;
    let images_dir = app_dir.join("images");
    
    // 创建图片存储目录
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // 读取源文件
    let image = image::open(&file_path).map_err(|e| e.to_string())?;

    // 生成唯一文件名
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let unique_id = Uuid::new_v4().to_string().split('-').next().unwrap();
    let filename = format!("drop_{}_{}.png", timestamp, unique_id);
    let file_path = images_dir.join(&filename);

    // 保存为PNG格式
    image.save(&file_path).map_err(|e| e.to_string())?;

    // 返回相对路径
    Ok(format!("./images/{}", filename))
}

#[tauri::command]
pub async fn update_note_color(id: i64, color: String, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .update_note_color(id, &color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_category(
    name: String,
    color: String,
    db: State<'_, DatabaseState>,
) -> Result<i64, String> {
    db.0.lock()
        .unwrap()
        .add_category(&name, &color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_categories(db: State<'_, DatabaseState>) -> Result<Vec<Category>, String> {
    db.0.lock()
        .unwrap()
        .get_categories()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_category(
    id: i64,
    name: String,
    color: String,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .update_category(id, &name, &color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_category(id: i64, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .delete_category(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_category_order(
    id: i64,
    new_order: i32,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .update_category_order(id, new_order)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_notes_by_category(
    category_id: i64,
    db: State<'_, DatabaseState>,
) -> Result<Vec<NoteResponse>, String> {
    db.0.lock()
        .unwrap()
        .get_notes_by_category(category_id)
        .map(|notes| {
            notes
                .into_iter()
                .map(|note| NoteResponse {
                    id: note.id,
                    content: note.content,
                    screenshot_path: note.screenshot_path,
                    created_at: note.created_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    color: note.color,
                    category_id: note.category_id,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_note_category(
    id: i64,
    category_id: Option<i64>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .update_note_category(id, category_id)
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct NoteResponse {
    pub id: i64,
    pub content: String,
    pub screenshot_path: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
    pub deleted_at: Option<u64>,
    pub color: Option<String>,
    pub category_id: Option<i64>,
    pub is_pinned: bool,
}

#[derive(serde::Deserialize)]
pub enum NoteSortOption {
    CreatedTimeDesc,   // 创建时间降序
    CreatedTimeAsc,    // 创建时间升序
    UpdatedTimeDesc,   // 修改时间降序
    UpdatedTimeAsc,    // 修改时间升序
}

#[tauri::command]
pub async fn get_notes_sorted(
    sort_by: NoteSortOption,
    category_id: Option<i64>,
    db: State<'_, DatabaseState>
) -> Result<Vec<NoteResponse>, String> {
    let conn = db.0.lock().unwrap();
    
    let mut query = String::from(
        "SELECT id, content, screenshot_path, color, category_id, created_at, updated_at, deleted_at, is_pinned 
         FROM notes WHERE deleted_at IS NULL"
    );
    
    if let Some(cat_id) = category_id {
        query.push_str(" AND category_id = ?");
    }
    
    query.push_str(" ORDER BY is_pinned DESC, ");
    query.push_str(match sort_by {
        NoteSortOption::CreatedTimeDesc => "created_at DESC",
        NoteSortOption::CreatedTimeAsc => "created_at ASC",
        NoteSortOption::UpdatedTimeDesc => "updated_at DESC",
        NoteSortOption::UpdatedTimeAsc => "updated_at ASC",
    });

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let rows = if let Some(cat_id) = category_id {
        stmt.query_map(params![cat_id], |row| {
            Ok(NoteResponse {
                id: row.get(0)?,
                content: row.get(1)?,
                screenshot_path: row.get(2)?,
                color: row.get(3)?,
                category_id: row.get(4)?,
                created_at: row.get::<_, std::time::SystemTime>(5)?
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                updated_at: row.get::<_, std::time::SystemTime>(6)?
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                deleted_at: row.get::<_, Option<std::time::SystemTime>>(7)?
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()),
                is_pinned: row.get(8)?,
            })
        })
    } else {
        stmt.query_map([], |row| {
            Ok(NoteResponse {
                id: row.get(0)?,
                content: row.get(1)?,
                screenshot_path: row.get(2)?,
                color: row.get(3)?,
                category_id: row.get(4)?,
                created_at: row.get::<_, std::time::SystemTime>(5)?
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                updated_at: row.get::<_, std::time::SystemTime>(6)?
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                deleted_at: row.get::<_, Option<std::time::SystemTime>>(7)?
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()),
                is_pinned: row.get(8)?,
            })
        })
    }.map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in rows {
        notes.push(note.map_err(|e| e.to_string())?);
    }

    Ok(notes)
}

#[tauri::command]
pub async fn search_notes(query: String, category_id: Option<i64>) -> Result<Vec<Note>, String> {
    let conn = DB_POOL.get().map_err(|e| e.to_string())?;
    let mut stmt_str = String::from(
        "SELECT id, content, screenshot_path, color, category_id, created_at FROM notes WHERE content LIKE ?"
    );
    
    if let Some(cat_id) = category_id {
        stmt_str.push_str(" AND category_id = ?");
    }
    stmt_str.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&stmt_str).map_err(|e| e.to_string())?;
    
    let search_pattern = format!("%{}%", query);
    let rows = if let Some(cat_id) = category_id {
        stmt.query_map(params![search_pattern, cat_id], |row| {
            Ok(Note {
                id: row.get(0)?,
                content: row.get(1)?,
                screenshot_path: row.get(2)?,
                color: row.get(3)?,
                category_id: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
    } else {
        stmt.query_map(params![search_pattern], |row| {
            Ok(Note {
                id: row.get(0)?,
                content: row.get(1)?,
                screenshot_path: row.get(2)?,
                color: row.get(3)?,
                category_id: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
    }.map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in rows {
        notes.push(note.map_err(|e| e.to_string())?);
    }

    Ok(notes)
}

#[tauri::command]
pub async fn toggle_note_pin(id: i64, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .toggle_note_pin(id)
        .map_err(|e| e.to_string())
}

// 软删除便签
#[tauri::command]
pub async fn move_notes_to_trash(ids: Vec<i64>, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .move_notes_to_trash(&ids)
        .map_err(|e| e.to_string())
}

// 从回收站恢复便签
#[tauri::command]
pub async fn restore_notes_from_trash(ids: Vec<i64>, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .restore_notes_from_trash(&ids)
        .map_err(|e| e.to_string())
}

// 永久删除便签
#[tauri::command]
pub async fn permanently_delete_notes(ids: Vec<i64>, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .permanently_delete_notes(&ids)
        .map_err(|e| e.to_string())
}

// 获取回收站中的便签
#[tauri::command]
pub async fn get_trash_notes(db: State<'_, DatabaseState>) -> Result<Vec<NoteResponse>, String> {
    db.0.lock()
        .unwrap()
        .get_trash_notes()
        .map(|notes| {
            notes
                .into_iter()
                .map(|note| NoteResponse {
                    id: note.id,
                    content: note.content,
                    screenshot_path: note.screenshot_path,
                    created_at: note.created_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    updated_at: note.updated_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    deleted_at: note.deleted_at.map(|t| {
                        t.duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs()
                    }),
                    color: note.color,
                    category_id: note.category_id,
                    is_pinned: note.is_pinned,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

// 清理回收站中超过30天的便签
#[tauri::command]
pub async fn cleanup_trash(db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .cleanup_trash()
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct ReminderResponse {
    pub id: i64,
    pub note_id: i64,
    pub remind_at: u64,
    pub is_triggered: bool,
    pub created_at: u64,
    pub note_content: String,
}

#[tauri::command]
pub async fn add_reminder(note_id: i64, remind_at: u64, db: State<'_, DatabaseState>) -> Result<i64, String> {
    let remind_time = SystemTime::UNIX_EPOCH + Duration::from_secs(remind_at);
    db.0.lock()
        .unwrap()
        .add_reminder(note_id, remind_time)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pending_reminders(db: State<'_, DatabaseState>) -> Result<Vec<ReminderResponse>, String> {
    db.0.lock()
        .unwrap()
        .get_pending_reminders()
        .map(|reminders| {
            reminders
                .into_iter()
                .map(|(reminder, content)| ReminderResponse {
                    id: reminder.id,
                    note_id: reminder.note_id,
                    remind_at: reminder.remind_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    is_triggered: reminder.is_triggered,
                    created_at: reminder.created_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    note_content: content,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_reminder_triggered(id: i64, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .mark_reminder_triggered(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_reminder(id: i64, db: State<'_, DatabaseState>) -> Result<(), String> {
    db.0.lock()
        .unwrap()
        .delete_reminder(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_reminders_by_note(note_id: i64, db: State<'_, DatabaseState>) -> Result<Vec<ReminderResponse>, String> {
    db.0.lock()
        .unwrap()
        .get_reminders_by_note(note_id)
        .map(|reminders| {
            reminders
                .into_iter()
                .map(|reminder| ReminderResponse {
                    id: reminder.id,
                    note_id: reminder.note_id,
                    remind_at: reminder.remind_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    is_triggered: reminder.is_triggered,
                    created_at: reminder.created_at
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                    note_content: String::new(), // 这里不需要内容
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_reminder(id: i64, remind_at: u64, db: State<'_, DatabaseState>) -> Result<(), String> {
    let remind_time = SystemTime::UNIX_EPOCH + Duration::from_secs(remind_at);
    db.0.lock()
        .unwrap()
        .update_reminder(id, remind_time)
        .map_err(|e| e.to_string())
}

// 初始化数据库
#[tauri::command]
pub fn init_database() -> Result<bool, String> {
    match db::init_db() {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("初始化数据库失败: {}", e)),
    }
}

// 便签相关命令
#[tauri::command]
pub fn create_note(content: String, screenshot_path: Option<String>, category_id: Option<i64>) -> Result<i64, String> {
    let now = Utc::now().timestamp() as i64;
    
    let note = db::Note {
        id: None,
        content,
        screenshot_path,
        created_at: now,
        updated_at: Some(now),
        is_pinned: false,
        color: None,
        category_id,
        deleted_at: None,
    };
    
    match db::save_note(&note) {
        Ok(id) => Ok(id),
        Err(e) => Err(format!("创建便签失败: {}", e)),
    }
}

#[tauri::command]
pub fn update_note(
    id: i64, 
    content: String, 
    screenshot_path: Option<String>,
    is_pinned: bool,
    color: Option<String>,
    category_id: Option<i64>
) -> Result<bool, String> {
    let now = Utc::now().timestamp() as i64;
    
    // 先获取现有便签
    let existing_note = match db::get_note(id) {
        Ok(Some(note)) => note,
        Ok(None) => return Err("便签不存在".to_string()),
        Err(e) => return Err(format!("获取便签失败: {}", e)),
    };
    
    let note = db::Note {
        id: Some(id),
        content,
        screenshot_path,
        created_at: existing_note.created_at,
        updated_at: Some(now),
        is_pinned,
        color,
        category_id,
        deleted_at: existing_note.deleted_at,
    };
    
    match db::save_note(&note) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("更新便签失败: {}", e)),
    }
}

#[tauri::command]
pub fn get_note_by_id(id: i64) -> Result<Option<NoteResponse>, String> {
    match db::get_note(id) {
        Ok(Some(note)) => Ok(Some(NoteResponse {
            id: note.id.unwrap(),
            content: note.content,
            screenshot_path: note.screenshot_path,
            created_at: note.created_at as u64,
            updated_at: note.updated_at.map(|ts| ts as u64),
            is_pinned: note.is_pinned,
            color: note.color,
            category_id: note.category_id,
            deleted_at: note.deleted_at.map(|ts| ts as u64),
        })),
        Ok(None) => Ok(None),
        Err(e) => Err(format!("获取便签失败: {}", e)),
    }
}

#[tauri::command]
pub fn get_notes_sorted(limit: Option<i64>, offset: Option<i64>, search: Option<String>) -> Result<Vec<NoteResponse>, String> {
    let search_ref = search.as_deref();
    
    match db::get_notes_sorted(limit, offset, search_ref) {
        Ok(notes) => {
            let responses = notes.into_iter().map(|note| NoteResponse {
                id: note.id.unwrap(),
                content: note.content,
                screenshot_path: note.screenshot_path,
                created_at: note.created_at as u64,
                updated_at: note.updated_at.map(|ts| ts as u64),
                is_pinned: note.is_pinned,
                color: note.color,
                category_id: note.category_id,
            });
            Ok(responses.collect())
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn run_app() -> Result<bool, String> {
    Ok(true)
} 