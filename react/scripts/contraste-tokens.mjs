// Confere o contraste WCAG AA (4,5:1 para texto normal) dos pares de cor do
// sistema, direto dos tokens de src/assets/css/1-cores.css, nos dois temas.
// Uso: `npm run contraste`. Sai com código 1 se algum par medido ficar abaixo.
//
// Criado em 24-09-2026, depois de o Playwright medir 3,59:1 no botão verde e
// uma varredura achar mais 7 pares reprovados que ninguém tinha medido. Serve
// de guarda contra regressão: se alguém trocar um token e o par piorar, isto
// avisa em segundos, sem abrir navegador.
//
// Limites: só mede par de cor SÓLIDA (hex, rgb/rgba sobre o cartão, var()).
// Valor com color-mix() não é resolvido e aparece como "não medido". Não
// substitui olhar a tela nem uma auditoria com axe, que enxerga a cor final
// renderizada (herança, opacidade, gradiente).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pasta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/assets/css');
const ler = (nome) => fs.readFileSync(path.join(pasta, nome), 'utf8').replace(/\r\n/g, '\n');
const cores = ler('1-cores.css');
const tailwind = ler('tailwind-theme.css');

function variaveis(bloco) {
  // Tira os comentários ANTES: vários citam "--cor-x: ...;" no texto e seriam
  // lidos como se fossem o token.
  const semComentario = bloco.replace(/\/\*[\s\S]*?\*\//g, '');
  const mapa = {};
  for (const m of semComentario.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    mapa[m[1]] = m[2].trim();
  }
  return mapa;
}

// Fatia o texto entre um marcador e o próximo, pra pegar só o bloco de um tema.
function bloco(inicio, fim) {
  const i = cores.indexOf(inicio);
  if (i < 0) throw new Error(`bloco não encontrado: ${inicio}`);
  const j = fim ? cores.indexOf(fim, i + inicio.length) : cores.length;
  return cores.slice(i, j < 0 ? cores.length : j);
}

// Cores padrão do Tailwind que os tokens citam mas o tailwind-theme.css não declara
// (o Tailwind só as emite quando um utilitário as usa). Menor prioridade: se o
// projeto passar a declarar uma delas, a do projeto vence.
const TAILWIND_PADRAO = { '--color-white': '#ffffff', '--color-red-600': '#dc2626' };
const base = { ...TAILWIND_PADRAO, ...variaveis(tailwind), ...variaveis(bloco(':root {', ":root[data-tema='escuro']")) };
const claro = base;
const escuro = { ...base, ...variaveis(bloco(":root[data-tema='escuro']", '@media')) };

function resolver(tema, valor, profundidade = 0) {
  if (!valor || profundidade > 8) return null;
  const v = valor.trim();
  const ref = v.match(/^var\((--[a-z0-9-]+)\)$/);
  if (ref) return resolver(tema, tema[ref[1]], profundidade + 1);
  return v;
}

function paraRgb(texto, fundoBase) {
  if (!texto) return null;
  const hex = texto.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgba = texto.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgba) {
    const [r, g, b] = [rgba[1], rgba[2], rgba[3]].map(Number);
    const alfa = rgba[4] === undefined ? 1 : Number(rgba[4]);
    if (alfa >= 1 || !fundoBase) return [r, g, b];
    return [r, g, b].map((c, i) => Math.round(c * alfa + fundoBase[i] * (1 - alfa)));
  }
  return null;
}

const luz = ([r, g, b]) => {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};
const razao = (a, b) => {
  const [x, y] = [luz(a), luz(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// [texto, fundo]: nomes de token, ou um hex literal (ex.: branco).
const PARES = [
  ['--cor-texto', '--cor-fundo-cartao'],
  ['--cor-texto-forte', '--cor-fundo-cartao'],
  ['--cor-texto-fraco', '--cor-fundo-cartao'],
  ['--cor-texto-fraco', '--cor-fundo-sutil'],
  ['--cor-texto-marca', '--cor-fundo-cartao'],
  ['--cor-texto-sucesso', '--cor-fundo-sucesso'],
  ['--cor-texto-erro', '--cor-fundo-erro'],
  ['--cor-texto-erro-forte', '--cor-fundo-erro'],
  ['--cor-texto-aviso', '--cor-fundo-aviso'],
  ['--cor-texto-info', '--cor-fundo-info'],
  ['--cor-texto-sobre-cor', '--cor-fundo-marca-forte'],
  ['--cor-texto-sobre-cor', '--cor-fundo-sucesso-forte'],
  ['--cor-texto-sobre-cor', '--cor-fundo-erro-forte'],
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ['--cor-texto-sobre-cor', `--cor-avatar-${n}`]),
];

let falhas = 0;
let medidos = 0;
for (const [nomeTema, tema] of [['claro', claro], ['escuro', escuro]]) {
  const fundoCartao = paraRgb(resolver(tema, tema['--cor-fundo-cartao']));
  console.log(`\nTema ${nomeTema}`);
  for (const [t, f] of PARES) {
    const cor = (n) => paraRgb(resolver(tema, n.startsWith('#') ? n : tema[n]), fundoCartao);
    const rt = cor(t);
    const rf = cor(f);
    if (!rt || !rf) {
      console.log(`  não medido  ${t} / ${f}`);
      continue;
    }
    medidos += 1;
    const r = razao(rt, rf);
    const ok = r >= 4.5;
    if (!ok) falhas += 1;
    console.log(`  ${ok ? 'OK    ' : 'FALHA '} ${r.toFixed(2).padStart(5)}  ${t} / ${f}`);
  }
}
console.log(`\n${medidos} pares medidos, ${falhas} abaixo de 4,5:1.`);
process.exit(falhas ? 1 : 0);
