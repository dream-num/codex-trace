## Context

The application currently resolves one `sessions_dir` from persisted settings or `~/.codex/sessions`, immediately discovers sessions on mount, and maintains one picker watcher and one loaded-session watcher. In Docker, Compose mounts a single host sessions directory at `/home/app/.codex/sessions`.

The target deployment instead mounts several independent project homes, for example `/app/discord-test/home/.codex`, `/app/slack-test/home/.codex`, and `/app/slide-test/home/.codex`. The browser must select one source before the existing session picker starts, and switching sources must not leak watcher or UI state from the previous source.

## Goals / Non-Goals

**Goals:**

- Discover named, valid Codex homes from a container-visible root configured by the operator.
- Present a startup selector when more than one home is found and allow later switching.
- Reuse the current single-directory discovery/parser pipeline after a home is selected.
- Keep desktop, web, and existing one-home Docker deployments backward compatible.
- Define deterministic validation, ordering, lifecycle cleanup, empty, and error behavior that can be tested.

**Non-Goals:**

- Combining sessions from multiple homes into one picker or search result.
- Editing Codex home contents, credentials, or configuration.
- Letting a remote browser browse arbitrary server filesystem paths.
- Recursively finding `.codex` directories at unbounded depth or dynamically reacting to mount additions after startup.
- Adding authentication or per-user server-side source selection.

## Decisions

### Use an explicit multi-home root and a fixed layout

Add `CODEXTRACE_CODEX_HOMES_ROOT`. When set, each immediate child directory is a candidate whose Codex home is `<root>/<name>/home/.codex` and whose session directory is `<root>/<name>/home/.codex/sessions`. The child basename is both the stable source ID and default display name. Candidates are canonicalized, required to remain below the canonical root, and included only when the sessions path is a readable directory. Results are sorted by display name, then ID.

This matches the proposed `/app/<project>/home/.codex` mounts, avoids an unbounded recursive scan, and ignores unrelated entries such as `/app/dist`. A JSON list or repeated environment variables would support arbitrary layouts and custom labels, but would make common Docker configuration more verbose and error-prone.

### Make discovery a backend-owned contract

Introduce a shared `CodexHome` response containing `id`, `name`, and `sessions_dir`, exposed through both a Tauri command and `GET /api/codex-homes`. The backend constructs and validates paths; the frontend does not infer mount layout. The existing settings response and sessions APIs remain intact.

When `CODEXTRACE_CODEX_HOMES_ROOT` is absent, the response contains one synthesized home derived from the existing configured/default sessions directory, preserving the current startup path. When the variable is present, it is authoritative: an invalid root is returned as a discovery error and a valid root with no candidates returns an empty list rather than silently reading another home.

### Keep active-home selection in frontend state

The active home is browser-local state and is not written to the server settings file. On initial load, multiple homes show a dedicated selector; one home is selected automatically; zero homes show an actionable empty/error state. This guarantees that opening a new page with multiple mounts asks for a choice and avoids one browser changing the source seen by another browser connected to the same container.

Persisting the last selection was rejected because it conflicts with the explicit startup-choice requirement and is surprising for shared web deployments.

### Add a home-selection state ahead of the existing three views

Extend the frontend state machine with a `homes` view. Selecting a home hands its validated `sessions_dir` to the existing picker flow. The toolbar displays the active home while viewing sessions and exposes a switch action whenever multiple homes exist. The selector supports pointer interaction, keyboard navigation, loading, empty, and error states.

The existing Settings directory editor remains available in single-home mode. In authoritative multi-home mode, source switching uses the home selector and does not overwrite `sessions_dir`; the UI must not imply that editing the single-directory setting changes the configured home inventory.

### Treat a home switch as a lifecycle boundary

Before discovering the newly selected home, the frontend stops both picker and session watchers, clears the loaded session, session list, search query, selection indexes, collapsed groups, tool expansion, and worker panel, and returns to the session picker. Async discovery results are associated with the selected home (or request generation) so a late result from the previous home cannot replace the current list.

This is more explicit than attempting to preserve per-home navigation state and prevents cross-home data mixing with the existing singleton watcher model.

### Document mounts without changing read-only semantics

Docker examples will set `CODEXTRACE_CODEX_HOMES_ROOT=/app` and mount each host Codex directory read-only at `/app/<name>/home/.codex`. The existing `/home/app/.codex/sessions` volume and Compose variable remain documented and functional for single-home deployments.

## Risks / Trade-offs

- [A mount does not match the fixed layout] → Omit it from the list and document the required target path; show an empty state when none qualify.
- [A source disappears after discovery] → Surface the existing session discovery error and allow returning to refresh the home list.
- [Symlinks escape the configured root] → Canonicalize the root and candidates and reject candidates whose canonical path is outside the root.
- [Late asynchronous responses show sessions from the old home] → Use request generations/cancellation checks and clear state before starting new discovery.
- [Large numbers of direct children add startup I/O] → Inspect only the fixed `home/.codex/sessions` path per immediate child and do not parse sessions until selection.
- [Shared settings and multi-home configuration confuse operators] → Make the environment-configured root authoritative and keep it separate from persisted `sessions_dir`.

## Migration Plan

1. Add the optional discovery contract and frontend state without changing the existing sessions endpoints.
2. Deploy existing configurations unchanged; with no new environment variable they synthesize and auto-select the current single home.
3. For multi-home Docker deployments, add the environment variable and read-only mounts using the documented layout, then recreate the container.
4. Roll back by removing `CODEXTRACE_CODEX_HOMES_ROOT` and restoring the existing single sessions mount; persisted settings remain compatible.

## Open Questions

None. Custom labels, arbitrary path maps, and live mount refresh can be proposed later if the fixed project-directory layout proves insufficient.
