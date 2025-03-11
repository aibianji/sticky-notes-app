use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use crate::commands::{DatabaseState, ReminderResponse};

pub fn start_reminder_service(app: AppHandle, db: DatabaseState) {
    // 创建一个互斥锁来控制服务状态
    let running = std::sync::Arc::new(Mutex::new(true));
    let running_clone = running.clone();

    // 启动检查线程
    std::thread::spawn(move || {
        while *running_clone.lock().unwrap() {
            // 检查待触发的提醒
            if let Ok(reminders) = db.0.lock().unwrap().get_pending_reminders() {
                for (reminder, content) in reminders {
                    // 发送提醒事件到前端
                    let _ = app.emit_all("reminder", ReminderResponse {
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
                    });
                }
            }

            // 每分钟检查一次
            std::thread::sleep(Duration::from_secs(60));
        }
    });

    // 在应用退出时停止服务
    app.listen_global("tauri://close-requested", move |_| {
        *running.lock().unwrap() = false;
    });
} 