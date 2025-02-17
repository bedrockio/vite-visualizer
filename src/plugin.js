import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

import open from 'open';
import { sumBy } from 'lodash-es';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Basic gzip assumption.
const GZIP_RATIO = 0.38;
// Assumes Cloudflare L9 for static assets.
const BROTLI_RATIO = 0.3;

const IGNORED = 'vite/modulepreload-polyfill.js';

export default function plugin() {
  return {
    name: 'dependency-graph-plugin',
    async generateBundle(options, bundle) {
      let graph;

      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          graph = buildGraph(chunk.facadeModuleId, {
            modules: chunk.modules,
            getModuleInfo: this.getModuleInfo,
          });
        } else if (chunk.type === 'asset') {
          // TODO: handle assets?
        } else {
          // TODO: handle dynamic entries
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'stats.js',
        source: await loadFile('index.js'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'stats.html',
        source: await buildTemplate(graph),
      });

      const filename = path.resolve(process.cwd(), 'dist/stats.html');

      open(filename);
    },
  };
}

function buildGraph(id, options) {
  // eslint-disable-next-line
  id = id.replace(/^\x00/, '');

  const { getModuleInfo, modules } = options;
  const module = modules[id];

  if (!module || IGNORED.includes(id)) {
    return;
  }

  const info = getModuleInfo(id);

  const children = info.importedIds
    .map((id) => {
      return buildGraph(id, options);
    })
    .filter(Boolean);

  const { renderedLength: size } = module;

  let name = id;
  name = name.replace(/\?.+$/, '');
  name = path.relative(process.cwd(), name);

  const allDeps = getFlatDeps(children);
  const totals = getTotals(size + sumBy(allDeps, 'size'));

  return {
    id,
    name,
    size,
    ...totals,
    children,
  };
}

function getFlatDeps(children) {
  return children.flatMap((module) => {
    const { children, ...mod } = module;
    return [mod, ...getFlatDeps(children)];
  });
}

function getTotals(total) {
  return {
    total,
    totalGzip: Math.round(total * GZIP_RATIO),
    totalBrotli: Math.round(total * BROTLI_RATIO),
  };
}

async function buildTemplate(graph) {
  let css = await loadFile('index.css');
  let html = await loadFile('index.html');
  html = html.replace(
    /<script.*index.js.*<\/script>/,
    `
    <script>window.__GRAPH__ = ${JSON.stringify(graph)}</script>
    <script defer src="stats.js"></script>
    `
  );
  html = html.replace(/<link.*index.css">/, `<style>${css}</style>`);

  return html;
}

async function loadFile(file) {
  return await readFile(path.resolve(__dirname, '../dist', file), 'utf-8');
}
