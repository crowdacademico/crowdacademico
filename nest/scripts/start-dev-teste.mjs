// Modo rápido (npm run start:dev:teste): o Nest de desenvolvimento com o provedor de pagamento de TESTE
// (PAYMENT_PROVIDER=fake), sem mexer no nest/.env. Tudo da T5 (bancada de pagamento) funciona sem túnel e sem abrir o
// Asaas. A variável de ambiente vale mais que a do .env (padrão do @nestjs/config); o resto do .env continua valendo.
import { spawn } from 'node:child_process';

const nest = spawn('npx nest start --watch', {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, PAYMENT_PROVIDER: 'fake' },
});
nest.on('exit', (codigo) => process.exit(codigo ?? 0));
