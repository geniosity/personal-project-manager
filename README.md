# Personal Project Manager

A VS Code extension that provides a dedicated tree view interface for organizing and managing logical "projects". Unlike traditional file/folder management extensions, Personal Project Manager enables you to create custom project definitions that aggregate files and folders from anywhere on your filesystem into a single coherent view.

## Features

### Project Organization
- **Create Multiple Projects**: Define and manage multiple logical projects with unique names
- **Flexible Project Roots**: Each project is anchored to a root directory on your filesystem
- **Quick Project Switching**: Easily switch between projects using the Open Project command
- **Persistent Configuration**: Projects are saved globally and persist across VS Code sessions

### External Links
- **Link Files**: Add external files from anywhere on your system to your project tree using "Add External File"
- **Link Folders**: Add external folders from anywhere on your system to your project tree using "Add External Folder"
- **Hierarchical Organization**: External links can be added under:
  - Project root (top-level)
  - Physical directories (filesystem folders within your project)
  - Other external folders (nested external links)
- **Smart Duplicate Prevention**: The extension prevents adding the same file/folder twice under the same parent node
- **Drag and Drop**: Move external links between project nodes by dragging them in the tree view

![External Links Example](images/external-links.png)

### File System Integration
- **Real-time Synchronization**: Tree view automatically updates when files change on disk
- **Native File Operations**: Create, rename, and delete files/folders directly from the tree view
- **Broken Link Detection**: Missing external files/folders are clearly marked with warning icons
- **Clean Project**: Remove all broken links with a single command

### Tree View Management
- **Physical Items**: Files and folders from your project root directory
- **External Items**: Files and folders linked from outside the project (prefixed with → arrow and labeled "(external)")
- **Broken Links**: Missing items marked with "(missing)" and warning icons
- **Smart Sorting**: Items sorted by type (directories first, then files) and alphabetically within each category

### Context Menu Operations
Rich context menus provide quick access to common operations:
- Create new files and folders
- Rename and delete items
- Add external items to any folder
- Remove external links (without deleting the actual files)
- Copy absolute or relative paths
- Open containing folder in system explorer
- Reveal active file in project tree

## Extension Settings

This extension contributes the following settings:

* `projectviewer.enableRevealActiveFile` (boolean, default: `false`): Show and enable the Reveal Active File command and button. This feature is **disabled by default** due to performance considerations. See [Reveal Active File Feature](#reveal-active-file-feature) below.
* `projectviewer.revealActiveFileLogging` (boolean, default: `false`): Enable debug logging for Reveal Active File timing and performance metrics. Logs are written to the "Personal Project Manager" Output Channel.

### Reveal Active File Feature

The "Reveal Active File" feature automatically reveals and selects the currently active editor file in the project tree view. 

**Status:** Disabled by default. This feature is under investigation for performance and memory usage optimization.

#### Enabling the Feature

You have two options to enable this feature:

**Option 1: Using the Command Palette (Recommended)**
1. Open the Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Search for `Projects: Toggle Reveal Active File Feature`
3. Run the command to enable or disable the feature

**Option 2: Editing Settings Directly**
1. Open VS Code Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
2. Search for `projectviewer.enableRevealActiveFile`
3. Check the checkbox to enable it

#### Using the Feature

Once enabled:
- A "Reveal Active File" button (target icon) will appear in the project tree view title bar
- Click the button or use the Command Palette (`Projects: Reveal Active File`) to reveal the current editor file in the project tree
- The tree will automatically expand and select the file if it's part of the active project

#### Debug Logging

If you experience slowness or memory issues:

1. Enable debug logging by setting `projectviewer.revealActiveFileLogging` to `true`
2. Open the Output Panel: `Ctrl+Shift+U` (Windows/Linux) or `Cmd+Shift+U` (macOS)
3. Select "Personal Project Manager" from the dropdown
4. Use the Reveal Active File feature
5. Check the output for timing information:
   - `Root nodes fetched in XXms` - time to fetch project tree roots
   - `Search finished in XXms; visited=N` - time to search and number of nodes visited
   - `Reveal completed in XXms; total=XXXms` - time to reveal in UI and total command time

This data helps identify whether the slowness is due to tree traversal, node searching, or the reveal operation itself.

## Getting Started

### Create Your First Project
1. Click the "+" button in the Project Manager view title bar
2. Select a folder as your project root
3. Enter a unique project name
4. The project tree will appear showing all files and folders in the root directory

### Add External Links
1. Right-click on any folder in the tree (or the project root)
2. Select "Add External File" or "Add External Folder"
3. Choose one or more files (or folders) from your system
4. External items appear under the selected node with "(external)" label
5. If you try to add the same item twice, you'll see a message: "No external files/folders added. All selections already exist under this node."

### Organize External Links
- **Drag and Drop**: Drag external items to different folders to reorganize your project structure
- **Remove Links**: Right-click external items and select "Remove from Project" (doesn't delete the actual files)
- **Clean Broken Links**: Click the broom icon in the title bar to remove all missing external links at once

## Requirements

- VS Code 1.109.0 or higher

## Known Issues

- The "Reveal Active File" feature is disabled by default due to ongoing performance investigation. See [Reveal Active File Feature](#reveal-active-file-feature) for details.

## Release Notes

### 0.1.1

**Added**:
- Separate commands for adding external files and folders (replaces single "Add External Link")
- External links can now be added under physical directories (not just project root)
- Duplicate prevention: Same file/folder cannot be added twice under the same parent
- Drag and drop support for moving external links under physical directories
- Arrow icon (→) prefix for external items to improve visual distinction
- Clear feedback messages for duplicate items and batch operations

**Fixed**:
- External links now appear under the correct parent node when added
- Proper file/folder selection on Windows and Linux (split into separate dialogs to work around platform limitations)

### 0.1.0

Initial release:
- Project creation and management
- Tree view with real-time file system watching
- External file/folder linking
- Context menu operations
- Drag and drop support
- Broken link detection

---

## Following Extension Guidelines

This extension follows the [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines).

**Enjoy organizing your projects!**

1. Create a TXT record in your DNS configuration for the following hostname:_visual-studio-marketplace-geniosity.geniosity.co.za
2. Use this code as the value for the TXT record:65806baa-0d29-4d47-ad4b-ccb632970257
3. Wait until your DNS configuration changes. This could take up to 72 hours.