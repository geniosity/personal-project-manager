# personal-project-manager README

This is the README for your extension "personal-project-manager". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

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

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Known Issues

- Calling out known issues can help limit users opening duplicate issues against your extension.
- The "Reveal Active File" feature is disabled by default due to ongoing performance investigation. See [Reveal Active File Feature](#reveal-active-file-feature) for details.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
