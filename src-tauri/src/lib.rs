use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                // 注册全局快捷键：CommandOrControl+Shift+O
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["CommandOrControl+Shift+O"])?
                        .with_handler(|app, shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyO)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyO)
                                {
                                    // 向前端发送快捷键事件
                                    let _ = app.emit("desktop-shortcut-triggered", ());

                                    // 显示并聚焦窗口
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.show();
                                        let _ = window.unminimize();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        })
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
