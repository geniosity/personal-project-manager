<!-- markdownlint-disable-file -->

# Task Research Notes: Project Completion Requirements

## Research Executed

### File Analysis

- **src/extension.ts** (342 lines)
  - Tree provider structure implemented but getChildren returns empty array for project nodes
  - Commands registered but most are placeholder stubs showing info messages
  - Only openProject, closeProject, and refreshEntry have partial implementation
  - File watcher lifecycle management implemented

- **src/treeModel.ts** (317 lines)
  - Complete node model hierarchy (PhysicalDir, PhysicalFile, ManualDir, ManualFile, BrokenLink, Project)
  - Sorting logic fully implemented
  - getChildren methods implemented for all node types
  - Integration with LinksStorage working

- **src/storage.ts** (191 lines)
  - ProjectsStorage fully implemented with atomic writes
  - CRUD operations for projects complete
  - Error handling and validation in place

- **src/linksStorage.ts** (212 lines)
  - LinksStorage fully implemented with atomic writes
  - CRUD operations for links complete
  - Broken link detection automatic
  - Per-project configuration file management

- **src/stateManager.ts**
  - Workspace state management for active project
  - Recent projects tracking

- **src/watcher.ts**
  - FileSystemWatcher with debouncing implemented
  - Lifecycle management with proper disposal

- **src/dragDropController.ts**
  - Skeleton structure only, logs drag-drop events
  - No actual move/re-parent logic implemented

- **package.json**
  - All commands defined (11 total)
  - Context menus configured
  - Welcome view defined
  - All metadata properly set

### Code Search Results

- **Placeholder Commands** (grep: showInformationMessage)
  - createNewProject - stub
  - renameItem - stub with "to be implemented" message
  - deleteItem - stub with "to be implemented" message
  - addExternalLink - stub
  - removeLink - stub
  - copyPath - stub
  - copyRelativePath - stub
  - openContainingFolder - stub

- **Missing from package.json Commands**
  - newFile - not in commands list
  - newFolder - not in commands list
  - renameProject - not in commands list
  - deleteProject - not in commands list
  - cleanProject - not in commands list
  - revealActiveFile - not in commands list

### External Research

- **VS Code Tree View API**
  - TreeDataProvider requires getChildren to return actual nodes
  - TreeItem.command can open files on click
  - TreeItem.resourceUri enables tooltips and file decorations

- **File Operations**
  - vscode.workspace.fs.writeFile for creating files
  - vscode.workspace.fs.rename for renaming
  - vscode.workspace.fs.delete for deleting
  - vscode.env.clipboard for copy operations
  - vscode.commands.executeCommand('revealFileInOS') for open containing folder

### Project Conventions

- Atomic writes pattern established in storage layers
- Error handling with proper Error class instances
- JSDoc comments on all public APIs
- Strict TypeScript mode enforced

## Key Discoveries

### What's Complete (Infrastructure)

1. **Storage Layer** - Fully functional
   - Global projects.json with atomic writes
   - Per-project .project-explorer-links.json with atomic writes
   - Workspace state for active project
   - Validation and error handling

2. **Tree Model** - Fully functional
   - Complete node hierarchy
   - Correct sorting algorithm
   - Context values for menu filtering
   - Broken link detection

3. **File Watching** - Fully functional
   - Debounced watcher (250ms)
   - Lifecycle management
   - Config file exclusion

4. **Package Configuration** - Complete
   - View container and view defined
   - All commands registered
   - Context menus configured
   - Welcome view in place

### What's Stubbed (Not Implemented)

1. **Tree Provider Integration** - Critical Gap
   - getChildren returns empty array instead of using TreeModel
   - No integration between TreeDataProvider and TreeModel
   - Tree never displays actual project contents

2. **Project Management Commands** - All Stubs
   - createNewProject: needs directory picker, name input, storage.addProject
   - renameProject: needs input box, storage.updateProject
   - deleteProject: needs confirmation, storage.removeProject
   - cleanProject: needs getBrokenLinks, batch removal

3. **File Operation Commands** - All Stubs
   - newFile: needs input box, fs.writeFile, refresh
   - newFolder: needs input box, fs.mkdir, refresh
   - renameItem: input logic exists but no actual fs.rename
   - deleteItem: confirmation exists but no actual fs.delete

4. **External Link Commands** - All Stubs
   - addExternalLink: needs file picker, linksStorage.addLink
   - removeLink: needs linksStorage.removeLink, refresh

