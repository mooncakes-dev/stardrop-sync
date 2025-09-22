// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod game_files;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, game_files::set_save_file_path, game_files::check_for_default_saves_folder, game_files::list_all_save_folders, game_files::check_for_updates])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
