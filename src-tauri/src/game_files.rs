use crate::game_files;
use chrono::prelude::*;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;

#[derive(Serialize, Clone)]
struct LogMessage {
    level: String,
    message: String,
}

#[tauri::command]
pub fn set_save_file_path(save_path: &str) -> String {
    format!("Okay, the file path is: {}", save_path)
}

#[tauri::command]
pub fn check_for_default_saves_folder() -> String {
    get_saves_data_dir()
}

#[tauri::command]
pub fn list_all_save_folders() -> Result<Vec<String>, String> {
    let os_path = get_os_save_string();
    let user_folders = get_all_save_folders(os_path).map_err(|err| err.to_string())?;
    Ok(user_folders)
}

#[tauri::command]
pub fn check_for_updates(selected_save_file: &str) -> Result<String, String> {
    // Figure out how to pass it in from the client side pls
    let modified_time =
        check_for_latest_update_time(selected_save_file).map_err(|err| err.to_string())?;
    let time_string = convert_date_to_string(modified_time);
    Ok(time_string)
}

#[tauri::command]
pub fn start_watching(app: tauri::AppHandle, path: &str) {
    // let modified_time = check_for_latest_update_time(path).map_err(|err| err.to_string())?;
    // let time_string = convert_date_to_string(modified_time);
    let message = format!("Watching directory {}", path);
    emit_log_message(app, message);
    // Ok(time_string)
}

/* Util Functions */

fn emit_log_message(app: tauri::AppHandle, message: String) {
    let _ = app.emit(
        "log",
        LogMessage {
            level: "info".into(),
            message: message.clone(),
        },
    );
}
fn get_saves_data_dir() -> String {
    let os_path = get_os_save_string();
    convert_path_to_string(os_path)
}

fn get_os_save_string() -> PathBuf {
    let os_save_path = dirs::data_dir()
        .unwrap_or_else(|| std::env::current_dir().expect("error while getting current directory"));
    os_save_path.join("StardewValley").join("Saves")
}

fn get_all_save_folders(os_path: PathBuf) -> Result<Vec<String>, String> {
    let mut available_save_folder_arr = Vec::<String>::new();
    if os_path.is_dir() {
        let available_save_folders = fs::read_dir(os_path).map_err(|err| err.to_string())?;
        for folder in available_save_folders {
            let folders_map = folder.map_err(|err| err.to_string())?;
            available_save_folder_arr.push(convert_path_to_string(folders_map.path()));
        }
    }
    if available_save_folder_arr.is_empty() {
        return Err("No save folders found".parse().unwrap());
    }
    Ok(available_save_folder_arr)
}

fn check_for_latest_update_time(active_save_folder: &str) -> Result<DateTime<Utc>, String> {
    let metadata = fs::metadata(&active_save_folder).map_err(|err| err.to_string())?;
    let modified_time = metadata.modified().map_err(|err| err.to_string())?;

    let converted_date: DateTime<Utc> = modified_time.into();

    Ok(converted_date)
}

fn convert_path_to_string(os_path: PathBuf) -> String {
    os_path.to_string_lossy().to_string()
}

fn convert_date_to_string(date: DateTime<Utc>) -> String {
    date.to_string()
}
