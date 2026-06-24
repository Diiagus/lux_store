/* LUX FIXES — carrusel, geocodificación y envío compartido */
(function () {
  'use strict';

  const CART_KEY = 'luxCart';
  const SHARED_SHIPPING_ID = 'lux-shared-delivery';

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  if (nativeFetch) {
    window.fetch = function (input, options) {
      let rawUrl = typeof input === 'string' ? input : input && input.url;

      if (!rawUrl || !rawUrl.includes('nominatim.openstreetmap.org/search')) {
        return nativeFetch(input, options);
      }

      try {
        const url = new URL(rawUrl, window.location.href);
        let query = (url.searchParams.get('q') || '').trim();

        query = query
          .replace(/,\s*Puebla,\s*M[eé]xico\s*$/i, '')
          .replace(/,\s*M[eé]xico\s*$/i, '')
          .trim();

        if (!/puebla/i.test(query)) query += ', Puebla de Zaragoza, Puebla, México';
        else if (!/m[eé]xico/i.test(query)) query += ', México';

        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', '5');
        url.searchParams.set('countrycodes', 'mx');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('accept-language', 'es');
        url.searchParams.set('viewbox', '-98.65,19.35,-97.75,18.75');
        url.searchParams.set('bounded', '1');

        return nativeFetch(url.toString(), options).then(async response => {
          if (!response.ok) return response;

          const results = await response.clone().json();
          const scored = Array.isArray(results)
            ? results.map(item => {
                const address = item.address || {};
                const text = [
                  item.display_name,
                  address.city,
                  address.town,
                  address.municipality,
                  address.county,
                  address.state
                ].filter(Boolean).join(' ').toLowerCase();

                let score = Number(item.importance || 0);
                if (text.includes('puebla')) score += 20;
                if (text.includes('puebla de zaragoza')) score += 30;
                if (address.road) score += 8;
                if (address.house_number) score += 12;
                if (address.suburb || address.neighbourhood) score += 5;
                return { item, score };
              }).sort((a, b) => b.score - a.score).map(row => row.item)
            : results;

          return new Response(JSON.stringify(scored), {
            status: response.status,
            statusText: response.statusText,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        });
      } catch (_) {
        return nativeFetch(input, options);
      }
    };
  }

  function cleanDeliveryLabels(root = document) {
    root.querySelectorAll('.delivery-option-sub, .lux-quote-delivery-copy span').forEach(el => {
      if (/15\.50/i.test(el.textContent || '')) el.textContent = '$15.50 por km';
    });

    root.querySelectorAll('#km-result, #lux-quote-result').forEach(el => {
      if (!el) return;
      el.innerHTML = el.innerHTML
        .replace(/\s*\(ida y vuelta\)/gi, '')
        .replace(/\s*ida y vuelta/gi, '');
    });
  }

  function readCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(cart) ? cart : [];
    } catch (_) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function parseMoney(value) {
    return Number(String(value || '').replace(/[^\d.]/g, '')) || 0;
  }

  function extractHomeDelivery(item) {
    const details = String(item.details || '');
    const match = details.match(/Envío a domicilio:\s*\$([\d,.]+)/i);
    const cost = Number(item.shippingCost || parseMoney(match && match[1]));
    const addressMatch = details.match(/Destino:\s*([^·]+)/i);

    return {
      isHome: item.deliveryMode === 'home' || item.deliveryMode === 'domicilio' || Boolean(match),
      cost,
      address: item.deliveryAddress || (addressMatch ? addressMatch[1].trim() : '')
    };
  }

  function removeDeliveryText(details) {
    return String(details || '')
      .replace(/\s*·?\s*Envío a domicilio:\s*\$[\d,.]+(?:\s*MXN)?/gi, '')
      .replace(/\s*·?\s*Envío a domicilio\s*\(cargo único[^)]*\)/gi, '')
      .replace(/\s*·\s*·/g, ' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .trim();
  }

  function migrateExistingCart() {
    const cart = readCart();
    let changed = false;

    const migrated = cart.filter(item => item.id !== SHARED_SHIPPING_ID).map(item => {
      const delivery = extractHomeDelivery(item);
      if (!delivery.isHome || !delivery.cost || item.shippingSeparated) return item;

      const copy = { ...item };
      copy.unitPrice = Math.max(0, Number(copy.unitPrice || 0) - delivery.cost);
      copy.deliveryMode = 'home';
      copy.shippingCost = delivery.cost;
      copy.deliveryAddress = delivery.address;
      copy.shippingSeparated = true;
      const cleaned = removeDeliveryText(copy.details);
      copy.details = cleaned + (cleaned ? ' · ' : '') + 'Envío a domicilio (cargo único por pedido)';
      changed = true;
      return copy;
    });

    if (changed || migrated.length !== cart.length) writeCart(migrated);
    return migrated;
  }

  function getHomeItems(cart) {
    return cart.filter(item =>
      item.id !== SHARED_SHIPPING_ID &&
      extractHomeDelivery(item).isHome
    );
  }

  function shippingSummary(cart) {
    const homeItems = getHomeItems(cart);
    if (!homeItems.length) return null;

    const costs = homeItems
      .map(item => Number(item.shippingCost || extractHomeDelivery(item).cost || 0))
      .filter(Boolean);

    const addresses = homeItems
      .map(item => item.deliveryAddress || extractHomeDelivery(item).address)
      .filter(Boolean);

    return {
      cost: costs.length ? Math.max(...costs) : 0,
      address: addresses[addresses.length - 1] || ''
    };
  }

  function syncSharedShipping(originalAdd, originalRemove) {
    const cart = readCart();
    const summary = shippingSummary(cart);
    const existing = cart.find(item => item.id === SHARED_SHIPPING_ID);

    if (!summary || !summary.cost) {
      if (existing) originalRemove(SHARED_SHIPPING_ID);
      return;
    }

    const desired = {
      id: SHARED_SHIPPING_ID,
      name: 'Envío a domicilio',
      category: 'Entrega',
      unitPrice: summary.cost,
      qty: 1,
      image: '',
      details: summary.address
        ? `Un solo envío para todos los productos · Destino: ${summary.address}`
        : 'Un solo envío para todos los productos',
      isSharedShipping: true
    };

    if (existing &&
        Number(existing.unitPrice) === desired.unitPrice &&
        existing.details === desired.details &&
        Number(existing.qty) === 1) return;

    if (existing) originalRemove(SHARED_SHIPPING_ID);
    originalAdd(desired);
  }

  function installCartShippingFix() {
    if (!window.LuxCart || window.LuxCart.__sharedShippingInstalled) return false;

    migrateExistingCart();

    const originalAdd = window.LuxCart.add.bind(window.LuxCart);
    const originalRemove = window.LuxCart.removeFromCart.bind(window.LuxCart);

    window.LuxCart.add = function (incoming) {
      const item = { ...incoming };
      const delivery = extractHomeDelivery(item);

      if (delivery.isHome && delivery.cost && !item.shippingSeparated) {
        item.unitPrice = Math.max(0, Number(item.unitPrice || 0) - delivery.cost);
        item.deliveryMode = 'home';
        item.shippingCost = delivery.cost;
        item.deliveryAddress = delivery.address;
        item.shippingSeparated = true;

        const cleaned = removeDeliveryText(item.details);
        item.details = cleaned + (cleaned ? ' · ' : '') + 'Envío a domicilio (cargo único por pedido)';
      }

      originalAdd(item);
      setTimeout(() => syncSharedShipping(originalAdd, originalRemove), 0);
    };

    window.LuxCart.hasHomeDelivery = function () {
      return getHomeItems(readCart()).length > 0;
    };

    window.LuxCart.getHomeDelivery = function () {
      return shippingSummary(readCart());
    };

    window.LuxCart.__sharedShippingInstalled = true;

    document.addEventListener('click', event => {
      if (!event.target.closest('[data-cart-action]')) return;
      setTimeout(() => syncSharedShipping(originalAdd, originalRemove), 80);
    }, true);

    const style = document.createElement('style');
    style.textContent = `
      .lux-cart-item[data-cart-id="${SHARED_SHIPPING_ID}"] .lux-qty-control,
      .lux-cart-item[data-cart-id="${SHARED_SHIPPING_ID}"] .lux-cart-item-remove{
        display:none!important;
      }
      .lux-cart-item[data-cart-id="${SHARED_SHIPPING_ID}"] .lux-cart-item-img{
        background-image:none!important;
        position:relative;
      }
      .lux-cart-item[data-cart-id="${SHARED_SHIPPING_ID}"] .lux-cart-item-img::after{
        content:"↗";
        position:absolute;
        inset:0;
        display:grid;
        place-items:center;
        color:#8fa9be;
        font-size:24px;
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => syncSharedShipping(originalAdd, originalRemove), 100);
    return true;
  }

  function installContinuousCarousel() {
    const track = document.getElementById('lux-category-track');
    if (!track || track.dataset.luxContinuous === '1') return;

    track.dataset.luxContinuous = '1';
    const originalCards = Array.from(track.children);
    if (originalCards.length < 2) return;

    const style = document.createElement('style');
    style.textContent = `
      #lux-category-track{
        display:flex!important;
        gap:18px!important;
        overflow-x:auto!important;
        scroll-behavior:auto!important;
        scrollbar-width:none!important;
      }
      #lux-category-track::-webkit-scrollbar{display:none!important}
      #lux-category-track .lux-category-card{
        flex:0 0 250px!important;
        min-width:250px!important;
      }
      @media(max-width:700px){
        #lux-category-track .lux-category-card{
          flex-basis:76vw!important;
          min-width:76vw!important;
          max-width:310px!important;
        }
      }
    `;
    document.head.appendChild(style);

    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });

    let pausedUntil = 0;
    let lastTime = performance.now();
    let firstSetWidth = 0;

    function calculateWidth() {
      const gap = parseFloat(getComputedStyle(track).gap) || 18;
      firstSetWidth = originalCards.reduce(
        (sum, card) => sum + card.getBoundingClientRect().width + gap,
        0
      );
    }

    function pause(ms = 4500) {
      pausedUntil = performance.now() + ms;
    }

    function frame(now) {
      const delta = Math.min(40, now - lastTime);
      lastTime = now;

      if (now >= pausedUntil && firstSetWidth > 0) {
        track.scrollLeft += delta * 0.025;
        if (track.scrollLeft >= firstSetWidth) track.scrollLeft -= firstSetWidth;
      }

      requestAnimationFrame(frame);
    }

    const previous = document.getElementById('lux-carousel-prev');
    const next = document.getElementById('lux-carousel-next');

    previous?.addEventListener('click', () => {
      pause();
      track.scrollBy({ left: -268, behavior: 'smooth' });
    });

    next?.addEventListener('click', () => {
      pause();
      track.scrollBy({ left: 268, behavior: 'smooth' });
    });

    track.addEventListener('pointerdown', () => pause(), { passive: true });
    track.addEventListener('touchstart', () => pause(), { passive: true });
    track.addEventListener('wheel', () => pause(), { passive: true });

    calculateWidth();
    window.addEventListener('resize', calculateWidth);
    requestAnimationFrame(frame);
  }

  function observeDeliveryText() {
    cleanDeliveryLabels();

    const observer = new MutationObserver(() => {
      cleanDeliveryLabels();

      const shared = window.LuxCart?.getHomeDelivery?.();
      const quoteResult = document.getElementById('lux-quote-result');

      if (shared && quoteResult?.classList.contains('visible') &&
          !quoteResult.textContent.includes('un solo cargo')) {
        quoteResult.insertAdjacentHTML(
          'beforeend',
          '<br><small>El carrito aplicará un solo cargo de envío para todos los productos con el mismo destino.</small>'
        );
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  function init() {
    installCartShippingFix();
    installContinuousCarousel();
    observeDeliveryText();

    const retry = setInterval(() => {
      installCartShippingFix();
      installContinuousCarousel();
      if (window.LuxCart && document.readyState === 'complete') clearInterval(retry);
    }, 250);

    setTimeout(() => clearInterval(retry), 6000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
