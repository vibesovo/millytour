import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const backend = spawn('node', ['server/index.mjs'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '4000' },
});

const frontend = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

const shutdown = () => {
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Backend exited with code ${code}`);
    frontend.kill('SIGTERM');
    process.exit(code ?? 1);
  }
});

frontend.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Frontend exited with code ${code}`);
    backend.kill('SIGTERM');
    process.exit(code ?? 1);
  }
});
