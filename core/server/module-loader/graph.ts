/**
 * Tri topologique pour résoudre l'ordre de chargement des modules
 * basé sur leurs dépendances.
 */

export interface ModuleManifest {
  _name?: string;
  _path?: string;
  label?: string;
  version?: string;
  depends?: string[];
  models?: string[];
  routes?: string[];
  views?: string[];
  data?: string[];
}

export interface DependencyNode {
  name: string;
  depends: string[];
  dependents: string[];
}

export function topologicalSort(
  items: string[],
  getDeps: (item: string) => string[]
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  const visiting = new Set<string>();

  function visit(item: string): void {
    if (visited.has(item)) return;
    if (visiting.has(item)) {
      throw new Error(`Dépendance circulaire détectée: ${item}`);
    }

    visiting.add(item);
    const deps = getDeps(item) || [];

    for (const dep of deps) {
      visit(dep);
    }

    visiting.delete(item);
    visited.add(item);
    result.push(item);
  }

  for (const item of items) {
    visit(item);
  }

  return result;
}

/**
 * Construit un graphe de dépendances à partir des manifests
 */
export function buildDependencyGraph(
  manifests: Map<string, ModuleManifest>
): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>();

  for (const [name, manifest] of manifests) {
    graph.set(name, {
      name,
      depends: manifest.depends || [],
      dependents: [],
    });
  }

  // Remplir les dependents (dépendances inverses)
  for (const [, node] of graph) {
    for (const dep of node.depends) {
      const depNode = graph.get(dep);
      if (depNode) {
        depNode.dependents.push(node.name);
      }
    }
  }

  return graph;
}

/**
 * Vérifie si toutes les dépendances sont satisfaites
 */
export function checkDependencies(
  moduleName: string,
  manifests: Map<string, ModuleManifest>,
  installed: Map<string, unknown>
): { valid: boolean; missing: string[] } {
  const manifest = manifests.get(moduleName);
  if (!manifest) return { valid: false, missing: [moduleName] };

  const missing: string[] = [];
  for (const dep of manifest.depends || []) {
    if (!installed.has(dep) && !manifests.has(dep)) {
      missing.push(dep);
    }
  }

  return { valid: missing.length === 0, missing };
}
