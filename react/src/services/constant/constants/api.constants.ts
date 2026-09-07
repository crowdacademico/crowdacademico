// http://localhost:3000 é o default do backend (tutorial-rodar-projeto.md,
// PORT no .env do nest/). VITE_API_URL vem de react/.env (sem segredo
// nenhum - só a URL - por isso commitado normal, sem virar .env.local).
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
