//! BRINK desktop shell. The game is the Vite bundle in `../dist`; this crate only
//! opens the window described in `tauri.conf.json`. No plugins, no IPC commands yet.
//! Steam integration (tauri/steamworks-stub.ts) will land here as a sidecar or a
//! `#[tauri::command]` set once the store build is scheduled.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running BRINK");
}
