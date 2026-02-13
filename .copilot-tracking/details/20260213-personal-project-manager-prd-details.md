<!-- markdownlint-disable-file -->

# Task Details: Personal Project Manager PRD Implementation

## Research Reference

**Source Research**: #file:../research/20260213-personal-project-manager-prd-research.md

## Phase 1: Shell + View Contribution

### Task 1.1: Update package.json with view container and view contributions

Add the view container explorer and project viewer view contribution to package.json. This establishes the UI structure for the project manager.

- **Files**:
  - package.json - Add contributes.viewsContainers and contributes.views sections
  - package.json - Add contributes.menus.view/title and contributes.menus.view/item/context sections
  
- **Success**:
  - viewsContainers contains explorer with projectViewer view
  - View titled "Personal Project Manager" with id "projectViewer"
  - Menu items for refresh, create project, add link, remove item under view/title
  - Context menus for rename, delete, copy path, open folder under view/item/context
  - All menu items have appropriate 'when' and 'viewItem' conditions
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 89-112) - Configuration examples showing view/menus structure
  - #fetch:https://code.visualstudio.com/api/extension-guides/tree-view - Official tree view contribution schema

- **Dependencies**:
  - None (foundational)

### Task 1.2: Update activation event to onView:projectViewer

Update package.json activationEvents to use onView:projectViewer instead of onCommand. This ensures the extension activates only when the view is first accessed.

- **Files**:
  - package.json - Replace activationEvents with ["onView:projectViewer"]
  
- **Success**:
  - activationEvents array contains only "onView:projectViewer"
  - No legacy onCommand events remain
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 1-15) - Project structure analysis showing current implementation

- **Dependencies**:
  - Task 1.1 completion

### Task 1.3: Implement TreeDataProvider class structure

Create the core TreeDataProvider implementation that manages the tree structure and item retrieval.

- **Files**:
  - src/extension.ts - Add ProjectTreeProvider class implementing TreeDataProvider<ProjectNode>
  - src/extension.ts - Implement getChildren(), getTreeItem(), refresh() methods
  - src/extension.ts - Create ProjectNode class for tree items with proper context values
  
- **Success**:
  - ProjectTreeProvider implements vscode.TreeDataProvider<ProjectNode>
  - onDidChangeTreeData event emitter is functional
  - refresh() method updates tree via event emission
  - getTreeItem() returns valid TreeItem with appropriate context values
  - getChildren() returns promises resolving to node arrays
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 61-72) - Complete TreeDataProvider code example
  - #fetch:https://code.visualstudio.com/api/extension-guides/tree-view - TreeDataProvider interface requirements

- **Dependencies**:
  - Task 1.1 and 1.2 completion

### Task 1.4: Add viewsWelcome content for empty state

Configure viewsWelcome contribution to provide helpful guidance when the project view is empty.

- **Files**:
  - package.json - Add contributes.viewsWelcome entries for projectViewer view
  
- **Success**:
  - Welcome view displays when no projects are open
  - Content includes helpful guidance on creating first project
  - Links reference commands for creating and opening projects
  - Welcome follows VS Code UX guidelines for views
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 80-87) - viewsWelcome configuration guidance
  - #fetch:https://code.visualstudio.com/api/ux-guidelines/views - UX guidelines for views (Lines mentioning welcome views)

- **Dependencies**:
  - Task 1.1, 1.2, 1.3 completion

### Task 1.5: Register basic commands and tree provider

In extension.ts activate function, register all commands referenced in package.json and register the TreeDataProvider.

- **Files**:
  - src/extension.ts - Register projectviewer.createNewProject command
  - src/extension.ts - Register projectviewer.openProject command
  - src/extension.ts - Register projectviewer.closeProject command
  - src/extension.ts - Register projectviewer.refreshEntry command
  - src/extension.ts - Create and register TreeDataProvider instance
  - src/extension.ts - Subscribe to tree view visibility changes
  
- **Success**:
  - All commands are registered and invoke placeholder handlers
  - TreeDataProvider is registered for projectViewer view
  - Commands properly bind 'this' context
  - Tree view is accessible via vscode.window.createTreeView()
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 61-87) - Implementation patterns for provider and commands

- **Dependencies**:
  - Phase 1 Tasks 1.1-1.4 completion, but most dependencies from 1.3-1.4

## Phase 2: Storage Layer (Projects + Links)

### Task 2.1: Implement projects.json global storage with atomic writes

Create storage module for global projects.json in VS Code global storage directory. Includes atomic write operations and data validation.

