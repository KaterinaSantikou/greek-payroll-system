/**
 * Change Impact Analysis using ts-morph
 * Scans TypeScript/JavaScript dependencies to build impact lists
 */

import { Project, ts } from 'ts-morph';
import { writeFileSync } from 'fs';
import { dirname, resolve, relative, extname } from 'path';

class DependencyScanner {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.project = new Project({
      tsConfigFilePath: resolve(projectRoot, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
      skipFileDependencyResolution: false,
    });

    this.dependencyGraph = new Map();
    this.reverseDependencyGraph = new Map();
    this.scannedFiles = new Set();
  }

  /**
   * Scan all TypeScript/JavaScript files and build dependency graph
   */
  scanProject() {
    console.log('🔍 Scanning project dependencies with ts-morph...');

    // Get all source files
    const sourceFiles = this.project.getSourceFiles();
    console.log(`📂 Found ${sourceFiles.length} source files`);

    // Build forward and reverse dependency graphs
    for (const sourceFile of sourceFiles) {
      this.scanFile(sourceFile);
    }

    console.log(
      `✅ Dependency scan complete: ${this.dependencyGraph.size} files analyzed`
    );
    return {
      forwardDeps: Object.fromEntries(this.dependencyGraph),
      reverseDeps: Object.fromEntries(this.reverseDependencyGraph),
    };
  }

  /**
   * Scan a single file for its dependencies
   */
  scanFile(sourceFile) {
    const filePath = this.getRelativePath(sourceFile.getFilePath());

    if (this.scannedFiles.has(filePath)) {
      return;
    }

    this.scannedFiles.add(filePath);
    const dependencies = new Set();

    // Get import declarations
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Resolve relative imports
      if (moduleSpecifier.startsWith('.')) {
        try {
          const resolvedPath = this.resolveImport(filePath, moduleSpecifier);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
            this.addReverseDependency(resolvedPath, filePath);
          }
        } catch (error) {
          // Skip unresolved imports
        }
      } else if (
        !moduleSpecifier.startsWith('node:') &&
        !this.isNodeModule(moduleSpecifier)
      ) {
        // Handle non-relative imports within the project
        try {
          const resolvedPath = this.resolveImport(filePath, moduleSpecifier);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
            this.addReverseDependency(resolvedPath, filePath);
          }
        } catch (error) {
          // Skip unresolved imports
        }
      }
    }

    // Get dynamic imports
    sourceFile.forEachDescendant(node => {
      if (
        ts.isCallExpression(node.compilerNode) &&
        node.getExpression().getText() === 'import'
      ) {
        const args = node.getArguments();
        if (args.length > 0) {
          const moduleSpecifier = args[0].getText().replace(/['"]/g, '');
          if (moduleSpecifier.startsWith('.')) {
            try {
              const resolvedPath = this.resolveImport(
                filePath,
                moduleSpecifier
              );
              if (resolvedPath) {
                dependencies.add(resolvedPath);
                this.addReverseDependency(resolvedPath, filePath);
              }
            } catch (error) {
              // Skip unresolved imports
            }
          }
        }
      }
    });

    this.dependencyGraph.set(filePath, Array.from(dependencies));
  }

  /**
   * Resolve import path to actual file path
   */
  resolveImport(fromFile, importPath) {
    const fromDir = dirname(resolve(this.projectRoot, fromFile));

    // Handle relative imports
    if (importPath.startsWith('.')) {
      let resolved = resolve(fromDir, importPath);

      // Try common extensions if no extension provided
      if (!extname(resolved)) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
          const withExt = resolved + ext;
          try {
            const sourceFile = this.project.getSourceFile(withExt);
            if (sourceFile) {
              return this.getRelativePath(withExt);
            }
          } catch (error) {
            // Continue trying
          }
        }

        // Try index files
        for (const ext of extensions) {
          const indexFile = resolve(resolved, `index${ext}`);
          try {
            const sourceFile = this.project.getSourceFile(indexFile);
            if (sourceFile) {
              return this.getRelativePath(indexFile);
            }
          } catch (error) {
            // Continue trying
          }
        }
      } else {
        try {
          const sourceFile = this.project.getSourceFile(resolved);
          if (sourceFile) {
            return this.getRelativePath(resolved);
          }
        } catch (error) {
          // Skip
        }
      }
    }

    return null;
  }

  /**
   * Add reverse dependency mapping
   */
  addReverseDependency(dependency, dependent) {
    if (!this.reverseDependencyGraph.has(dependency)) {
      this.reverseDependencyGraph.set(dependency, []);
    }

    const reverseDeps = this.reverseDependencyGraph.get(dependency);
    if (!reverseDeps.includes(dependent)) {
      reverseDeps.push(dependent);
    }
  }

  /**
   * Check if module is a node_modules dependency
   */
  isNodeModule(moduleSpecifier) {
    return (
      !moduleSpecifier.startsWith('.') &&
      !moduleSpecifier.startsWith('/') &&
      !moduleSpecifier.includes('client/') &&
      !moduleSpecifier.includes('server/') &&
      !moduleSpecifier.includes('shared/')
    );
  }

  /**
   * Get relative path from project root
   */
  getRelativePath(absolutePath) {
    return relative(this.projectRoot, absolutePath).replace(/\\/g, '/');
  }

  /**
   * Analyze impact of changing specific files
   */
  analyzeChangeImpact(changedFiles) {
    console.log(
      `📊 Analyzing impact of changes to ${changedFiles.length} files...`
    );

    const impact = {
      directlyAffected: new Set(),
      indirectlyAffected: new Set(),
      potentialBreakingChanges: [],
      riskLevel: 'LOW',
    };

    // Find all files that depend on the changed files
    for (const changedFile of changedFiles) {
      this.findAffectedFiles(
        changedFile,
        impact.directlyAffected,
        impact.indirectlyAffected
      );
    }

    // Assess risk level
    const totalAffected =
      impact.directlyAffected.size + impact.indirectlyAffected.size;
    if (totalAffected > 20) {
      impact.riskLevel = 'HIGH';
    } else if (totalAffected > 5) {
      impact.riskLevel = 'MEDIUM';
    }

    // Identify potential breaking changes
    impact.potentialBreakingChanges = this.identifyBreakingChanges(
      changedFiles,
      impact.directlyAffected
    );

    return {
      ...impact,
      directlyAffected: Array.from(impact.directlyAffected),
      indirectlyAffected: Array.from(impact.indirectlyAffected),
      totalAffected: totalAffected,
      summary: `${changedFiles.length} files changed, ${impact.directlyAffected.size} directly affected, ${impact.indirectlyAffected.size} indirectly affected`,
    };
  }

  /**
   * Recursively find all affected files
   */
  findAffectedFiles(
    filePath,
    directlyAffected,
    indirectlyAffected,
    visited = new Set(),
    depth = 0
  ) {
    if (visited.has(filePath) || depth > 10) {
      // Prevent infinite loops and limit depth
      return;
    }

    visited.add(filePath);
    const dependents = this.reverseDependencyGraph.get(filePath) || [];

    for (const dependent of dependents) {
      if (depth === 0) {
        directlyAffected.add(dependent);
      } else {
        indirectlyAffected.add(dependent);
      }

      // Recursively find dependents of dependents
      this.findAffectedFiles(
        dependent,
        directlyAffected,
        indirectlyAffected,
        visited,
        depth + 1
      );
    }
  }

  /**
   * Identify potential breaking changes
   */
  identifyBreakingChanges(changedFiles, affectedFiles) {
    const breakingChanges = [];

    for (const changedFile of changedFiles) {
      // Check if this is a shared/core file
      if (
        changedFile.includes('shared/') ||
        changedFile.includes('types') ||
        changedFile.includes('schema')
      ) {
        breakingChanges.push({
          file: changedFile,
          reason: 'Changes to shared types/schemas can break multiple modules',
          severity: 'HIGH',
        });
      }

      // Check if many files depend on this
      const dependents = this.reverseDependencyGraph.get(changedFile) || [];
      if (dependents.length > 10) {
        breakingChanges.push({
          file: changedFile,
          reason: `High-dependency file (${dependents.length} dependents)`,
          severity: 'MEDIUM',
        });
      }

      // Check for API/service files
      if (
        changedFile.includes('api/') ||
        changedFile.includes('service') ||
        changedFile.includes('routes')
      ) {
        breakingChanges.push({
          file: changedFile,
          reason: 'Changes to API/service files can break client integrations',
          severity: 'MEDIUM',
        });
      }
    }

    return breakingChanges;
  }
}

