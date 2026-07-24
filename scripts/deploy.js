import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Read .env file to retrieve the Vercel token
const envPath = path.resolve(process.cwd(), '.env');
let token = process.env.VERCEL_TOKEN;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/^VERCEL_TOKEN=(.*)$/m);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error('Error: VERCEL_TOKEN not found in environment or .env file.');
  process.exit(1);
}

console.log('🚀 Iniciando compilación y despliegue en Vercel...');

// Execute the Vercel CLI production deployment
const vercel = spawn('npx', ['vercel', '--prod', '--yes', '--token', token], {
  stdio: 'inherit',
  shell: true
});

vercel.on('close', (code) => {
  if (code === 0) {
    console.log('🎉 Despliegue completado con éxito!');
  } else {
    console.error(`❌ El despliegue falló con código de salida ${code}`);
  }
  process.exit(code);
});
