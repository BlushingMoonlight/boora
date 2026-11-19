# Instruções para o Claude neste repositório

**Tudo aqui é público.** Este repositório é o site do Boora no GitHub Pages, que no começo é o próprio app em HTML.

- Nada interno: nenhuma senha, token, chave, endereço de servidor que não seja público, nem dado de usuário.
- Documentos, decisões, Issues, n8n e SQL ficam no repositório privado `BlushingMoonlight/boora-sistema`. As regras de
  trabalho (PR em português, nunca na `main`, primeiro o fluxo e depois o design) estão no `CLAUDE.md` de lá.
- Toda entrega é um pull request em português. Nunca faça merge nem push direto na `main`.
- Issues não ficam aqui.
- Se um PR daqui depende de um PR do `boora-sistema`, a ordem do Merge vai escrita na descrição.

## Sistema de design (Fase 2)

- `assets/design/tokens.css` é a **única** fonte de cores, tamanhos de fonte, espaços, raios, sombras e tempos. Os
  outros arquivos só usam `var(--...)`.
- `assets/design/componentes.css` e a página `prototipo/componentes/` mostram cada componente em todos os estados.
- Antes de abrir um PR: `node scripts/verificar_design.mjs`. A Action "Verificar design" roda o mesmo em todo PR.
- Uma ação principal por tela (`.botao--principal`). O dia da semana vem de `data-data`, nunca escrito à mão.
- Protótipos em `prototipo/` com `<meta name="robots" content="noindex, nofollow">`, só com dados inventados.
