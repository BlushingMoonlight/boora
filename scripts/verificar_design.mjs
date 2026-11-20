#!/usr/bin/env node
// Boora — verificar_design.mjs (DEC-039, DEC-048).
// Confere o sistema de design e as telas do protótipo. Sai com código 1 se achar um erro.
//
// Como rodar (na raiz do repositório boora):
//   node scripts/verificar_design.mjs            → tudo (a parte das páginas precisa do Playwright)
//   node scripts/verificar_design.mjs --estatico → só a parte estática (sem navegador)
//
// O que bloqueia:
//   1. cor, tamanho de fonte, espaço, raio, sombra ou tempo escritos fora de assets/design/tokens.css;
//   2. contraste abaixo de 4,5:1 nos pares de texto (3:1 nas bordas), em claro e escuro (os pares ficam no tokens.css);
//   3. alvo de toque menor que 44 × 44 px (nas páginas, em 390, 820 e 1024 px);
//   4. texto abaixo de 12 px (nas páginas);
//   5. página que rola para o lado (390, 820 e 1024 px);
//   6. mais de um botão principal visível na mesma tela (DEC-048), fora da página de componentes;
//   7. dia da semana escrito à mão no HTML, ou diferente da data em data-data (DEC-048);
//   8. palavra proibida (regulacao.md, seção 8, e voz.md, no boora-sistema): também culpa e gênero para a pessoa;
//   9. emoji no texto das telas (DEC-050).
//
// A fonte da regra fica aqui, no boora. O boora-sistema guarda uma cópia em scripts/ (DEC-039).
// Fica de fora: prototipo/direcoes/ (o registro da etapa 1, com as três direções, inclusive as que não foram escolhidas).

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = process.cwd();
const SO_ESTATICO = process.argv.includes('--estatico');
const IGNORAR = [/^prototipo\/direcoes\//, /^node_modules\//, /^\.git\//];
const erros = [];
const avisos = [];
const erro = (onde, msg) => erros.push(`${onde}: ${msg}`);

function listar(dir, ext) {
  const out = [];
  const andar = (d) => {
    for (const e of fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })) {
      const rel = path.posix.join(d, e.name);
      if (IGNORAR.some((r) => r.test(rel + (e.isDirectory() ? '/' : '')))) continue;
      if (e.isDirectory()) andar(rel);
      else if (ext.some((x) => e.name.endsWith(x))) out.push(rel);
    }
  };
  if (fs.existsSync(path.join(RAIZ, dir))) andar(dir);
  return out;
}

