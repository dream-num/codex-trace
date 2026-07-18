## ADDED Requirements

### Requirement: Discover configured Codex homes

The system SHALL discover selectable Codex homes from each immediate child of `CODEXTRACE_CODEX_HOMES_ROOT` using the layout `<root>/<name>/home/.codex/sessions`, and SHALL return only readable session directories whose canonical paths remain within the configured root.

#### Scenario: Multiple valid mounted homes

- **WHEN** the configured root contains `discord-test/home/.codex/sessions` and `slack-test/home/.codex/sessions`
- **THEN** discovery returns homes named `discord-test` and `slack-test` in deterministic name order with their resolved sessions directories

#### Scenario: Unrelated or invalid child

- **WHEN** a root child lacks a readable `home/.codex/sessions` directory or resolves outside the configured root
- **THEN** discovery excludes that child from the selectable homes

#### Scenario: Invalid configured root

- **WHEN** `CODEXTRACE_CODEX_HOMES_ROOT` is set to a missing, unreadable, or non-directory path
- **THEN** discovery returns an actionable error and does not fall back to another sessions directory

### Requirement: Preserve single-home compatibility

The system SHALL synthesize one selectable home from the existing configured or platform-default sessions directory when `CODEXTRACE_CODEX_HOMES_ROOT` is not set.

#### Scenario: Existing single-directory deployment

- **WHEN** no multi-home root is configured and the current sessions directory resolves successfully
- **THEN** startup automatically selects the synthesized home and opens the existing session picker without an extra choice

### Requirement: Select a home before listing its sessions

The system SHALL show a home-selection view on page startup when discovery returns more than one home and SHALL defer session discovery and picker watching until the user selects a home.

#### Scenario: Startup with multiple homes

- **WHEN** home discovery returns two or more homes
- **THEN** the page lists those homes and does not display or watch any home's sessions before selection

#### Scenario: User selects a home

- **WHEN** the user activates a home using pointer or keyboard controls
- **THEN** the system opens the session picker populated only from that home's sessions directory and identifies the active home

#### Scenario: No valid homes

- **WHEN** home discovery succeeds with an empty list
- **THEN** the selector shows an actionable empty state and does not attempt session discovery

#### Scenario: Discovery fails

- **WHEN** the homes API or Tauri command returns an error
- **THEN** the selector shows the error and provides a way to retry discovery

### Requirement: Switch between homes safely

The system SHALL provide a way to return to the home selector when multiple homes are available and SHALL isolate all session-specific state between home selections.

#### Scenario: Switch from one home to another

- **WHEN** a user leaves an active home and selects a different home
- **THEN** the system stops the previous picker and session watchers, clears the loaded session and source-specific UI state, and lists only sessions from the new home

#### Scenario: Previous discovery completes late

- **WHEN** an asynchronous session-discovery response for the previous home arrives after another home has been selected
- **THEN** the system ignores that stale response and keeps the new home's state visible

### Requirement: Keep home choice browser-local

The system SHALL keep the active home in frontend state and SHALL NOT save a multi-home selection to the shared server settings.

#### Scenario: Independent browser pages

- **WHEN** two browser pages connected to the same container select different homes
- **THEN** each page retains its own active home without changing the other page's selection or the persisted single-directory setting

### Requirement: Support documented read-only Docker mounts

The project documentation SHALL provide a multi-home Docker example that configures the discovery root and mounts every Codex home read-only at the required layout, while retaining the existing single-home instructions.

#### Scenario: Operator follows multi-home example

- **WHEN** an operator mounts three host Codex directories at `/app/<name>/home/.codex` and configures `/app` as the home root
- **THEN** the startup selector offers the three mount names without requiring container restarts between selections