- **Files**:
  - src/storage.ts (new) - Export ProjectsStorage class
  - src/storage.ts - Implement getProjects() method
  - src/storage.ts - Implement addProject() method
  - src/storage.ts - Implement removeProject() method
  - src/storage.ts - Implement updateProject() method
  - src/storage.ts - Implement atomic write with temp file + rename pattern
  
- **Success**:
  - getProjects() returns parsed projects.json content, or empty array if missing
  - addProject() validates project name, path, and uniqueness before adding
  - removeProject() removes project by name
  - updateProject() updates project metadata
  - All write operations use atomic pattern (write to .tmp, then rename)
  - File encoding errors are caught and reported
  - Projects persist across extension sessions
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 37-45) - PRD data model requirements
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 113-120) - Storage guidance with atomic writes

- **Dependencies**:
  - None (foundational for Phase 2)

### Task 2.2: Implement .project-explorer-links.json per-project storage

Create storage module for per-project .project-explorer-links.json files in project roots. Handles manual external links, directory links, and missing link tracking.

- **Files**:
  - src/linksStorage.ts (new) - Export LinksStorage class
  - src/linksStorage.ts - Implement getLinks() method for project path
  - src/linksStorage.ts - Implement addLink() method with validation
  - src/linksStorage.ts - Implement removeLink() method
  - src/linksStorage.ts - Implement atomic write operations
  - src/linksStorage.ts - Validate paths and handle broken links
  
- **Success**:
  - getLinks() reads .project-explorer-links.json from project root, returns empty object if missing
  - addLink() validates external paths exist and adds to links by ID
  - removeLink() removes link by ID
  - updateLinkMetadata() updates name, description without changing path
  - Atomic writes use temp file + rename pattern
  - Broken/missing links are tracked and flagged in data structure
  - All write operations preserve existing links on error
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 37-50) - Link storage data model

- **Dependencies**:
  - Task 2.1 completion

### Task 2.3: Implement workspace state for activeProjectName and recent projects

Configure extension state storage for active project and recent projects list in VS Code workspace state.

- **Files**:
  - src/stateManager.ts (new) - Export StateManager class using context.workspaceState
  - src/stateManager.ts - Implement getActiveProjectName() method
  - src/stateManager.ts - Implement setActiveProjectName() method
  - src/stateManager.ts - Implement getRecentProjects() method
  - src/stateManager.ts - Implement addRecentProject() method
  
- **Success**:
  - activeProjectName persists in workspaceState
  - Recent projects list maintains up to 10 most recent projects
  - Duplicate entries are removed when adding recent project
  - State survives extension deactivation/reactivation
  - Updates trigger onDidChangeActiveProject event
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 37-50) - State management requirements in PRD

- **Dependencies**:
  - Task 2.1 and 2.2 completion

## Phase 3: Tree Model + Sorting

### Task 3.1: Build tree model that merges physical items and manual links

Create tree model class that combines physical filesystem items with manual link entries from storage, creating unified item hierarchy.

- **Files**:
  - src/treeModel.ts (new) - Export TreeModel class
  - src/treeModel.ts - Implement createModelsForProject() method
  - src/treeModel.ts - Create ProjectNodeModel class for root projects
  - src/treeModel.ts - Create FileNodeModel class for physical filesystem items
  - src/treeModel.ts - Create LinkNodeModel class for manual link items
  - src/treeModel.ts - Implement getChildren() for each model type
  
- **Success**:
  - TreeModel merges fs.readdirSync results with links from storage
  - Project node returns physical dirs + physical files + link dirs + link files + broken items as children
  - Physical items are scanned from active project root directory
  - Manual links are merged from .project-explorer-links.json
  - Each item has unique identifier for tracking
  - Models support efficient caching to avoid repeated fs scans
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 37-60) - Complete data model specification
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 126-135) - Tree model building guidance

- **Dependencies**:
  - Phase 2 completion (storage layer), Phase 1.3 completion (ProjectNode foundation)

### Task 3.2: Implement sorting hierarchy with context values

Implement correct sorting order: physical dirs, manual dirs, physical files, manual files, broken items. Assign context values for each type.

- **Files**:
  - src/treeModel.ts - Add compareFn to sort items appropriately
  - src/treeModel.ts - Assign contextValue to each NodeModel based on type
  - src/treeModel.ts - Create sortItems() utility function
  
- **Success**:
  - getChildren() returns items in sort order: dirs first (physical then manual), files next (physical then manual), broken last
  - broken/missing/external item context values differ clearly for menu visibility
  - Physical directories have contextValue "physicalDir"
  - Physical files have contextValue "physicalFile"
  - Manual directories have contextValue "manualDir"
  - Manual files have contextValue "manualFile"
  - Broken links have contextValue "brokenLink"
  - Context values are used in package.json menus with when clauses
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 94-99) - Context menu structure with viewItem conditions
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 37-60) - Sorting hierarchy specification

