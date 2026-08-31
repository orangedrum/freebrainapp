#!/usr/bin/env node
/**
 * Architecture Guard — Lego-Block Enforcement
 *
 * Zero-dependency script that scans src/ for import violations:
 *   1. Cross-feature imports (e.g., features/brainlover importing from features/freebrainer)
 *   2. Circular dependencies within feature folders
 *
 * Run locally:  node scripts/check-architecture.js
 * Run in CI:    npm run arch:check
 *
 * Exits with code 1 if violations found, 0 if clean.
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "..", "src");
const FEATURES_DIR = path.join(SRC_DIR, "features");

// Allowed shared layers that any feature can import from
const SHARED_LAYERS = [
  "src/components/shared",
  "src/components/ui",
  "src/lib",
  "src/hooks",
  "src/contexts",
  "src/types",
  "src/locales",
];

const FEATURE_FOLDERS = fs
  .readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const violations = [];

/**
 * Resolve an import path to a normalized form relative to src/.
 * Handles @/ alias and relative paths.
 */
function resolveImportPath(importPath, fromFile) {
  let resolved;

  if (importPath.startsWith("@/")) {
    resolved = importPath.slice(2); // strip @/
  } else if (importPath.startsWith(".")) {
    const fromDir = path.dirname(fromFile);
    resolved = path.relative(SRC_DIR, path.resolve(fromDir, importPath));
  } else {
    return null; // external package, skip
  }

  // Normalize and strip file extensions
  resolved = resolved.replace(/\.(ts|tsx|js|jsx)$/, "");
  resolved = resolved.replace(/\\/g, "/");
  return resolved;
}

/**
 * Extract all import paths from a file's content.
 */
function extractImports(content) {
  const imports = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(
      /(?:import\s+.*?from\s+|export\s+.*?from\s+|require\s*\(\s*)["']([^"']+)["']/
    );
    if (match) {
      imports.push(match[1]);
    }
  }

  return imports;
}

/**
 * Get the feature folder name from a file path, if it's inside features/.
 */
function getFeatureName(filePath) {
  const relPath = path.relative(SRC_DIR, filePath).replace(/\\/g, "/");
  if (relPath.startsWith("features/")) {
    const parts = relPath.split("/");
    return parts[1]; // features/<name>/...
  }
  return null;
}

/**
 * Check if an import path is a shared layer (always allowed).
 */
function isSharedLayer(importPath) {
  return SHARED_LAYERS.some((layer) => importPath.startsWith(layer));
}

/**
 * Get the feature folder name from an import path, if it points into features/.
 */
function getImportFeatureName(importPath) {
  if (importPath.startsWith("features/")) {
    const parts = importPath.split("/");
    return parts[1];
  }
  return null;
}

/**
 * Recursively scan a directory for .ts and .tsx files.
 */
function scanDirectory(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Build a dependency map: file -> array of imported file paths (within features only).
 */
function buildDependencyMap() {
  const files = scanDirectory(SRC_DIR);
  const depMap = new Map(); // file -> [{ importPath, rawImport, feature }]
  const fileToFeature = new Map();

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const imports = extractImports(content);
    const sourceFeature = getFeatureName(file);

    if (sourceFeature) {
      fileToFeature.set(file, sourceFeature);
    }

    for (const rawImport of imports) {
      const resolved = resolveImportPath(rawImport, file);
      if (!resolved) continue;

      const importFeature = getImportFeatureName(resolved);

      // Cross-feature violation: feature A imports from feature B (not shared)
      if (
        sourceFeature &&
        importFeature &&
        sourceFeature !== importFeature &&
        !isSharedLayer(resolved)
      ) {
        violations.push({
          type: "cross-feature",
          file: path.relative(SRC_DIR, file),
          importPath: resolved,
          sourceFeature,
          importFeature,
          message: `❌ Cross-feature import: features/${sourceFeature} imports from features/${importFeature}. Use src/components/shared/ or src/lib/ instead.`,
        });
      }
    }
  }

  return { depMap, fileToFeature };
}

/**
 * Detect circular dependencies between feature folders.
 */
function detectCircularDependencies(fileToFeature) {
  // Build feature-level graph
  const featureGraph = new Map(); // feature -> Set of features it imports from

  for (const [file, sourceFeature] of fileToFeature) {
    const content = fs.readFileSync(file, "utf-8");
    const imports = extractImports(content);

    if (!featureGraph.has(sourceFeature)) {
      featureGraph.set(sourceFeature, new Set());
    }

    for (const rawImport of imports) {
      const resolved = resolveImportPath(rawImport, file);
      if (!resolved) continue;

      const importFeature = getImportFeatureName(resolved);
      if (
        importFeature &&
        importFeature !== sourceFeature &&
        !isSharedLayer(resolved)
      ) {
        featureGraph.get(sourceFeature).add(importFeature);
      }
    }
  }

  // DFS cycle detection
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(feature, path) {
    visited.add(feature);
    recursionStack.add(feature);

    const deps = featureGraph.get(feature) || new Set();
    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep, [...path, dep]);
      } else if (recursionStack.has(dep)) {
        const cycleStart = path.indexOf(dep);
        cycles.push([...path.slice(cycleStart), dep]);
      }
    }

    recursionStack.delete(feature);
  }

  for (const feature of featureGraph.keys()) {
    if (!visited.has(feature)) {
      dfs(feature, [feature]);
    }
  }

  for (const cycle of cycles) {
    violations.push({
      type: "circular",
      message: `🔄 Circular dependency detected: ${cycle.join(" → ")}`,
    });
  }
}

// ── Main ──

console.log("🔍 Checking architecture (Lego-Block model)...\n");
console.log(`   Features: ${FEATURE_FOLDERS.join(", ")}\n`);

const { fileToFeature } = buildDependencyMap();
detectCircularDependencies(fileToFeature);

if (violations.length === 0) {
  console.log("✅ No architecture violations found.\n");
  console.log("   All feature imports go through shared layers.");
  console.log("   No circular dependencies detected.");
  process.exit(0);
}

console.log(`❌ Found ${violations.length} architecture violation(s):\n`);

for (const v of violations) {
  if (v.type === "cross-feature") {
    console.log(`  ${v.message}`);
    console.log(`     File: ${v.file}`);
    console.log(`     Import: ${v.importPath}\n`);
  } else {
    console.log(`  ${v.message}\n`);
  }
}

console.log(
  "\nFix: Move shared logic to src/components/shared/ or src/lib/ and import from there."
);
process.exit(1);
