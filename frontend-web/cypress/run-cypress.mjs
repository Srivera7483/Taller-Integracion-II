import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const cypressCli = path.resolve(projectRoot, 'node_modules', 'cypress', 'bin', 'cypress');

// Eliminar ELECTRON_RUN_AS_NODE si el terminal del IDE (VS Code / Antigravity) lo inyectó
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const child = spawn(process.execPath, [cypressCli, ...args], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

