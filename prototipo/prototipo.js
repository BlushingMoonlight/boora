/*
  Boora — o comportamento que só existe no protótipo (para navegar entre as telas sem servidor).
  O app de verdade faz isso no servidor (Fase 3). Dados inventados.

  1. ?perfil=adolescente: o caminho de 14 a 17 anos. Os links seguem com o parâmetro; um link com
     data-adolescente="pagina.html" troca de destino; [data-texto-adolescente] e [data-valor-adolescente] trocam o texto;
     [data-esconde-adolescente] some; [data-marca-adolescente] marca a opção; a barra dos passos conta 14.
  2. data-avancar="pagina.html" num grupo de opções: escolher já avança (escolha única, entrada.md).
  3. data-precisa="id" num botão: ele só liga quando o campo (ou a caixa) com esse id estiver preenchido.
     data-precisa-algum="nome": liga quando alguma caixa com esse name estiver marcada.
  4. data-triagem num grupo: com alguma situação marcada, o botão principal vira "Continuar" e vai para data-cuidado.
  5. data-codigo-vai="pagina.html" num campo de código: avança sozinho no 6º número.
  6. Link com aria-disabled="true" não navega.
*/
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var adolescente = params.get('perfil') === 'adolescente';

  function comPerfil(href) {
    if (!adolescente || !href || /^(#|https?:|mailto:|tel:)/.test(href) || href.indexOf('perfil=') !== -1) return href;
    var partes = href.split('#');
    var base = partes[0] + (partes[0].indexOf('?') === -1 ? '?' : '&') + 'perfil=adolescente';
    return partes.length > 1 ? base + '#' + partes[1] : base;
  }
  function destino(el, href) {
    if (adolescente && el.dataset.adolescente) href = el.dataset.adolescente;
    return comPerfil(href);
  }

  // 1. Caminho de 14 a 17
  if (adolescente) {
    document.querySelectorAll('a[href]').forEach(function (a) { a.setAttribute('href', destino(a, a.getAttribute('href'))); });
    document.querySelectorAll('[data-texto-adolescente]').forEach(function (el) { el.textContent = el.dataset.textoAdolescente; });
    document.querySelectorAll('[data-valor-adolescente]').forEach(function (el) { el.value = el.dataset.valorAdolescente; });
    document.querySelectorAll('[data-esconde-adolescente]').forEach(function (el) { el.hidden = true; });
    document.querySelectorAll('[data-marca-adolescente] input').forEach(function (el) { el.checked = true; });
    // De 14 a 17, o começo tem um passo a mais (o e-mail do responsável)
    document.querySelectorAll('[data-passo]').forEach(function (el) {
      var n = Number(el.dataset.passo), total = 14;
      el.querySelector('.progresso').setAttribute('aria-label', 'Passo ' + n + ' de ' + total);
      el.querySelector('.progresso__feito').style.width = Math.round(n / total * 100) + '%';
      el.querySelector('.passo__numero').textContent = n + ' de ' + total;
    });
  }
  function ir(el, href) { location.href = destino(el, href); }

  // 2. Escolher já avança
  document.querySelectorAll('[data-avancar]').forEach(function (grupo) {
    grupo.addEventListener('change', function () { setTimeout(function () { ir(grupo, grupo.dataset.avancar); }, 150); });
  });

  // 3. O botão só liga com o campo preenchido
  function ligar(botao, ligado) {
    if (ligado) { botao.removeAttribute('aria-disabled'); } else { botao.setAttribute('aria-disabled', 'true'); }
  }
  document.querySelectorAll('[data-precisa]').forEach(function (botao) {
    var campo = document.getElementById(botao.dataset.precisa);
    if (!campo) return;
    var conferir = function () { ligar(botao, campo.type === 'checkbox' ? campo.checked : campo.value.trim() !== ''); };
    campo.addEventListener('input', conferir); campo.addEventListener('change', conferir); conferir();
  });
  document.querySelectorAll('[data-precisa-algum]').forEach(function (botao) {
    var caixas = document.querySelectorAll('input[name="' + botao.dataset.precisaAlgum + '"]');
    var conferir = function () { ligar(botao, Array.prototype.some.call(caixas, function (c) { return c.checked; })); };
    caixas.forEach(function (c) { c.addEventListener('change', conferir); }); conferir();
  });

  // 4. A triagem
  document.querySelectorAll('[data-triagem]').forEach(function (grupo) {
    var botao = document.getElementById(grupo.dataset.triagem);
    if (!botao) return;
    var original = { texto: botao.textContent, href: botao.getAttribute('href') };
    grupo.addEventListener('change', function () {
      var algum = grupo.querySelector('input:checked');
      botao.textContent = algum ? 'Continuar' : original.texto;
      botao.setAttribute('href', algum ? comPerfil(grupo.dataset.cuidado) : original.href);
    });
  });

  // 5. O código avança sozinho no 6º número
  document.querySelectorAll('[data-codigo-vai]').forEach(function (campo) {
    campo.addEventListener('input', function () {
      campo.value = campo.value.replace(/\D/g, '').slice(0, 6);
      if (campo.value.length === 6) ir(campo, campo.dataset.codigoVai);
    });
  });

  // 6. Desligado não navega
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[aria-disabled="true"]');
    if (a) e.preventDefault();
  });
})();
