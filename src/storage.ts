import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface representing a project in storage.
 */
export interface IProject {
  /** Unique project identifier/name */
  name: string;
  /** Root directory path for the project */
  rootPath: string;
  /** Optional project description */
  description?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
}

/**
 * Interface for projects storage data structure.
 */
interface IProjectsData {
  version: number;
  projects: IProject[];
}

/**
 * Manages global projects storage with atomic write operations.
 */
export class ProjectsStorage {
  private dataPath: string;

  /**
   * Creates a new ProjectsStorage instance.
   * @param storagePath Path to the global storage directory
   */
  constructor(storagePath: string) {
    this.dataPath = path.join(storagePath, 'projects.json');
  }

  /**
   * Get all projects.
   * @returns Array of projects, or empty array if storage doesn't exist
   */
  getProjects(): IProject[] {
    try {
      if (!fs.existsSync(this.dataPath)) {
        return [];
      }
      const content = fs.readFileSync(this.dataPath, 'utf-8');
      const data: IProjectsData = JSON.parse(content);
      return data.projects || [];
    } catch (error) {
      console.error('Error reading projects storage:', error);
      return [];
    }
  }

  /**
   * Add a new project.
   * @param name Project name (must be unique)
   * @param rootPath Project root directory path
   * @param description Optional project description
   * @throws Error if project name already exists or validation fails
   */
  addProject(name: string, rootPath: string, description?: string): void {
    const projects = this.getProjects();

    // Validate inputs
    if (!name || name.trim() === '') {
      throw new Error('Project name cannot be empty');
    }
    if (!rootPath || !fs.existsSync(rootPath)) {
      throw new Error('Project path does not exist');
    }

    // Check for duplicates
    if (projects.some(p => p.name === name)) {
      throw new Error(`Project with name "${name}" already exists`);
    }

    // Create new project
    const newProject: IProject = {
      name,
      rootPath,
      description,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };

    projects.push(newProject);
    this.writeProjects(projects);
  }

  /**
   * Remove a project by name.
   * @param name Project name to remove
   * @throws Error if project not found
   */
  removeProject(name: string): void {
    let projects = this.getProjects();
    const initialLength = projects.length;
    projects = projects.filter(p => p.name !== name);

    if (projects.length === initialLength) {
      throw new Error(`Project with name "${name}" not found`);
    }

    this.writeProjects(projects);
  }

  /**
   * Update a project's metadata.
   * @param name Project name to update
   * @param updates Fields to update
   * @throws Error if project not found
   */
  updateProject(name: string, updates: Partial<IProject>): void {
    const projects = this.getProjects();
    const project = projects.find(p => p.name === name);

    if (!project) {
      throw new Error(`Project with name "${name}" not found`);
    }

    // Update allowed fields
    if (updates.description !== undefined) {
      project.description = updates.description;
    }
    if (updates.rootPath !== undefined && fs.existsSync(updates.rootPath)) {
      project.rootPath = updates.rootPath;
    }

    project.modifiedAt = Date.now();
    this.writeProjects(projects);
  }

  /**
   * Find a project by name.
   * @param name Project name to find
   * @returns Project if found, undefined otherwise
   */
  getProject(name: string): IProject | undefined {
    return this.getProjects().find(p => p.name === name);
  }

  /**
   * Write projects to storage using atomic write pattern (write temp, then rename).
   * @param projects Projects to write
   * @throws Error if write fails
   */
  private writeProjects(projects: IProject[]): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: IProjectsData = {
        version: 1,
        projects: projects.sort((a, b) => a.name.localeCompare(b.name))
      };

      const content = JSON.stringify(data, null, 2);
      const tempPath = `${this.dataPath}.tmp`;

      // Write to temporary file first
      fs.writeFileSync(tempPath, content, 'utf-8');

      // Atomic rename
      if (fs.existsSync(this.dataPath)) {
        fs.unlinkSync(this.dataPath);
      }
      fs.renameSync(tempPath, this.dataPath);
    } catch (error) {
      // Clean up temp file if it exists
      const tempPath = `${this.dataPath}.tmp`;
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw new Error(`Failed to write projects storage: ${error}`);
    }
  }
}