5. **Utility Commands** - All Stubs
   - copyPath: needs clipboard.writeText
   - copyRelativePath: needs path calculation, clipboard
   - openContainingFolder: needs revealFileInOS command
   - revealActiveFile: not registered, needs tree reveal logic

6. **Drag and Drop** - Skeleton Only
   - No handleDrag implementation
   - No handleDrop implementation
   - No validation of drop targets
   - No physical file moves
   - No manual link re-parenting

### Missing Commands from PRD

Per PRD Section 4 (Commands API), these commands are required but not in package.json:

1. **projectviewer.newFile** - Create file in directory
2. **projectviewer.newFolder** - Create subdirectory
3. **projectviewer.renameProject** - Rename project (distinct from renameItem)
4. **projectviewer.deleteProject** - Delete project definition
5. **projectviewer.cleanProject** - Remove broken links
6. **projectviewer.revealActiveFile** - Show active editor file in tree
7. **projectviewer.openProjectList** - Show recent projects (optional)

### Missing Context Menu Entries

Per PRD Section 5 (Context Menu Structure):

1. **Project Root Context Menu** - Missing:
   - Rename Project
   - Delete Project
   - New File
   - New Folder
   - Add External Item(s) Here...
   - Close Project
   - Open in Explorer
   - Open in New Window

2. **Physical Directory Context Menu** - Missing:
   - New File
   - New Folder
   - Add External Item(s) Here...

3. **Manual Folder Context Menu** - Missing:
   - New File
   - New Folder
   - Add External Item(s) Here...

## Recommended Approach

**Complete Command Implementation with Tree Provider Integration**

Based on verification that all infrastructure is complete and tested, the remaining work focuses on:

1. **Connect TreeDataProvider to TreeModel** - Critical first step
2. **Implement all command handlers** - Replace stubs with actual logic
3. **Add missing commands** - Per PRD requirements
4. **Update context menus** - Add missing entries
5. **Implement drag-drop logic** - Move files, re-parent links
6. **Implement file operations** - Create, rename, delete physical items

## Implementation Guidance

### Priority 1: Tree Display (Blocking)

**Current Problem**: Tree shows empty projects because getChildren returns [] for project nodes.

**Solution**: Update ProjectTreeProvider.getChildren to use TreeModel:

\\\	ypescript
getChildren(element?: ProjectNode): Thenable<ProjectNode[]> {
  if (!element) {
    // Return root level projects
    const projects = this.projectsStorage.getProjects();
    return Promise.resolve(projects.map(p => 
      new ProjectNode(p.name, vscode.TreeItemCollapsibleState.Collapsed, 'project')
    ));
  }

  // Use TreeModel to get children
  const activeProject = this.stateManager.getActiveProjectName();
  if (!activeProject || element.label !== activeProject) {
    return Promise.resolve([]);
  }

  const project = this.projectsStorage.getProject(activeProject);
  if (!project) {
    return Promise.resolve([]);
  }

  const projectModel = this.treeModel.createProjectModel(project.name, project.rootPath);
  const children = projectModel.getChildren();
  
  // Convert node models to tree items
  return Promise.resolve(children.map(child => convertToTreeItem(child)));
}
\\\

### Priority 2: Project Management Commands

**createNewProject**:
- Use vscode.window.showOpenDialog for directory selection
- Use vscode.window.showInputBox for project name
- Call projectsStorage.addProject
- Call stateManager.setActiveProjectName
- Create and start file watcher
- Refresh tree

**renameProject**: 
- vscode.window.showInputBox with current name
- projectsStorage.getProjects to find by old name
- Create new entry, copy rootPath
- projectsStorage.removeProject(oldName)
- projectsStorage.addProject(newName, rootPath)
- Update stateManager if active
- Refresh tree

**deleteProject**:
- vscode.window.showWarningMessage with modal confirmation
- projectsStorage.removeProject
- If active, call closeProject logic
- Refresh tree

**cleanProject**:
- linksStorage.getBrokenLinks
- Loop and linksStorage.removeLink for each
- Show info message with count removed
- Refresh tree

### Priority 3: File Operations

**newFile**:
- Extract parent path from node
- vscode.window.showInputBox for filename
- vscode.workspace.fs.writeFile(Uri.file(fullPath), new Uint8Array())
- Watcher will auto-refresh tree

**newFolder**:
- Extract parent path from node
- vscode.window.showInputBox for folder name
- Use Node fs.mkdirSync (already used in createDirectory)
- Watcher will auto-refresh tree

**renameItem** (fix existing):
- Get current path from node
- Calculate new path
- vscode.workspace.fs.rename(oldUri, newUri)
- Watcher will auto-refresh tree

