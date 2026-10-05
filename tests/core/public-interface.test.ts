import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('../..', import.meta.url).pathname;
const publicEntryPoints = new Set(['@/core', '@/core/testing']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? match[2],
  );
}

const coreDir = join(root, 'src/core');
const siteFiles = [...sourceFiles(join(root, 'src')), ...sourceFiles(join(root, 'tests'))].filter(
  (file) => !file.startsWith(coreDir),
);

describe('the Core public interface', () => {
  it('is the only way Site code reaches the Core', () => {
    const violations = siteFiles.flatMap((file) =>
      importsOf(file)
        .filter((specifier) => {
          const target = specifier.startsWith('.')
            ? `@/${relative(join(root, 'src'), join(dirname(file), specifier))}`
            : specifier;
          return target.startsWith('@/core') && !publicEntryPoints.has(target);
        })
        .map((specifier) => `${relative(root, file)} imports ${specifier}`),
    );

    expect(violations).toEqual([]);
  });

  it('keeps the Core independent of Site code', () => {
    const violations = sourceFiles(coreDir).flatMap((file) =>
      importsOf(file)
        .filter((specifier) => specifier.startsWith('@/'))
        .map((specifier) => `${relative(root, file)} imports ${specifier}`),
    );

    expect(violations).toEqual([]);
  });
});
