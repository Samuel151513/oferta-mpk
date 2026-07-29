// ── Repasse de parâmetros para o checkout ─────────────────────────────────
// Pega TODOS os parâmetros da URL atual e os anexa a todos os links que
// apontam para o checkout. Assim a venda feita no checkout externo consegue
// ser atribuída de volta ao anúncio/pixel.
(function () {
  var CHECKOUT_HOST = 'checkout.checkoutin.com';

  // Monta o conjunto de parâmetros a repassar: TODOS os que estão na URL atual.
  function collectParams() {
    var out = {};
    new URLSearchParams(location.search).forEach(function (value, key) {
      if (key) out[key] = value;
    });
    return out;
  }

  var params = collectParams();

  // A Vega só propaga UTMs até o upsell, então empacotamos TODOS os parâmetros
  // do Kwai dentro das UTMs. No upsell o processo inverso reconstrói os
  // parâmetros originais na URL antes do pixel carregar.
  //   click_id   -> utm_source + sck
  //   CampaignID -> utm_campaign
  //   adSETID    -> utm_medium
  //   CreativeID -> utm_content
  //   pixel_id   -> utm_term
  if (params.click_id) {
    // Padrão de UTM do Kwai: utm_source=__AD__ (ID do anúncio). Antes de
    // sobrescrever com o click_id, preserva o ID do anúncio em utm_content.
    if (params.utm_source && /^\d+$/.test(params.utm_source) && !params.utm_content && !params.CreativeID) {
      params.utm_content = params.utm_source;
    }
    params.utm_source = params.click_id;
    params.sck = params.click_id;
  }
  if (params.CampaignID) params.utm_campaign = params.CampaignID;
  if (params.adSETID)    params.utm_medium   = params.adSETID;
  if (params.CreativeID) params.utm_content  = params.CreativeID;
  if (params.pixel_id)   params.utm_term     = params.pixel_id;

  function isCheckoutLink(href) {
    return typeof href === 'string' && href.indexOf(CHECKOUT_HOST) !== -1;
  }

  // Anexa os parâmetros a uma URL de checkout, sem sobrescrever o que já existir lá.
  function withParams(href) {
    try {
      var url = new URL(href, location.href);
      Object.keys(params).forEach(function (key) {
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, params[key]);
        }
      });
      return url.href;
    } catch (e) {
      return href;
    }
  }

  function patchLink(a) {
    if (!a || !a.getAttribute) return;
    if (a.dataset.ckParamsDone === '1') return;
    var href = a.getAttribute('href');
    if (!isCheckoutLink(href)) return;
    a.setAttribute('href', withParams(href));
    a.dataset.ckParamsDone = '1';
  }

  function patchAll(root) {
    (root || document).querySelectorAll('a[href*="' + CHECKOUT_HOST + '"]').forEach(patchLink);
  }

  // Se não há nenhum parâmetro pra repassar, não precisa fazer nada.
  if (Object.keys(params).length === 0) return;

  function init() {
    patchAll(document);

    // O modal de tamanho (main.js) cria o link do checkout dinamicamente,
    // então observamos o DOM e corrigimos os links assim que aparecerem.
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return; // só elementos
          if (node.matches && node.matches('a[href*="' + CHECKOUT_HOST + '"]')) {
            patchLink(node);
          }
          if (node.querySelectorAll) patchAll(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
