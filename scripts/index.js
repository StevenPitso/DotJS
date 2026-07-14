// scripts/index.js
// Export all scripts for programmatic use

export const build = () => import('./build.js');
export const dev = () => import('./dev.js');
export const bundleWorker = () => import('./bundle-worker.js');