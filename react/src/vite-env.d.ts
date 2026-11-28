/// <reference types="vite/client" />

// As env vars próprias do projeto: VITE_API_URL (services/constant/constants/api.constants.ts) e
// VITE_GOOGLE_CLIENT_ID (components/auth/botao-google.tsx). As demais usadas em import.meta.env (DEV/PROD/MODE/...) já
// vêm tipadas pela referência "vite/client" acima.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  // "true" no serviço do site no Render: publica só o Guia de Estilo (services/router/campo-testes-opcional.ts).
  readonly VITE_MOSTRAR_GUIA_ESTILO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
