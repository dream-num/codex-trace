## Why

Codex Trace currently assumes one sessions directory, so a container that mounts several isolated Codex homes cannot expose them without restarting or manually editing Settings. Operators need an entry screen that identifies the mounted homes and lets each browser choose which workspace's sessions to inspect.

## What Changes

- Add backend discovery of named Codex homes beneath a configurable container root, while retaining the existing single sessions-directory fallback.
- Add an API/Tauri contract that returns selectable homes as stable names and resolved sessions directories, excluding invalid or unreadable mounts.
- Add an initial home-selection view when multiple homes are available, followed by the existing session picker for the selected home.
- Add a visible way to return to the home list and switch sources without restarting the container.
- Reset source-specific session, watcher, search, and navigation state when switching homes so data from different homes is never mixed.
- Document the multi-home Docker mount layout and configuration, including the existing one-home layout for backward compatibility.

## Capabilities

### New Capabilities

- `codex-home-selection`: Discovery, presentation, selection, and switching of multiple mounted Codex homes.

### Modified Capabilities

None.

## Impact

- Backend settings and commands, the axum HTTP API, shared Rust/TypeScript response types, and picker watcher lifecycle.
- Frontend application view state, startup resolution, navigation controls, and a new Codex-home selector component.
- Docker/Compose mount conventions, environment-variable documentation, and automated Rust/frontend tests.
- Existing desktop, web, and single-home Docker behavior remains supported; no breaking API removal is intended.
