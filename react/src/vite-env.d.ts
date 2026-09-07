/// <reference types="vite/client" />

// VITE_API_URL é a única env var própria do projeto (ver
// services/constant/constants/api.constants.ts) - as demais usadas em
// import.meta.env (DEV/PROD/MODE/...) já vêm tipadas pela referência
// "vite/client" acima, sem precisar declarar aqui.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