- **Dependencies**:
  - Task 3.1 completion

### Task 3.3: Add broken/missing item tracking and display

Implement tracking and display of broken links (items with deleted external paths).

- **Files**:
  - src/treeModel.ts - Add validation of link paths in getChildren()
  - src/treeModel.ts - Create BrokenLinkNodeModel for invalid links
  - src/treeModel.ts - Store broken count or flag in tree model
  - src/extension.ts - Display broken item count in tree view title if > 0
  
- **Success**:
  - getChildren() validates each manual link path exists
  - Invalid paths are replaced with BrokenLinkNodeModel entries
  - Broken items sort to end and have distinct context value
  - Icons/labels clearly indicate broken status
  - Broken item count appears in view title as "(N broken)"
  - User can remove broken links via context menu
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 37-60) - Broken item tracking in specification

- **Dependencies**:
  - Task 3.1 and 3.2 completion

## Phase 4: File Operations

### Task 4.1: Implement create directory command for physical items

Create command to create new child directories in selected physical item or project root.

- **Files**:
  - src/extension.ts - Add projectviewer.createDirectory command handler
  - src/extension.ts - Invoke quick input to get directory name
  - src/extension.ts - Call fs.mkdirSync to create on disk
  - src/extension.ts - Update tree via provider.refresh()
  
- **Success**:
  - Command is accessible from view/title and physical item context menus
  - Quick input prompts user for directory name with validation (no empty, no illegal chars)
  - Directory is created as child of selected item or project root
  - Tree refreshes automatically after creation
  - Errors display in error message dialog
  - Newly created directory is positioned correctly in sort order
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 20-35) - Create command specification
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 50-60) - File operation guidance

- **Dependencies**:
  - Phase 1 & 3 completion (commands, tree model)

### Task 4.2: Implement rename and delete for physical items

Implement rename and delete commands for physical directories and files.

- **Files**:
  - src/extension.ts - Add projectviewer.renameItem command handler
  - src/extension.ts - Add projectviewer.deleteItem command handler
  - src/extension.ts - Use fs.renameSync for rename operations
  - src/extension.ts - Use fs.rmSync with recursive flag for delete
  - src/extension.ts - Confirmation dialog for destructive delete
  
- **Success**:
  - Rename command prompts for new name, updates on disk, refreshes tree
  - Delete command requires confirmation, removes from disk, refreshes tree
  - Both commands only work for physical items (check context value)
  - Errors are caught and displayed in message dialog
  - Tree automatically re-sorts after rename
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 20-35) - Rename/delete specification

- **Dependencies**:
  - Task 4.1 completion

### Task 4.3: Implement add/remove external links command

Implement commands to add external project paths and remove manual links.

- **Files**:
  - src/extension.ts - Add projectviewer.addExternalLink command handler
  - src/extension.ts - Add projectviewer.removeLink command handler
  - src/extension.ts - Use vscode.window.showOpenDialog to select path
  - src/extension.ts - Validate path exists before adding
  - src/extension.ts - Update links storage, refresh tree
  
- **Success**:
  - addExternalLink opens file picker (folders only) with validation
  - New link added to .project-explorer-links.json with unique ID
  - removeLink command works on both manual links and broken items
  - Removes entry from .project-explorer-links.json
  - Tree refreshes with new sort order
  - Errors display appropriate messages
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 20-35) - External link management specification

- **Dependencies**:
  - Phase 2 completion (links storage), Task 4.1 completion

### Task 4.4: Implement copy path and open folder commands

Implement utility commands for copying item paths and opening containing folder.

- **Files**:
  - src/extension.ts - Add projectviewer.copyPath command handler
  - src/extension.ts - Add projectviewer.copyRelativePath command handler
  - src/extension.ts - Add projectviewer.openContainingFolder command handler
  - src/extension.ts - Use vscode.env.clipboard.writeText for copying
  - src/extension.ts - Use vscode.commands.executeCommand('revealFileInOS') for folder
  
- **Success**:
  - copyPath copies absolute path to clipboard, shows confirmation
  - copyRelativePath copies path relative to project root
  - openContainingFolder opens explorer window at parent folder
  - All commands work for both physical and manual items
  - User sees confirmation/feedback for each action
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 20-35) - Utility command specification

- **Dependencies**:
  - Phase 3 completion (tree model with full items)

## Phase 5: Watchers + Refresh

### Task 5.1: Implement FileSystemWatcher with debouncing