**deleteItem** (fix existing):
- Get path from node
- vscode.workspace.fs.delete(uri, { recursive: true })
- Watcher will auto-refresh tree

### Priority 4: External Links

**addExternalLink**:
- vscode.window.showOpenDialog with canSelectMany, canSelectFiles, canSelectFolders
- Loop through selections
- linksStorage.addLink for each
- Refresh tree (manual links don't trigger watcher)

**removeLink**:
- Extract link ID from node
- linksStorage.removeLink
- Refresh tree

### Priority 5: Utility Commands

**copyPath**:
- Get path from node.itemPath or context
- vscode.env.clipboard.writeText(absolutePath)
- vscode.window.showInformationMessage('Path copied')

**copyRelativePath**:
- Get absolute path from node
- Get project root path
- Calculate relative using path.relative
- vscode.env.clipboard.writeText(relativePath)

**openContainingFolder**:
- Get path from node
- Get directory (path.dirname if file)
- vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(dirPath))

**revealActiveFile**:
- vscode.window.activeTextEditor?.document.uri
- Find matching node in tree
- treeView.reveal(node, { select: true, focus: true, expand: true })

### Priority 6: Drag and Drop

**handleDrag**:
- Extract node path and type from dragged item
- Create DataTransferItem with custom MIME type
- Store node ID and context value

**handleDrop**:
- Validate drop (check target is directory, not dropping on self)
- If physical item: vscode.workspace.fs.rename (move on disk)
- If manual item: linksStorage.updateLinkMetadata with new parentId
- Refresh tree

### Priority 7: Context Menu Updates

**Add to package.json menus.view/item/context**:

\\\json
{
  "command": "projectviewer.newFile",
  "when": "view == projectViewer && viewItem =~ /^(project|physicalDir|manualDir)$/",
  "group": "1_modification@1"
},
{
  "command": "projectviewer.newFolder",
  "when": "view == projectViewer && viewItem =~ /^(project|physicalDir|manualDir)$/",
  "group": "1_modification@2"
},
{
  "command": "projectviewer.addExternalItems",
  "when": "view == projectViewer && viewItem =~ /^(project|physicalDir|manualDir)$/",
  "group": "1_modification@3"
},
{
  "command": "projectviewer.renameProject",
  "when": "view == projectViewer && viewItem == project",
  "group": "2_project@1"
},
{
  "command": "projectviewer.deleteProject",
  "when": "view == projectViewer && viewItem == project",
  "group": "2_project@2"
}
\\\

## Success Criteria

- [ ] Tree displays physical and manual items for active project
- [ ] createNewProject creates project and displays tree
- [ ] renameProject updates project name
- [ ] deleteProject removes project definition
- [ ] newFile creates file in selected directory
- [ ] newFolder creates folder in selected directory
- [ ] renameItem renames physical files/folders
- [ ] deleteItem deletes physical files/folders
- [ ] addExternalLink adds manual links to project
- [ ] removeLink removes manual links
- [ ] copyPath/copyRelativePath copy to clipboard
- [ ] openContainingFolder opens system explorer
- [ ] revealActiveFile selects file in tree
- [ ] cleanProject removes broken links
- [ ] Drag-drop moves physical items on disk
- [ ] Drag-drop re-parents manual items in config
- [ ] All context menus show appropriate commands
- [ ] File watcher updates tree on changes
- [ ] No compilation errors, no lint errors
- [ ] Extension runs without errors in Extension Host

## Estimated Implementation Effort

Based on complete infrastructure:

- **Tree Provider Integration**: 1-2 hours (critical path)
- **Project Management Commands**: 2-3 hours (4 commands)
- **File Operations**: 3-4 hours (6 operations with validation)
- **External Links**: 1-2 hours (2 commands)
- **Utility Commands**: 2-3 hours (4 commands)
- **Context Menus**: 1 hour (package.json updates)
- **Drag and Drop**: 2-3 hours (validation + two code paths)
- **Testing & Debugging**: 2-3 hours

**Total: 14-21 hours** (approximately 2-3 working days)

## Dependencies

All dependencies already satisfied:
- TreeModel implemented and tested
- Storage layers implemented and tested
- File watcher implemented
- Package.json structure complete
- No external library additions needed

## Next Steps

1. **Update .copilot-tracking/research/20260213-project-completion-research.md** - This document
2. **Create implementation plan** in .copilot-tracking/plans/
3. **Begin with Priority 1** (Tree Provider Integration) - Unlocks manual testing
4. **Implement commands in priority order** - Each command can be tested immediately
5. **Verification** - Test each command after implementation

