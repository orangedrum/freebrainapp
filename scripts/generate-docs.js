#!/usr/bin/env node
/**
 * Auto-generates FEATURES.md by scanning src/pages/ and src/features/.
 *
 * Extracts:
 *  - Page routes + purpose (from JSDoc /** comments at file top)
 *  - Feature folders, their files, and role assignment
 *  - Cross-feature import dependencies
 *
 * Usage: node scripts/generate-docs.js
 * Add to package.json: "docs:generate": "node scripts/generate-docs.js"
 *
 * Zero dependencies — uses only Node built-ins.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const PAGES_DIR = path.join(SRC, "pages");
const FEATURES_DIR = path.join(SRC, "features");

// ── Helpers ─────────────────────────────────────────────

/** Read a file safely, returning empty string on error. */
function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

/** Extract the first JSDoc comment from file content. */
function extractJSDoc(content) {
  const match = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return null;
  // Clean up: remove leading *, trim
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\*/, "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Extract all import paths from a TS/TSX file. */
function extractImports(content) {
  const imports = [];
  const regex = /(?:import|from)\s+["'](@?\/?[^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/** Recursively list .ts/.tsx files in a directory. */
function listSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Convert an absolute path to a project-relative path. */
function relPath(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, "/");
}

/** Classify a feature folder into a role. */
function classifyRole(featureName) {
  if (featureName === "shared") return "shared";
  if (featureName === "brainlover") return "brainlover";
  if (featureName === "freebrainer") return "freebrainer";
  if (featureName === "pro") return "pro";
  if (featureName === "checkin") return "shared (check-in flow)";
  if (featureName === "community") return "shared (community)";
  if (featureName === "onboarding") return "shared (onboarding)";
  if (featureName === "profile") return "shared (profile)";
  if (featureName === "sessions") return "shared (sessions)";
  return "shared";
}

// ── Page scanning ───────────────────────────────────────

function scanPages() {
  const files = listSourceFiles(PAGES_DIR);
  const pages = [];

  for (const file of files) {
    const content = readSafe(file);
    const jsdoc = extractJSDoc(content);
    const imports = extractImports(content);
    const fileName = path.basename(file, path.extname(file));

    // Derive route from fileName (App.tsx maps these)
    const routeMap = {
      Index: "/",
      Auth: "/auth",
      Onboarding: "/onboarding",
      Overview: "/overview",
      BrainLoverDashboard: "/caregiver",
      Community: "/community",
      BrainLoverProDashboard: "/pro",
      AdminControls: "/admin-controls",
      Support: "/support",
      LoveTheirBrain: "/love-their-brain",
      Profile: "/profile",
      JoinTeam: "/join",
      NotFound: "/* (404)",
    };

    pages.push({
      name: fileName,
      route: routeMap[fileName] || `/${fileName.toLowerCase()}`,
      file: relPath(file),
      description: jsdoc || "(no JSDoc — add a /** comment at the top of this file)",
      featureImports: imports
        .filter((imp) => imp.includes("features/"))
        .map((imp) => imp.replace(/^.*features\//, "features/").split("/")[0])
        .filter((v, i, a) => a.indexOf(v) === i),
    });
  }

  return pages.sort((a, b) => (a.route > b.route ? 1 : -1));
}

// ── Feature scanning ────────────────────────────────────

function scanFeatures() {
  if (!fs.existsSync(FEATURES_DIR)) return [];
  const features = [];

  for (const entry of fs.readdirSync(FEATURES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const featurePath = path.join(FEATURES_DIR, entry.name);
    const files = listSourceFiles(featurePath);
    const role = classifyRole(entry.name);

    const components = [];
    const hooks = [];
    const otherFiles = [];
    const crossFeatureDeps = new Set();

    for (const file of files) {
      const content = readSafe(file);
      const baseName = path.basename(file);
      const rel = relPath(file);
      const imports = extractImports(content);

      // Track cross-feature dependencies
      for (const imp of imports) {
        if (imp.includes("features/") && !imp.includes(`features/${entry.name}`)) {
          const depFeature = imp.replace(/^.*features\//, "").split("/")[0];
          if (depFeature) crossFeatureDeps.add(depFeature);
        }
      }

      if (baseName.startsWith("use") && baseName.endsWith(".ts")) {
        hooks.push({ name: baseName.replace(".ts", ""), file: rel });
      } else if (/\.(tsx)$/.test(baseName)) {
        components.push({ name: baseName.replace(".tsx", ""), file: rel });
      } else {
        otherFiles.push({ name: baseName, file: rel });
      }
    }

    // Check for README.md in feature folder
    const readmePath = path.join(featurePath, "README.md");
    const readme = readSafe(readmePath);

    features.push({
      name: entry.name,
      role,
      components: components.sort((a, b) => a.name.localeCompare(b.name)),
      hooks: hooks.sort((a, b) => a.name.localeCompare(b.name)),
      otherFiles: otherFiles.sort((a, b) => a.name.localeCompare(b.name)),
      dependencies: Array.from(crossFeatureDeps).sort(),
      description: readme
        ? readme.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() || ""
        : "",
    });
  }

  return features.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Markdown generation ─────────────────────────────────

function generateMarkdown(pages, features) {
  const lines = [];

  lines.push("# Features & Architecture");
  lines.push("");
  lines.push("> Auto-generated by `node scripts/generate-docs.js` — do not edit manually.");
  lines.push("> Run `npm run docs:generate` before every release to keep this in sync.");
  lines.push("");
  lines.push(`**Last generated:** ${new Date().toISOString().split("T")[0]}`);
  lines.push("");

  // ── Pages section ──
  lines.push("## Pages");
  lines.push("");
  lines.push("| Route | Page | Description | Feature Dependencies |");
  lines.push("|-------|------|-------------|----------------------|");
  for (const p of pages) {
    const deps = p.featureImports.length > 0 ? p.featureImports.join(", ") : "—";
    lines.push(`| \`${p.route}\` | [${p.name}](${p.file}) | ${p.description} | ${deps} |`);
  }
  lines.push("");

  // ── Features section ──
  lines.push("## Feature Modules");
  lines.push("");

  for (const f of features) {
    lines.push(`### \`${f.name}\` (${f.role})`);
    lines.push("");
    if (f.description) {
      lines.push(`> ${f.description}`);
      lines.push("");
    }

    if (f.components.length > 0) {
      lines.push("**Components:**");
      lines.push("");
      for (const c of f.components) {
        lines.push(`- \`${c.name}\` — [${c.file}](${c.file})`);
      }
      lines.push("");
    }

    if (f.hooks.length > 0) {
      lines.push("**Hooks:**");
      lines.push("");
      for (const h of f.hooks) {
        lines.push(`- \`${h.name}\` — [${h.file}](${h.file})`);
      }
      lines.push("");
    }

    if (f.otherFiles.length > 0) {
      lines.push("**Other files:**");
      lines.push("");
      for (const o of f.otherFiles) {
        lines.push(`- \`${o.name}\` — [${o.file}](${o.file})`);
      }
      lines.push("");
    }

    if (f.dependencies.length > 0) {
      lines.push(`**Cross-feature dependencies:** ${f.dependencies.map((d) => `\`${d}\``).join(", ")}`);
      lines.push("");
    } else {
      lines.push("**Cross-feature dependencies:** none");
      lines.push("");
    }
  }

  // ── Dependency graph (Mermaid) ──
  lines.push("## Dependency Graph");
  lines.push("");
  lines.push("```mermaid");
  lines.push("graph LR");
  for (const f of features) {
    if (f.dependencies.length === 0) continue;
    for (const dep of f.dependencies) {
      lines.push(`  ${f.name}-->${dep}`);
    }
  }
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────

const pages = scanPages();
const features = scanFeatures();
const markdown = generateMarkdown(pages, features);

const outputPath = path.join(ROOT, "FEATURES.md");
fs.writeFileSync(outputPath, markdown, "utf-8");

console.log(`✓ Generated ${path.relative(ROOT, outputPath)}`);
console.log(`  ${pages.length} pages, ${features.length} feature modules documented.`);