Implement FileSystemWatcher for active project directory with debouncing to prevent excessive tree updates.

- **Files**:
  - src/watcher.ts (new) - Export FileWatcher class
  - src/watcher.ts - Implement createWatcher() method
  - src/watcher.ts - Implement debounce logic (250ms delay)
  - src/watcher.ts - Subscribe to watcher change/create/delete events
  - src/watcher.ts - Implement dispose() for cleanup
  
- **Success**:
  - FileWatcher creates vscode.workspace.createFileSystemWatcher for project root
  - Watcher ignores .project-explorer-links.json changes (self-triggered)
  - Rapid filesystem changes within debounce window coalesce into single update
  - Refresh is debounced at 250ms (tunable)
  - dispose() properly releases watcher resources
  - Callback provided on construction receives refresh signal
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 51-60) - FileSystemWatcher pattern and debouncing
  - #fetch:https://code.visualstudio.com/api/extension-guides/tree-view - FileSystemWatcher integration guidance

- **Dependencies**:
  - Phase 1 & 3 completion

### Task 5.2: Manage watcher lifecycle (create on open, dispose on close)

Manage watcher creation and cleanup tied to project activation state.

- **Files**:
  - src/extension.ts - Add logic to create watcher on openProject command
  - src/extension.ts - Add logic to dispose watcher on closeProject command
  - src/stateManager.ts - Track active watcher instance
  - src/extension.ts - Dispose watcher on extension deactivate
  
- **Success**:
  - Watcher is created when project is opened (setActiveProjectName)
  - Watcher is disposed when project is closed or changed
  - Only one watcher active at a time
  - getDeactivate() hook properly disposes on extension shutdown
  - Watcher lifecycle logged for debugging
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 51-60) - Watcher lifecycle guidance

- **Dependencies**:
  - Task 5.1 completion, Phase 2 completion

### Task 5.3: Implement manual refresh command and tree updates

Add manual refresh command and ensure watcher triggers tree updates via provider.refresh().

- **Files**:
  - src/extension.ts - Implement projectviewer.refreshEntry command
  - src/extension.ts - Connect watcher callbacks to provider.refresh()
  - src/extension.ts - Re-scan tree state after refresh
  
- **Success**:
  - refreshEntry command manually triggers tree refresh
  - Watcher change/create/delete events trigger provider.refresh()
  - Tree updates within 250ms of filesystem change
  - Refresh preserves tree expansion state where possible
  - No errors on refresh if project path becomes invalid
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 20-35, 51-60) - Refresh command and watcher integration

- **Dependencies**:
  - Task 5.1 and 5.2 completion, Task 4.1 completion (for watcher feedback)

## Phase 6: Drag and Drop

### Task 6.1: Implement TreeDragAndDropController for physical items

Implement drag-and-drop controller to move physical filesystem items.

- **Files**:
  - src/dragDropController.ts (new) - Export TreeDragDropController class
  - src/dragDropController.ts - Implement handleDrag() method
  - src/dragDropController.ts - Set dragMimeTypes to "application/vnd.code.tree-projectviewer"
  - src/dragDropController.ts - Serialize dragged physical items to JSON payload
  - src/extension.ts - Create controller and register with tree view
  
- **Success**:
  - handleDrag() is called for items being dragged
  - Physical items (files and directories) provide drag payload with path
  - Mime type correctly identifies drag source as projectViewer
  - Dragged item data includes type (physicalFile/physicalDir) and full path
  - Multiple items can be dragged simultaneously
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 61-72) - TreeDragAndDropController patterns from samples
  - #fetch:https://code.visualstudio.com/api/extension-guides/tree-view - Drag and drop API documentation

- **Dependencies**:
  - Phase 3 completion (tree model with item types)

### Task 6.2: Implement drag/drop for manual items (re-parent in config)

Extend drag-drop controller to handle manual items (re-parenting in link config).

- **Files**:
  - src/dragDropController.ts - Implement handleDrop() method
  - src/dragDropController.ts - Set dropMimeTypes to match dragMimeTypes + internal types
  - src/dragDropController.ts - Handle physical-to-physical moves (fs operations)
  - src/dragDropController.ts - Handle manual-to-manual re-parenting (config updates)
  - src/dragDropController.ts - Prevent invalid drop scenarios (e.g., file as parent)
  
- **Success**:
  - handleDrop() processes dragged items over drop targets
  - Physical items can be moved to physical directories via fs.renameSync
  - Manual links can be re-parented within link hierarchy
  - Drop is rejected (error feedback) for invalid targets
  - Tree updates automatically after successful drop
  - Dropping on items with type "manualFile" is rejected
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 61-72) - Drag and drop patterns

