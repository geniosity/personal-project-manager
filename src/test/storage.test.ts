import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectsStorage } from '../storage';
import { LinksStorage } from '../linksStorage';

suite('Storage Layer Tests', () => {
  let tempDir: string;
  let projectsStorage: ProjectsStorage;
  let linksStorage: LinksStorage;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectviewer-test-'));
    projectsStorage = new ProjectsStorage(tempDir);
    linksStorage = new LinksStorage();
  });

  teardown(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite('ProjectsStorage', () => {
    test('should return empty array for new storage', () => {
      const projects = projectsStorage.getProjects();
      assert.strictEqual(projects.length, 0);
    });

    test('should add a project', () => {
      projectsStorage.addProject('TestProject', tempDir, 'Test Description');
      const projects = projectsStorage.getProjects();
      assert.strictEqual(projects.length, 1);
      assert.strictEqual(projects[0].name, 'TestProject');
      assert.strictEqual(projects[0].rootPath, tempDir);
    });

    test('should prevent duplicate project names', () => {
      projectsStorage.addProject('TestProject', tempDir);
      assert.throws(() => {
        projectsStorage.addProject('TestProject', tempDir);
      }, /already exists/);
    });

    test('should remove a project', () => {
      projectsStorage.addProject('TestProject', tempDir);
      projectsStorage.removeProject('TestProject');
      const projects = projectsStorage.getProjects();
      assert.strictEqual(projects.length, 0);
    });

    test('should update project metadata', () => {
      projectsStorage.addProject('TestProject', tempDir, 'Old Description');
      projectsStorage.updateProject('TestProject', {
        description: 'New Description'
      });
      const project = projectsStorage.getProject('TestProject');
      assert.strictEqual(project?.description, 'New Description');
    });

    test('should persist data to file', () => {
      projectsStorage.addProject('TestProject', tempDir);
      const dataPath = path.join(tempDir, 'projects.json');
      assert.ok(fs.existsSync(dataPath));
      const content = fs.readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(content);
      assert.strictEqual(data.projects.length, 1);
    });
  });

  suite('LinksStorage', () => {
    let projectDir: string;

    setup(() => {
      projectDir = fs.mkdtempSync(path.join(tempDir, 'project-'));
    });

    test('should return empty object for new project', () => {
      const links = linksStorage.getLinks(projectDir);
      assert.strictEqual(Object.keys(links).length, 0);
    });

    test('should add a link', () => {
      const linkPath = fs.mkdtempSync(path.join(tempDir, 'external-'));
      const linkId = linksStorage.addLink(projectDir, 'TestLink', linkPath);
      const links = linksStorage.getLinks(projectDir);
      assert.ok(links[linkId]);
      assert.strictEqual(links[linkId].name, 'TestLink');
    });

    test('should validate link path exists', () => {
      assert.throws(() => {
        linksStorage.addLink(projectDir, 'BadLink', '/nonexistent/path');
      }, /does not exist/);
    });

    test('should prevent duplicate links for the same parent', () => {
      const linkPath = fs.mkdtempSync(path.join(tempDir, 'external-'));
      linksStorage.addLink(projectDir, 'TestLink', linkPath);

      assert.throws(() => {
        linksStorage.addLink(projectDir, 'TestLinkDuplicate', linkPath);
      }, /already exists/);
    });

    test('should remove a link', () => {
      const linkPath = fs.mkdtempSync(path.join(tempDir, 'external-'));
      const linkId = linksStorage.addLink(projectDir, 'TestLink', linkPath);
      linksStorage.removeLink(projectDir, linkId);
      const links = linksStorage.getLinks(projectDir);
      assert.strictEqual(Object.keys(links).length, 0);
    });

    test('should detect broken links', () => {
      const linkPath = fs.mkdtempSync(path.join(tempDir, 'external-'));
      const linkId = linksStorage.addLink(projectDir, 'TestLink', linkPath);

      // Delete the linked path
      fs.rmSync(linkPath, { recursive: true, force: true });

      const links = linksStorage.getLinks(projectDir);
      const brokenLinks = linksStorage.getBrokenLinks(projectDir);
      assert.ok(links[linkId].isBroken);
      assert.strictEqual(brokenLinks.length, 1);
    });

    test('should persist links to file', () => {
      const linkPath = fs.mkdtempSync(path.join(tempDir, 'external-'));
      linksStorage.addLink(projectDir, 'TestLink', linkPath);
      const configPath = path.join(projectDir, '.project-explorer-links.json');
      assert.ok(fs.existsSync(configPath));
    });

    test('should use atomic writes', () => {
      const linkPath = fs.mkdtempSync(path.join(tempDir, 'external-'));
      const linkId = linksStorage.addLink(projectDir, 'TestLink', linkPath);
      
      // Add another link (triggers write)
      const linkPath2 = fs.mkdtempSync(path.join(tempDir, 'external2-'));
      linksStorage.addLink(projectDir, 'TestLink2', linkPath2);

      // Verify no temp files left
      const files = fs.readdirSync(projectDir);
      assert.ok(!files.some(f => f.endsWith('.tmp')));
    });
  });
});