/**
 * Main function to perform dependency scanning and impact analysis
 */
async function performImpactAnalysis(projectRoot, changedFiles = []) {
  try {
    const scanner = new DependencyScanner(projectRoot);

    // Scan entire project
    const dependencyGraph = scanner.scanProject();

    // Analyze impact if files are provided
    let impactAnalysis = null;
    if (changedFiles.length > 0) {
      impactAnalysis = scanner.analyzeChangeImpact(changedFiles);
    }

    const result = {
      timestamp: new Date().toISOString(),
      projectRoot,
      totalFiles: Object.keys(dependencyGraph.forwardDeps).length,
      dependencyGraph,
      impactAnalysis,
      success: true,
    };

    // Save results
    const outputPath = resolve(projectRoot, 'agent/impact_analysis.json');
    writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`✅ Impact analysis saved to: ${outputPath}`);
    return result;
  } catch (error) {
    console.error('❌ Error in impact analysis:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// CLI usage
if (process.argv.length > 2) {
  const projectRoot = process.argv[2] || process.cwd();
  const changedFiles = process.argv.slice(3);

  performImpactAnalysis(projectRoot, changedFiles)
    .then(result => {
      if (result.success) {
        console.log('📊 Impact Analysis Summary:');
        console.log(`   Total files analyzed: ${result.totalFiles}`);
        if (result.impactAnalysis) {
          console.log(`   Files changed: ${changedFiles.length}`);
          console.log(
            `   Directly affected: ${result.impactAnalysis.directlyAffected.length}`
          );
          console.log(
            `   Indirectly affected: ${result.impactAnalysis.indirectlyAffected.length}`
          );
          console.log(`   Risk level: ${result.impactAnalysis.riskLevel}`);
        }
      }
    })
    .catch(console.error);
}

export { DependencyScanner, performImpactAnalysis };
