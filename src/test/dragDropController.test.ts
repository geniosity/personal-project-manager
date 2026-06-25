import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { TreeDragDropController } from '../dragDropController';
import { LinksStorage } from '../linksStorage';
import { ProjectsStorage } from '../storage';
import { StateManager } from '../stateManager';

suite('TreeDragDropController Tests', () => {
  let tempDir: string;
  let projectDir: string;
  let projectsStorage: ProjectsStorage;
  let linksStorage: LinksStorage;
  let stateManager: StateManager;
  let controller: TreeDragDropController;
  let originalWarning: typeof vscode.window.showWarningMessage;
  let originalInfo: typeof vscode.window.showInformationMessage;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectviewer-dnd-test-'));
    projectDir = fs.mkdtempSync(path.join(tempDir, 'project-'));
    fs.mkdirSync(path.join(projectDir, 'physicalDir1'));

    projectsStorage = new ProjectsStorage(tempDir);
    linksStorage = new LinksStorage();

    const state = new Map<string, unknown>();
    const fakeContext = {
      workspaceState: {
        get: (key: string) => state.get(key),
        update: (key: string, value: unknown) => {
          state.set(key, value);
          return Promise.resolve();
        }
      }
    } as unknown as vscode.ExtensionContext;

    stateManager = new StateManager(fakeContext);
    projectsStorage.addProject('TestProject', projectDir);
    stateManager.setActiveProjectName('TestProject');

    controller = new TreeDragDropController(
      projectsStorage,
      linksStorage,
      stateManager,
      () => {}
    );

    originalWarning = vscode.window.showWarningMessage;
    vscode.window.showWarningMessage = async () => undefined as unknown as string;
    originalInfo = vscode.window.showInformationMessage;
    vscode.window.showInformationMessage = async () => undefined as unknown as string;
  });

  teardown(() => {
    vscode.window.showWarningMessage = originalWarning;
    vscode.window.showInformationMessage = originalInfo;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should move manual link under physical directory', async () => {
    const externalDir = fs.mkdtempSync(path.join(tempDir, 'external-'));
    const linkId = linksStorage.addLink(projectDir, 'External', externalDir);
    const physicalDirPath = path.join(projectDir, 'physicalDir1');

    const dragged = {
      id: `manualDir:${linkId}`,
      contextValue: 'manualDir',
      itemPath: externalDir,
      linkId
    };

    const target = {
      contextValue: 'physicalDir',
      itemPath: physicalDirPath
    };

    await (controller as any).handleManualDrop(dragged, target);

    const links = linksStorage.getLinks(projectDir);
    assert.strictEqual(links[linkId].parentId, `physicalDir:${physicalDirPath}`);
  });

  test('addExternalUris adds a dropped file:// uri as a link', async () => {
    const externalFile = path.join(tempDir, 'dropped.txt');
    fs.writeFileSync(externalFile, 'content');

    await (controller as any).addExternalUris(
      [vscode.Uri.file(externalFile).toString()],
      { contextValue: 'project', itemPath: projectDir }
    );

    const links = linksStorage.getLinks(projectDir);
    const added = Object.values(links).find(
      link => path.resolve(link.path).toLowerCase() === path.resolve(externalFile).toLowerCase()
    );
    assert.ok(added, 'dropped file should be added as a link');
    assert.strictEqual(added!.name, 'dropped.txt');
  });
});
