use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde::Serialize;
use tauri::State;

use crate::settings::Settings;
use crate::state::AppState;

pub const CODEX_HOMES_ROOT_ENV: &str = "CODEXTRACE_CODEX_HOMES_ROOT";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CodexHome {
    pub id: String,
    pub name: String,
    pub sessions_dir: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CodexHomesResponse {
    pub homes: Vec<CodexHome>,
    pub multi_home_enabled: bool,
}

fn single_home(settings: &Settings) -> CodexHomesResponse {
    let sessions_dir = settings
        .sessions_dir
        .clone()
        .unwrap_or_else(crate::commands::settings::platform_default_dir);
    CodexHomesResponse {
        homes: vec![CodexHome {
            id: "default".to_string(),
            name: "Default".to_string(),
            sessions_dir,
        }],
        multi_home_enabled: false,
    }
}

pub fn discover_codex_homes_from_root(
    settings: &Settings,
    root: Option<&Path>,
) -> Result<CodexHomesResponse, String> {
    let Some(root) = root else {
        return Ok(single_home(settings));
    };

    let canonical_root = root
        .canonicalize()
        .map_err(|e| format!("invalid Codex homes root {}: {e}", root.display()))?;
    if !canonical_root.is_dir() {
        return Err(format!(
            "invalid Codex homes root {}: path is not a directory",
            root.display()
        ));
    }

    let entries = fs::read_dir(&canonical_root).map_err(|e| {
        format!(
            "cannot read Codex homes root {}: {e}",
            canonical_root.display()
        )
    })?;
    let mut homes = Vec::new();

    for entry in entries {
        let Ok(entry) = entry else { continue };
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        let sessions_path = entry.path().join("home").join(".codex").join("sessions");
        let Ok(canonical_sessions) = sessions_path.canonicalize() else {
            continue;
        };
        if !canonical_sessions.starts_with(&canonical_root) || !canonical_sessions.is_dir() {
            continue;
        }
        if fs::read_dir(&canonical_sessions).is_err() {
            continue;
        }

        homes.push(CodexHome {
            id: name.clone(),
            name,
            sessions_dir: canonical_sessions.to_string_lossy().into_owned(),
        });
    }

    homes.sort_by(|a, b| a.name.cmp(&b.name).then_with(|| a.id.cmp(&b.id)));
    Ok(CodexHomesResponse {
        homes,
        multi_home_enabled: true,
    })
}

pub fn discover_codex_homes(settings: &Settings) -> Result<CodexHomesResponse, String> {
    let root = std::env::var_os(CODEX_HOMES_ROOT_ENV).map(PathBuf::from);
    discover_codex_homes_from_root(settings, root.as_deref())
}

#[tauri::command]
pub async fn list_codex_homes(
    state: State<'_, Arc<AppState>>,
) -> Result<CodexHomesResponse, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    discover_codex_homes(&settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn add_home(root: &Path, name: &str) -> PathBuf {
        let sessions = root.join(name).join("home").join(".codex").join("sessions");
        fs::create_dir_all(&sessions).unwrap();
        sessions
    }

    #[test]
    fn discovers_valid_homes_in_name_order_and_ignores_invalid_children() {
        let root = tempfile::tempdir().unwrap();
        let slack = add_home(root.path(), "slack-test");
        let discord = add_home(root.path(), "discord-test");
        fs::create_dir(root.path().join("dist")).unwrap();
        fs::create_dir_all(root.path().join("broken").join("home").join(".codex")).unwrap();

        let response =
            discover_codex_homes_from_root(&Settings::default(), Some(root.path())).unwrap();

        assert!(response.multi_home_enabled);
        assert_eq!(
            response.homes,
            vec![
                CodexHome {
                    id: "discord-test".to_string(),
                    name: "discord-test".to_string(),
                    sessions_dir: discord
                        .canonicalize()
                        .unwrap()
                        .to_string_lossy()
                        .into_owned(),
                },
                CodexHome {
                    id: "slack-test".to_string(),
                    name: "slack-test".to_string(),
                    sessions_dir: slack.canonicalize().unwrap().to_string_lossy().into_owned(),
                },
            ]
        );
    }

    #[test]
    fn valid_empty_root_returns_no_multi_homes() {
        let root = tempfile::tempdir().unwrap();
        let response =
            discover_codex_homes_from_root(&Settings::default(), Some(root.path())).unwrap();

        assert!(response.multi_home_enabled);
        assert!(response.homes.is_empty());
    }

    #[test]
    fn invalid_roots_return_actionable_errors() {
        let root = tempfile::tempdir().unwrap();
        let missing = root.path().join("missing");
        let file = root.path().join("file");
        fs::write(&file, "not a directory").unwrap();

        let missing_error =
            discover_codex_homes_from_root(&Settings::default(), Some(&missing)).unwrap_err();
        let file_error =
            discover_codex_homes_from_root(&Settings::default(), Some(&file)).unwrap_err();

        assert!(missing_error.contains("invalid Codex homes root"));
        assert!(file_error.contains("path is not a directory"));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_home_whose_sessions_symlink_escapes_root() {
        use std::os::unix::fs::symlink;

        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let codex_dir = root.path().join("escaped").join("home").join(".codex");
        fs::create_dir_all(&codex_dir).unwrap();
        symlink(outside.path(), codex_dir.join("sessions")).unwrap();

        let response =
            discover_codex_homes_from_root(&Settings::default(), Some(root.path())).unwrap();

        assert!(response.homes.is_empty());
    }

    #[test]
    fn no_root_synthesizes_configured_single_home() {
        let settings = Settings {
            sessions_dir: Some("/mounted/sessions".to_string()),
        };
        let response = discover_codex_homes_from_root(&settings, None).unwrap();

        assert!(!response.multi_home_enabled);
        assert_eq!(response.homes.len(), 1);
        assert_eq!(response.homes[0].id, "default");
        assert_eq!(response.homes[0].sessions_dir, "/mounted/sessions");
    }

    #[test]
    fn no_root_synthesizes_platform_default_single_home() {
        let response = discover_codex_homes_from_root(&Settings::default(), None).unwrap();

        assert!(!response.multi_home_enabled);
        assert_eq!(response.homes.len(), 1);
        assert_eq!(
            response.homes[0].sessions_dir,
            crate::commands::settings::platform_default_dir()
        );
    }
}
