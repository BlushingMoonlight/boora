/*
  Boora — o pouco de comportamento comum a todas as telas do protótipo.
  1. Dia da semana gerado a partir da data (DEC-048): <span data-data="2026-11-19"></span> vira "Quinta, 19 de novembro".
     Data de outro ano mostra o ano: "Quarta, 12 de novembro de 2025". O ano de referência é o "hoje" da tela
     (<html data-hoje="AAAA-MM-DD">); sem ele, o dia de hoje do aparelho.
  2. Tema (DEC-044): segue o aparelho; "Claro" ou "Escuro" ficam guardados neste aparelho (Você › Aparência).
  3. "~650 kcal": tocar mostra a faixa (DEC-019).
*/
(function () {
  'use strict';

  // 1. Datas
  function textoDoDia(iso, comAno) {
    var d = new Date(iso + 'T12:00:00');
    var dia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d).replace('-feira', '');
    var resto = new Intl.DateTimeFormat('pt-BR', comAno ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }).format(d);
    return dia.charAt(0).toUpperCase() + dia.slice(1) + ', ' + resto;
  }
  var hoje = document.documentElement.dataset.hoje || new Date().toISOString().slice(0, 10);
  var anoHoje = hoje.slice(0, 4);
  document.querySelectorAll('[data-data]').forEach(function (el) {
    var outroAno = el.dataset.data.slice(0, 4) !== anoHoje;
    el.textContent = textoDoDia(el.dataset.data, el.hasAttribute('data-com-ano') || outroAno);
  });

  // 2. Tema
  var raiz = document.documentElement;
  var CHAVE = 'boora-tema';
  function aplicar(tema) {
    if (tema === 'claro' || tema === 'escuro') raiz.setAttribute('data-tema', tema); else raiz.removeAttribute('data-tema');
    document.querySelectorAll('[data-escolher-tema]').forEach(function (b) {
      var marcado = b.dataset.escolherTema === (tema || 'aparelho');
      if (b.type === 'radio') b.checked = marcado; else b.setAttribute('aria-pressed', String(marcado));
    });
  }
  var guardado = null;
  try { guardado = localStorage.getItem(CHAVE); } catch (e) { guardado = null; }
  var pedido = new URLSearchParams(location.search).get('tema'); // usado nas capturas
  aplicar(pedido || guardado || 'aparelho');
  document.querySelectorAll('[data-escolher-tema]').forEach(function (b) {
    b.addEventListener(b.type === 'radio' ? 'change' : 'click', function () {
      var t = b.dataset.escolherTema;
      try { if (t === 'aparelho') localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, t); } catch (e) { /* sem armazenamento: vale só agora */ }
      aplicar(t);
    });
  });

  // 3. "~650 kcal" com a faixa ao tocar
  document.querySelectorAll('.aprox').forEach(function (b) {
    b.addEventListener('click', function () {
      var aberto = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!aberto));
      var faixa = document.getElementById(b.getAttribute('aria-controls'));
      if (faixa) faixa.hidden = aberto;
    });
  });
})();
