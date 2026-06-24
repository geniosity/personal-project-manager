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

    test('getLinks drops UNC and non-absolute paths', () => {
      const good = fs.mkdtempSync(path.join(tempDir, 'good-'));
      const config = {
        version: 1,
        links: [
          { id: 'a', name: 'good', path: good, isBroken: false },
          { id: 'b', name: 'unc', path: '\\\\attacker\\share\\x', isBroken: false },
          { id: 'c', name: 'relative', path: 'not/absolute', isBroken: false }
        ]
      };
      fs.writeFileSync(path.join(projectDir, '.project-explorer-links.json'), JSON.stringify(config));

      const links = linksStorage.getLinks(projectDir);
      assert.ok(links['a'], 'absolute local path kept');
      assert.strictEqual(links['b'], undefined, 'UNC path dropped');
      assert.strictEqual(links['c'], undefined, 'relative path dropped');
    });

    test('getLinks strips control/RTL characters from names', () => {
      const target = fs.mkdtempSync(path.join(tempDir, 'tgt-'));
      const config = {
        version: 1,
        links: [{ id: 'a', name: 'a\u202Eevil\nname', path: target, isBroken: false }]
      };
      fs.writeFileSync(path.join(projectDir, '.project-explorer-links.json'), JSON.stringify(config));

      const name = linksStorage.getLinks(projectDir)['a'].name;
      assert.ok(!/[\x00-\x1F\u202A-\u202E]/.test(name), 'control/bidi chars removed');
    });

    test('getLinks detaches a cyclic manual-link parent', () => {
      const t1 = fs.mkdtempSync(path.join(tempDir, 't1-'));
      const t2 = fs.mkdtempSync(path.join(tempDir, 't2-'));
      const config = {
        version: 1,
        links: [
          { id: 'a', name: 'a', path: t1, isBroken: false, parentId: 'b' },
          { id: 'b', name: 'b', path: t2, isBroken: false, parentId: 'a' }
        ]
      };
      fs.writeFileSync(path.join(projectDir, '.project-explorer-links.json'), JSON.stringify(config));

      const links = linksStorage.getLinks(projectDir);
      // At least one of the two must be detached to break the cycle.
      assert.ok(links['a'].parentId === undefined || links['b'].parentId === undefined);
    });

    test('reparentLinks repoints child links from an old dir id to a new dir id', () => {
      const childTarget = fs.mkdtempSync(path.join(tempDir, 'child-'));
      const oldDir = path.join(projectDir, 'oldName');
      const newDir = path.join(projectDir, 'newName');
      fs.mkdirSync(oldDir);
      const oldParentId = `physicalDir:${oldDir}`;
      const newParentId = `physicalDir:${newDir}`;

      const linkId = linksStorage.addLink(projectDir, 'child', childTarget, undefined, oldParentId);
      assert.strictEqual(linksStorage.getLinks(projectDir)[linkId].parentId, oldParentId);

      // Simulate the folder rename, then reparent.
      fs.renameSync(oldDir, newDir);
      const updated = linksStorage.reparentLinks(projectDir, oldParentId, newParentId);

      assert.strictEqual(updated, 1);
      assert.strictEqual(linksStorage.getLinks(projectDir)[linkId].parentId, newParentId);
    });
  });
});
