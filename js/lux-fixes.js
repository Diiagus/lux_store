/* LUX — corrección mínima de envío único
   No modifica mapa, carrusel ni configuradores.
*/
(function () {
  'use strict';

  const STORAGE_KEY = 'luxCart';
  const SHIPPING_ID = 'lux-envio-unico';

  function readCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(cart) ? cart : [];
    } catch (_) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function getShippingData(item) {
    const details = String(item?.details || '');
    const match = details.match(/Envío a domicilio:\s*\$([\d,.]+)/i);

    return {
      isHome:
        item?.deliveryMode === 'home' ||
        item?.deliveryMode === 'domicilio' ||
        Boolean(match),
      cost: Number(
        item?.shippingCost ||
        String(match?.[1] || '').replace(/,/g, '') ||
        0
      )
    };
  }

  function cleanDetails(details) {
    return String(details || '')
      .replace(/\s*·?\s*Envío a domicilio:\s*\$[\d,.]+(?:\s*MXN)?/gi, '')
      .replace(/\s*·\s*·/g, ' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .trim();
  }

  function migrateCart() {
    const cart = readCart();
    let changed = false;

    const migrated = cart
      .filter(item => item.id !== SHIPPING_ID)
      .map(item => {
        const shipping = getShippingData(item);

        if (!shipping.isHome || !shipping.cost || item.shippingSeparated) {
          return item;
        }

        const cleaned = cleanDetails(item.details);
        changed = true;

        return {
          ...item,
          unitPrice: Math.max(0, Number(item.unitPrice || 0) - shipping.cost),
          deliveryMode: 'home',
          shippingCost: shipping.cost,
          shippingSeparated: true,
          details:
            cleaned +
            (cleaned ? ' · ' : '') +
            'Envío a domicilio (cargo único por pedido)'
        };
      });

    if (changed || migrated.length !== cart.length) {
      writeCart(migrated);
    }
  }

  function getRequiredShipping(cart) {
    const costs = cart
      .filter(item => item.id !== SHIPPING_ID)
      .map(item => getShippingData(item))
      .filter(data => data.isHome && data.cost > 0)
      .map(data => data.cost);

    return costs.length ? Math.max(...costs) : 0;
  }

  function install() {
    if (!window.LuxCart || window.LuxCart.__singleShippingInstalled) return false;

    migrateCart();

    const originalAdd = window.LuxCart.add.bind(window.LuxCart);
    const originalRemove = window.LuxCart.removeFromCart.bind(window.LuxCart);

    function reconcileShipping() {
      const cart = readCart();
      const requiredCost = getRequiredShipping(cart);
      const current = cart.find(item => item.id === SHIPPING_ID);

      if (!requiredCost) {
        if (current) originalRemove(SHIPPING_ID);
        return;
      }

      if (current && Number(current.unitPrice) === requiredCost) return;

      if (current) originalRemove(SHIPPING_ID);

      originalAdd({
        id: SHIPPING_ID,
        name: 'Envío a domicilio',
        category: 'Entrega',
        unitPrice: requiredCost,
        qty: 1,
        image: '',
        details: 'Cargo único para todos los productos con envío a domicilio'
      });
    }

    window.LuxCart.add = function (incoming) {
      const item = { ...incoming };
      const shipping = getShippingData(item);

      if (shipping.isHome && shipping.cost && !item.shippingSeparated) {
        const cleaned = cleanDetails(item.details);

        item.unitPrice = Math.max(
          0,
          Number(item.unitPrice || 0) - shipping.cost
        );
        item.deliveryMode = 'home';
        item.shippingCost = shipping.cost;
        item.shippingSeparated = true;
        item.details =
          cleaned +
          (cleaned ? ' · ' : '') +
          'Envío a domicilio (cargo único por pedido)';
      }

      originalAdd(item);

      setTimeout(reconcileShipping, 0);
    };

    window.LuxCart.__singleShippingInstalled = true;

    document.addEventListener(
      'click',
      event => {
        if (!event.target.closest('[data-cart-action], .lux-cart-clear')) return;
        setTimeout(reconcileShipping, 100);
      },
      true
    );

    // Solo cambia la leyenda visible; no altera el cálculo ni el mapa.
    document.querySelectorAll('.delivery-option-sub').forEach(element => {
      if (/15\.50/i.test(element.textContent || '')) {
        element.textContent = '$15.50 por km';
      }
    });

    if (window.LuxQuote && typeof window.LuxQuote.open === 'function') {
      const originalOpen = window.LuxQuote.open.bind(window.LuxQuote);

      window.LuxQuote.open = function (config) {
        originalOpen(config);

        setTimeout(() => {
          document
            .querySelectorAll('.lux-quote-delivery-copy span')
            .forEach(element => {
              if (/15\.50/i.test(element.textContent || '')) {
                element.textContent = '$15.50 por km';
              }
            });
        }, 0);
      };
    }

    setTimeout(reconcileShipping, 100);
    return true;
  }

  function init() {
    if (install()) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;

      if (install() || attempts >= 20) {
        clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