- **Dependencies**:
  - Task 6.1 completion, Phase 4 completion (file operations foundation)

### Task 6.3: Validate drop targets and handle error states

Add comprehensive validation and error handling for drag-drop operations.

- **Files**:
  - src/dragDropController.ts - Add validateDropTarget() method
  - src/dragDropController.ts - Add appropriate error messages for invalid drops
  - src/dragDropController.ts - Rollback on operation failure
  
- **Success**:
  - Drop to file item is rejected (files cannot be containers)
  - Drop of physical item outside project is rejected
  - Drop of manual item with circular reference is rejected
  - File operation errors are caught and user is notified
  - Failed operations don't partially update storage or filesystem
  - All validations are logged for debugging
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 51-60) - Drag and drop guidance

- **Dependencies**:
  - Task 6.1 and 6.2 completion

## Phase 7: Tests + UX Polish

### Task 7.1: Add unit tests for storage and path validation

Create unit tests for storage layer and path validation functions.

- **Files**:
  - src/test/storage.test.ts (new) - Test ProjectsStorage class
  - src/test/linksStorage.test.ts (new) - Test LinksStorage class
  - src/test/treeModel.test.ts (new) - Test TreeModel sorting and context values
  - src/test/validation.test.ts (new) - Test path and name validation
  
- **Success**:
  - ProjectsStorage tests cover add/remove/update/get operations
  - LinksStorage tests cover add/remove with broken link detection
  - Tests verify atomic write patterns (no corrupt files on failure)
  - Sorting tests verify correct hierarchy (dir/file order, physical/manual)
  - Context value tests verify correct assignment for each item type
  - All tests pass with >80% code coverage for storage modules
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 75-79) - Testing guidance with @vscode/test-cli
  - #fetch:https://code.visualstudio.com/api/working-with-extensions/testing-extension - Official testing documentation

- **Dependencies**:
  - Phase 2 and 3 completion (storage and tree model)

### Task 7.2: Add integration tests for watcher and commands

Create integration tests validating watcher behavior and core command flows.

- **Files**:
  - src/test/integration.test.ts (new) - Integration test suite
  - src/test/integration.test.ts - Test openProject -> watcher active -> change detected -> refresh
  - src/test/integration.test.ts - Test closeProject -> watcher disposed
  - src/test/integration.test.ts - Test createDirectory command flow
  - src/test/integration.test.ts - Test rename/delete command flows
  - src/test/integration.test.ts - Test add/remove link commands
  
- **Success**:
  - Integration tests use @vscode/test-cli with Mocha runner
  - .vscode-test.mjs config file created for test execution
  - Watcher tests verify files are detected within debounce window
  - Command tests verify tree state updates correctly
  - All integration tests pass
  - Tests clean up temporary project directories after execution
  
- **Research References**:
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 75-79) - @vscode/test-cli and integration testing
  - #fetch:https://code.visualstudio.com/api/working-with-extensions/testing-extension - Testing extension documentation

- **Dependencies**:
  - Phase 5 completion (watchers), Phase 4 completion (commands), Phase 7.1 completion

### Task 7.3: Verify view actions and welcome content UX guidelines compliance

Audit view/menu structure and welcome content for UX guideline compliance.

- **Files**:
  - Review package.json menus.view/title - ensure <= 5 actions
  - View icon assigned and descriptive
  - Welcome content follows guideline recommendations
  - Context menus are concise and action-focused
  
- **Success**:
  - View title has <= 5 action buttons (refresh, create, add, etc.)
  - All buttons have descriptive labels and appropriate icons
  - Welcome view appears only when no projects open
  - Welcome content includes actionable guidance and links
  - Context menus present only relevant actions per item type
  - No deep nesting in tree (max 3-4 levels typical)
  - View loads without errors and displays tree properly
  
- **Research References**:
  - #fetch:https://code.visualstudio.com/api/ux-guidelines/views - Official UX guidelines for views (action count limit, icons, welcome views)
  - #file:../research/20260213-personal-project-manager-prd-research.md (Lines 80-87) - Guidelines summary

- **Dependencies**:
  - All phases (view structure is already built)

## Overall Success Criteria

- All package.json contributions match PRD requirements
- Tree view displays items in correct sort order with valid context values
- Storage layer persists projects, links, and state with atomic writes
- File system watcher detects changes with debouncing
- All commands execute successfully with appropriate error handling
- Drag-and-drop moves physical items and re-parents manual items
- Integration and unit tests pass with >80% coverage
- UX audit confirms compliance with view/menu/welcome guidelines
