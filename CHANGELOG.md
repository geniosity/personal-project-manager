# Change Log

All notable changes to the "personal-project-manager" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.6.0] - 2026-06-25

A correctness, security, and polish release. It hardens how the extension reads
untrusted project link files, fixes several data-loss bugs (window-reload
watching, link re-parenting on folder moves, vanished link targets), makes the
tree faster, refreshes the project-row UI, and adds drag-from-Explorer linking
and an optional auto-reveal of the active file.

### Added

- Drag files and folders from the OS file manager or VS Code Explorer onto a project or folder node to add them as links.

### Changed

- Redesigned project rows: the active project is now marked with a distinct indicator, nodes show hover tooltips, and a broken-root warning indicator is displayed when a project's root directory cannot be found.
- Projects are now activated by an explicit click command; the placeholder separator row has been removed.

### Fixed

- Active project's file watcher is restored on window reload (uses `globalStorageUri` for persistence).
- Nested link paths are re-based when a parent folder is renamed or moved; the tree refreshes automatically after a physical drag-and-drop move.
- The tree degrades a vanished link target to a "broken" node instead of silently dropping its siblings.

### Security

- Link paths are validated (must be absolute, non-UNC) and display names are sanitized on load; cyclic or dangling link parents are detached.
- Tree traversal is bounded with a visited-set to prevent recursion denial-of-service on pathological graphs.
- `untrustedWorkspaces` capability declared in the extension manifest.
- Atomic-write temp filenames are now randomized and opened with an exclusive-create flag to prevent race conditions.

### Performance

- Node children are resolved directly from the element path rather than rebuilding the full tree on every expansion.
- Reveal Active File uses the `getParent` ancestor chain instead of an O(n²) depth-first search.
- Debug console logging removed from hot paths.

---

Earlier releases (0.1.x) are described in the README "Release Notes" section.
