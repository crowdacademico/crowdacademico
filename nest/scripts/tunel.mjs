// Túnel de desenvolvimento (npm run tunel): publica o Nest local no endereço fixo do ngrok, para o provedor de
// pagamento (sandbox) alcançar o webhook e a validação de saque. Lê NGROK_AUTHTOKEN, NGROK_DOMAIN e PORT do nest/.env.
// Só para desenvolvimento: em produção o sistema tem endereço próprio e nenhum túnel.
import { readFileSync } from 'node:fs';
import ngrok from '@ngrok/ngrok';

function lerEnv(caminho) {
  const valores = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha);
    if (m) valores[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return valores;
}

const env = { ...lerEnv(new URL('../.env', import.meta.url)), ...process.env };
const porta = Number(env.PORT) || 3000;

if (!env.NGROK_AUTHTOKEN || !env.NGROK_DOMAIN) {
  console.error(
    'Faltam NGROK_AUTHTOKEN e/ou NGROK_DOMAIN no nest/.env (tutorial de pagamento, Parte 6B).',
  );
  process.exit(1);
}

try {
  const tunel = await ngrok.forward({
    addr: porta,
    authtoken: env.NGROK_AUTHTOKEN,
    domain: env.NGROK_DOMAIN,
  });
  const base = tunel.url();
  console.log(`Túnel aberto: ${base} -> http://localhost:${porta}`);
  console.log('Endereços para o Asaas (fixos, cadastrar uma vez só):');
  console.log(`  Webhook:             ${base}/pagamento/webhook/asaas`);
  console.log(`  Validação de saque:  ${base}/pagamento/webhook/asaas/autorizacao-saque`);
  console.log(`Teste no navegador:    ${base}/health`);
  console.log('Deixe este terminal aberto. Ctrl+C fecha o túnel.');
} catch (erro) {
  console.error(`Não foi possível abrir o túnel: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
}

// O túnel vive enquanto o processo estiver aberto.
setInterval(() => {}, 1 << 30);
