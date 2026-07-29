/**
 * pass-product.js — injeta nome, imagem, preço e params do produto na URL do checkout.
 * Funciona com todos os layouts de produto (swiper, galeria custom, href direto, onclick).
 */
(function () {
  'use strict';

  /* ── Extrai nome do produto ─────────────────────────────────────── */
  function getProdutNome() {
    return document.title
      .replace(/\s*[-–—|]\s*(shopee|loja\s+oficial|loja).*$/i, '')
      .trim();
  }

  /* ── Extrai preço do produto ────────────────────────────────────── */
  function getProdutPreco() {
    // Seletores em ordem de prioridade
    var priceSelectors = [
      '#priceNow',                          // alexa, jbl, som-alok, airpods…
      '[id*="price"][id*="now" i]',         // variações de id
      '[id*="preco" i]',
      '.text-\\[22px\\].font-extrabold',    // span com classe Tailwind JIT
      '.text-2xl.font-bold',               // tv, galaxys25, iphone15…
      '.text-3xl.font-bold',
      '.text-2xl.font-extrabold',
      '.text-xl.font-bold',
    ];

    for (var i = 0; i < priceSelectors.length; i++) {
      var el;
      try { el = document.querySelector(priceSelectors[i]); } catch(e) { continue; }
      if (!el) continue;

      // Pega apenas os text nodes (ignora SVG/spans internos)
      var text = '';
      el.childNodes.forEach(function (node) {
        if (node.nodeType === 3) text += node.nodeValue; // TEXT_NODE
      });
      text = text.trim();

      // Valida que contém R$ e um número real (não 0,00)
      if (/R\$\s*[\d]/.test(text) && !/R\$\s*0[,.]00/.test(text)) {
        // Retorna apenas o número: "48,27"
        return text.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.').trim();
      }
    }

    // Fallback: procura qualquer elemento visível com R$ + valor > 0
    var all = document.querySelectorAll('p, span, div');
    for (var j = 0; j < all.length; j++) {
      var node = all[j];
      // só text nodes diretos
      var raw = '';
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) raw += n.nodeValue;
      });
      raw = raw.trim();
      if (/^R\$\s*\d/.test(raw) && !/R\$\s*0[,.]00/.test(raw) && !/[Ee]conomize/.test(raw)) {
        return raw.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.').trim();
      }
    }

    return '';
  }

  /* ── Extrai preço original (riscado) ────────────────────────────── */
  function getProdutPrecoOriginal() {
    var selectors = [
      '#priceOld',
      '[id*="price"][id*="old" i]',
      '.line-through',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el;
      try { el = document.querySelector(selectors[i]); } catch(e) { continue; }
      if (!el) continue;
      var text = el.textContent.trim();
      if (/R\$\s*[\d]/.test(text) && !/R\$\s*0[,.]00/.test(text)) {
        return text.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.').trim();
      }
    }
    return '';
  }

  /* ── Extrai URL da imagem principal ────────────────────────────── */
  function getProdutImg() {
    var selectors = [
      '.swiper-wrapper:not([class*="thumb"]) .swiper-slide:first-child img',
      '.swiper-wrapper .swiper-slide:first-child img',
      '#slides .basis-full:first-child img',
      '#slides img',
      'img[loading="eager"]',
      'img[src*="imagem-1"]',
      'img[src*="principal"]',
      'img[alt*="vista frontal"]',
    ];
    var skip = ['logo', 'seta', 'ticket', 'icon', 'store', 'entrega', 'truck', 'chat', 'shopee'];
    for (var i = 0; i < selectors.length; i++) {
      var el;
      try { el = document.querySelector(selectors[i]); } catch(e) { continue; }
      if (!el || !el.src) continue;
      var src = el.src.toLowerCase();
      var blocked = skip.some(function (s) { return src.includes(s); });
      if (!blocked) return el.src;
    }
    return '';
  }

  /* ── Constrói URL de checkout com todos os dados ────────────────── */
  function buildCheckoutUrl(baseUrl) {
    var nome     = getProdutNome();
    var preco    = getProdutPreco();
    var original = getProdutPrecoOriginal();
    var img      = getProdutImg();

    var a = document.createElement('a');
    a.href = baseUrl.replace(/\?([^?]*)\?/, '?$1&'); // corrige double ? gerado por url + window.location.search
    var url = new URL(a.href);

    if (nome)     url.searchParams.set('produto',  nome);
    if (preco)    url.searchParams.set('preco',    preco);
    if (original) url.searchParams.set('original', original);
    if (img)      url.searchParams.set('img',      img);

    // Repassa UTMs e demais params da página atual
    var pageParams = new URLSearchParams(window.location.search);
    pageParams.forEach(function (v, k) {
      if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    });

    return url.toString();
  }

  /* ── Função global para uso em onclick ─────────────────────────── */
  window.__ir = function (baseUrl) {
    window.location.href = buildCheckoutUrl(baseUrl);
  };

  /* ── Intercepta cliques em <a> que apontam para o checkout ─────── */
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute('href') || '';
    if (!href.includes('checkout')) return;
    e.preventDefault();
    e.stopPropagation();
    window.location.href = buildCheckoutUrl(href);
  }, true);

  /* ── Override de goToCheckout (modal de cores/variantes) ────────── */
  window.addEventListener('load', function () {
    if (typeof window.goToCheckout === 'function') {
      window.goToCheckout = function () {
        var variant = window.selectedVariant;
        if (!variant || !variant.checkout) return;
        window.__ir(variant.checkout);
      };
    }

    ['btn-comprar', 'btn-add', 'btnBuy'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function (e) {
        var href = el.getAttribute('href') || el.dataset.href || '';
        if (!href.includes('checkout')) return;
        e.preventDefault();
        e.stopPropagation();
        window.__ir(href);
      }, true);
    });
  });
})();
