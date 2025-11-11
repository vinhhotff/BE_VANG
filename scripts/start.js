const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const distMainPath = path.join(__dirname, '..', 'dist', 'main.js');

// Check if production build exists
if (fs.existsSync(distMainPath)) {
  // Use production build
  console.log('Starting production build...');
  const proc = spawn('node', ['--max-old-space-size=768', 'dist/main'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..'),
  });
  proc.on('exit', (code) => process.exit(code || 0));
} else {
  // Use development mode
  console.log('Starting development mode...');
  const proc = spawn('node', ['--max-old-space-size=512', 'node_modules/@nestjs/cli/bin/nest.js', 'start'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..'),
  });
  proc.on('exit', (code) => process.exit(code || 0));
}