// ---------- 1. Valores fora dos tokens ----------
const TOKENS = 'assets/design/tokens.css';
const COR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklch|oklab)\(/;
const PROPS_ESPACO = /^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)/;
const VALOR_LIVRE = /^(0|auto|none|inherit|initial|unset|100%|50%|-?var\(--[a-z0-9-]+\)|calc\(.*var\(--.*\)|max\(.*var\(--.*\)|min\(.*var\(--.*\)|env\(.*\))$/;

function semComentarios(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

// Separa um valor em partes, respeitando parênteses: "0 calc(var(--a) * -1) var(--b)" → 3 partes.
function partes(valor) {
  const out = []; let atual = ''; let nivel = 0;
  for (const ch of valor) {
    if (ch === '(') nivel++;
    if (ch === ')') nivel--;
    if (/\s/.test(ch) && nivel === 0) { if (atual) out.push(atual); atual = ''; } else atual += ch;
  }
  if (atual) out.push(atual);
  return out;
}
const SO_TOKEN = (p) => p === '0' || /^var\(--[a-z0-9-]+\)$/.test(p) || (/^(calc|max|min)\(/.test(p) && /var\(--/.test(p) && !/\d+(px|rem|em)\b/.test(p.replace(/var\([^)]*\)/g, '')));
// Sombra interna como borda: "inset" + 4 medidas só de tokens + uma cor de token.
const SOMBRA_OK = (v) => {
  if (/^(none|var\(--[a-z0-9-]+\))$/.test(v)) return true;
  const p = partes(v);
  return p.length === 6 && p[0] === 'inset' && p.slice(1, 5).every(SO_TOKEN) && /^var\(--cor-[a-z0-9-]+\)$/.test(p[5]);
};

function conferirCss(arq) {
  const css = semComentarios(fs.readFileSync(path.join(RAIZ, arq), 'utf8'));
  const decls = css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)(?=[;}])/g);
  for (const [, prop, bruto] of decls) {
    const valor = bruto.trim().replace(/\s*!important$/, '');
    if (prop.startsWith('--')) continue;
    if (COR.test(valor)) erro(arq, `cor escrita fora dos tokens: "${prop}: ${valor}"`);
    if (prop === 'font-size' && !/^(var\(--|inherit$|100%$|calc\(.*var\(--)/.test(valor)) erro(arq, `tamanho de fonte fora dos tokens: "${valor}"`);
    if (prop === 'font-family' && !/^(var\(--|inherit$)/.test(valor)) erro(arq, `fonte fora dos tokens: "${valor}"`);
    if (prop === 'border-radius' && !partes(valor).every((v) => VALOR_LIVRE.test(v) || SO_TOKEN(v))) erro(arq, `raio fora dos tokens: "${valor}"`);
    if (prop === 'box-shadow' && !SOMBRA_OK(valor)) erro(arq, `sombra fora dos tokens: "${valor}"`);
    if (/^(transition|animation)(-duration)?$/.test(prop) && /\b\d+(\.\d+)?m?s\b/.test(valor.replace(/var\([^)]*\)/g, ''))) erro(arq, `tempo escrito fora dos tokens: "${valor}"`);
    if (PROPS_ESPACO.test(prop)) {
      for (const p of partes(valor)) if (!(VALOR_LIVRE.test(p) || SO_TOKEN(p))) erro(arq, `espaço fora dos tokens: "${prop}: ${valor}"`);
    }
  }
}

for (const arq of listar('.', ['.css'])) if (arq !== TOKENS) conferirCss(arq);

// Estilo escrito no próprio HTML também não pode ter cor nem tamanho.
for (const arq of listar('.', ['.html'])) {
  const html = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
  for (const [, est] of html.matchAll(/style="([^"]*)"/g)) {
    if (COR.test(est)) erro(arq, `cor no atributo style: "${est}"`);
    if (/font-size\s*:\s*\d/.test(est)) erro(arq, `tamanho de fonte no atributo style: "${est}"`);
  }
  if (/<style[\s>]/.test(html)) erro(arq, 'bloco <style> no HTML: os estilos ficam nos arquivos .css');
}

// ---------- 2. Contraste dos pares dos tokens ----------
function lerTokens() {
  const css = fs.readFileSync(path.join(RAIZ, TOKENS), 'utf8');
  const bloco = (re) => { const m = css.match(re); return m ? Object.fromEntries([...m[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((x) => [x[1], x[2]])) : {}; };
  const claro = bloco(/^:root \{([\s\S]*?)\n\}/m);
  const escuro = { ...claro, ...bloco(/:root\[data-tema="escuro"\] \{([\s\S]*?)\n\}/) };
  const pares = [...css.matchAll(/@contraste(3?)\s+([a-z0-9-]+)\s*\/\s*([a-z0-9-]+)/g)].map((m) => ({ min: m[1] ? 3 : 4.5, a: m[2], b: m[3] }));
  return { claro, escuro, pares };
}
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const razao = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
{
  const { claro, escuro, pares } = lerTokens();
  if (!pares.length) erro(TOKENS, 'nenhum par @contraste declarado');
  for (const [nome, t] of [['claro', claro], ['escuro', escuro]]) {
    for (const { a, b, min } of pares) {
      if (!t[a] || !t[b]) { erro(TOKENS, `par @contraste com token que não existe: ${a} / ${b}`); continue; }
      const r = razao(t[a], t[b]);
      if (r < min) erro(TOKENS, `contraste ${r.toFixed(2)}:1 (${nome}) em ${a} sobre ${b}; mínimo ${min}:1`);
    }
  }
}

// ---------- 7 e 8. Texto do HTML: dia da semana à mão e palavras proibidas ----------
const PROIBIDAS = [
  [/personal\s+trainer/i, '"personal trainer" (use "Dani" ou "a IA")'],
  [/\btreinador(a)?\b/i, '"treinador"'],
  [/\bdieta\b/i, '"dieta" (use "registro de refeições", "metas")'],
  [/\bprescri(ção|cao|ções|coes|ver|to|ta)\b/i, '"prescrição"'],
  [/plano\s+alimentar/i, '"plano alimentar"'],
  [/\bcard[aá]pio\b/i, '"cardápio"'],
  [/nutricionista\s+virtual/i, '"nutricionista virtual"'],
  [/\bperca\s+\d+\s*(kg|quilos)/i, 'promessa de resultado ("perca X kg")'],
  [/\b(emagre[cç]a|seque)\s+\d+/i, 'promessa de resultado'],
  [/\bgarantid[oa]s?\b|\bgarante\b/i, '"garantido" (promessa)'],
  [/antes\s+e\s+depois/i, '"antes e depois"'],
  [/\bcorpo dos sonhos\b|\bbarriga\b|\bgordurinha|\bpneuzinho|projeto ver[aã]o/i, 'fala do corpo como defeito'],
  // Da voz (boora-sistema, docs/design/voz.md, DEC-049):
  [/\bpersonal\b/i, '"personal" (a IA é a Dani)'],
  [/voc[eê] (falhou|furou)|perdeu a sequ[eê]ncia|quebrou a sequ[eê]ncia|treino perdido/i, 'culpa ("você falhou", "perdeu a sequência")'],
  [/\bbem-vind[oa]s?\b|\b\p{L}+\((a|as|o|os)\)/iu, 'gênero para a pessoa ("bem-vindo", "cansado(a)"): escreva sem gênero'],
];
// Emoji (DEC-050). Fora: ©, ® e ™, que são texto, e as setas simples.
const EMOJI = /(?![\u00A9\u00AE\u2122\u2194-\u2199])\p{Extended_Pictographic}/u;
const DIAS = /\b(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(-feira)?,\s*\d/i;
function textoVisivel(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<template[\s\S]*?<\/template>/gi, (t) => t.replace(/<[^>]+>/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
}
for (const arq of listar('prototipo', ['.html'])) {
  const html = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
  const txt = textoVisivel(html);
  for (const [re, nome] of PROIBIDAS) if (re.test(txt)) erro(arq, `palavra proibida: ${nome}`);
  const emoji = txt.match(EMOJI);
  if (emoji) erro(arq, `emoji "${emoji[0]}" (DEC-050: sem emoji, nunca)`);
  if (DIAS.test(txt)) erro(arq, 'dia da semana escrito à mão: use <span data-data="AAAA-MM-DD"></span> (DEC-048)');
}

// ---------- 3 a 7. As páginas, no navegador ----------
async function conferirPaginas() {
  let chromium;
  try { chromium = createRequire(import.meta.url)('playwright').chromium; }
  catch { try { chromium = createRequire(path.join(RAIZ, 'package.json'))('playwright').chromium; } catch { chromium = null; } }
  if (!chromium) { avisos.push('Playwright não encontrado: a parte das páginas (alvo, texto, rolagem, botão principal) não rodou.'); return; }
  const paginas = listar('prototipo', ['.html']);
  if (!paginas.length) return;
  const servidor = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    const tipo = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': tipo }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => servidor.listen(0, r));
  const porta = servidor.address().port;
  const nav = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  for (const arq of paginas) {
    for (const largura of [390, 820, 1024]) {
      for (const tema of ['light', 'dark']) {
        const ctx = await nav.newContext({ viewport: { width: largura, height: 900 }, colorScheme: tema });
        const pg = await ctx.newPage();
        await pg.goto(`http://localhost:${porta}/${arq}`, { waitUntil: 'load' });
        await pg.evaluate(() => document.fonts.ready);
        const r = await pg.evaluate(() => {
          const visivel = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0 && !el.closest('[hidden],[aria-hidden="true"],template'); };
          const sel = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="link"], summary';
          const pequenos = [];
          for (const el of document.querySelectorAll(sel)) {
            if (!visivel(el) || el.closest('[data-verificar-ignorar]')) continue;
            const alvo = el.closest('label') || el; const r0 = alvo.getBoundingClientRect(); // tamanho do layout, sem a escala do toque
            const b = { width: alvo.offsetWidth || r0.width, height: alvo.offsetHeight || r0.height };
            if (b.width < 44 - 0.5 || b.height < 44 - 0.5) pequenos.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30)}" ${Math.round(b.width)}×${Math.round(b.height)}`);
          }
          const miudos = [];
          const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (andar.nextNode()) {
            const n = andar.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement;
            if (!el || !visivel(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs < 12) miudos.push(`"${n.textContent.trim().slice(0, 30)}" ${fs}px`);
          }
          const componentes = document.documentElement.dataset.pagina === 'componentes';
          const principais = [...document.querySelectorAll('.botao--principal')].filter(visivel).length;
          const datas = [];
          for (const el of document.querySelectorAll('[data-data]')) {
            const d = new Date(el.dataset.data + 'T12:00:00');
            const dia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d).replace('-feira', '');
            if (!el.textContent.toLowerCase().startsWith(dia.toLowerCase())) datas.push(`${el.dataset.data}: "${el.textContent.trim()}" (devia começar por ${dia})`);
          }
          return { rola: document.documentElement.scrollWidth > innerWidth, pequenos, miudos, principais, componentes, datas };
        });
        const onde = `${arq} (${largura} px, ${tema === 'dark' ? 'escuro' : 'claro'})`;
        if (r.rola) erro(onde, 'rola para o lado');
        for (const p of r.pequenos) erro(onde, `alvo menor que 44 px: ${p}`);
        for (const m of r.miudos.slice(0, 5)) erro(onde, `texto abaixo de 12 px: ${m}`);
        if (!r.componentes && r.principais > 1) erro(onde, `${r.principais} botões principais visíveis; a regra é um por tela (DEC-048)`);
        for (const d of r.datas) erro(onde, `dia da semana errado: ${d}`);
        await ctx.close();
      }
    }
  }
  await nav.close(); servidor.close();
}

if (!SO_ESTATICO) await conferirPaginas();

const unicos = [...new Set(erros)];
for (const a of avisos) console.log(`⚠️  ${a}`);
if (unicos.length) {
  console.log(`❌ ${unicos.length} problema(s) de design:`);
  for (const e of unicos) console.log(`   - ${e}`);
  process.exit(1);
}
console.log('✅ Design conferido: tokens, contraste, alvos, texto, rolagem, botão principal, datas e palavras.');
