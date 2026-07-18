## 1. Backend Home Discovery

- [x] 1.1 Add the shared Rust `CodexHome` model and a discovery function that reads `CODEXTRACE_CODEX_HOMES_ROOT`, validates/canonicalizes direct-child `home/.codex/sessions` paths, and returns deterministic results or the single-home fallback.
- [x] 1.2 Add Rust unit tests for multiple sorted homes, ignored invalid children, symlink escape rejection, invalid/empty roots, and configured/default single-home compatibility.
- [x] 1.3 Expose home discovery through a Tauri command and `GET /api/codex-homes`, update command registration/ACL consistency, and add HTTP/command response tests.

## 2. Shared Frontend Contract

- [x] 2.1 Add matching `CodexHome` and home-discovery response types to `shared/types.ts` and map the new command in the Tauri/web invoke adapter.
- [x] 2.2 Add a frontend home-discovery hook that represents loading, error, empty, selected-home, retry, and multi-home state without persisting the active selection.
- [x] 2.3 Guard picker discovery with a request generation or equivalent stale-result check, and expose reset/unwatch operations needed for an atomic home switch.
- [x] 2.4 Add hook and invoke-adapter tests covering single-home auto-selection, multiple-home deferral, error/retry, and stale discovery responses.

## 3. Home Selection Experience

- [x] 3.1 Add a `homes` application view and a home-selector component with deterministic list rendering, keyboard/pointer selection, loading, actionable empty/error, and retry states.
- [x] 3.2 Connect startup so multiple homes open the selector, one home enters the existing picker automatically, and no sessions are discovered or watched before a multi-home selection.
- [x] 3.3 Show the active home and a switch-home action in navigation when multiple homes exist; keep the single-directory Settings behavior available only where it accurately applies.
- [x] 3.4 Implement the switch lifecycle to stop both watchers and clear the loaded session, picker/search, indexes, collapsed dates, expanded tools, and worker panel before discovering the new home.
- [x] 3.5 Add component and application tests for keyboard/pointer selection, active-home labeling, zero/error states, switching cleanup, browser-local selection, and isolation from late previous-home responses.

## 4. Container Configuration and Documentation

- [x] 4.1 Update Dockerfile comments and README configuration tables with `CODEXTRACE_CODEX_HOMES_ROOT` and the `/app/<name>/home/.codex` read-only mount convention while retaining the current single-home example.
- [x] 4.2 Add a Docker Compose multi-home example or documented override that mounts `discord-test`, `slack-test`, and `slide-test` independently without replacing the backward-compatible default Compose setup.

## 5. Verification

- [ ] 5.1 Run frontend formatting, lint, type checking, and tests, including `npx oxfmt`, `npx oxlint`, `npx tsc --noEmit`, and `npx vitest run`.
- [ ] 5.2 Run Rust formatting, lint, and tests with `cargo fmt --manifest-path src-tauri/Cargo.toml`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`, and `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] 5.3 Build or run the Docker multi-home configuration and verify the three mounted names appear, switching changes the session inventory, and the legacy single-home startup still auto-selects.
