fn main() {
  #[cfg(feature = "tauri-mode")]
  tauri_build::build();
}
