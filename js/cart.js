/* LUX CART — carrito global y solicitud de cotización */
(function () {
  'use strict';

  const STORAGE_KEY = 'luxCart';
  const WHATSAPP_NUMBER = '527771071589';
  const OLD_SHIPPING_IDS = ['lux-envio-unico', 'lux-shared-delivery'];
  let lastFocusedElement = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  function shippingInfo(item) {
    const details = String(item?.details || '');
    const match = details.match(/Envío a domicilio:\s*\$([\d,.]+)/i);
    const parsed = Number(String(match?.[1] || '').replace(/,/g, '')) || 0;

    return {
      isHome:
        item?.deliveryMode === 'home' ||
        item?.deliveryMode === 'domicilio' ||
        Boolean(match) ||
        Number(item?.shippingCost || 0) > 0,
      cost: Number(item?.shippingCost || parsed || 0)
    };
  }

  function cleanDeliveryText(details) {
    return String(details || '')
      .replace(
        /\s*·?\s*Envío a domicilio:\s*\$[\d,.]+(?:\s*MXN)?(?:\s*\(cargo único por pedido\))?/gi,
        ''
      )
      .replace(
        /(?:\s*·?\s*\(cargo único por pedido\))+/gi,
        ''
      )
      .replace(
        /(?:\s*·?\s*Envío incluido en el pedido)+/gi,
        ''
      )
      .replace(/\s*·\s*·/g, ' · ')
      .replace(/^\s*·\s*|\s*·\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function normaliseCart(input) {
    const cart = (Array.isArray(input) ? input : [])
      .filter(item => !OLD_SHIPPING_IDS.includes(item?.id))
      .map(item => {
        const copy = { ...item };
        copy.details = cleanDeliveryText(copy.details);
        return copy;
      });

    const homeItems = [];

    cart.forEach(item => {
      const info = shippingInfo(item);
      const previousIncluded =
        item.shippingIncluded === true ||
        (!item.shippingSeparated && info.cost > 0);

      let baseUnitPrice = Number(item.baseUnitPrice);

      if (!Number.isFinite(baseUnitPrice)) {
        baseUnitPrice = Number(item.unitPrice || 0);

        if (info.isHome && info.cost && previousIncluded) {
          baseUnitPrice = Math.max(0, baseUnitPrice - info.cost);
        }
      }

      item.baseUnitPrice = baseUnitPrice;
      item.unitPrice = baseUnitPrice;

      if (info.isHome) {
        item.deliveryMode = 'home';
        item.shippingCost = info.cost;
        homeItems.push(item);
      } else {
        item.shippingCost = 0;
        item.shippingIncluded = false;
      }
    });

    const sharedCost = homeItems.reduce(
      (highest, item) => Math.max(highest, Number(item.shippingCost || 0)),
      0
    );

    homeItems.forEach((item, index) => {
      const clean = cleanDeliveryText(item.details);

      item.shippingCost = sharedCost;
      item.shippingIncluded = index === 0 && sharedCost > 0;
      item.shippingSeparated = true;

      if (item.shippingIncluded) {
        item.details = [
          clean,
          `Envío a domicilio: $${sharedCost.toLocaleString('es-MX')} (cargo único por pedido)`
        ].filter(Boolean).join(' · ');
      } else {
        item.details = [
          clean,
          'Envío incluido en el pedido'
        ].filter(Boolean).join(' · ');
      }
    });

    return cart;
  }

  function productSubtotal(item) {
    const quantity = Math.max(1, Number(item.qty || 1));
    const base = Number(item.baseUnitPrice ?? item.unitPrice ?? 0);
    const shipping = item.shippingIncluded
      ? Number(item.shippingCost || 0)
      : 0;

    return base * quantity + shipping;
  }

  function getCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const normalised = normaliseCart(Array.isArray(raw) ? raw : []);

      if (JSON.stringify(raw || []) !== JSON.stringify(normalised)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
      }

      return normalised;
    } catch (_) {
      return [];
    }
  }

  function saveCart(cart) {
    const normalised = normaliseCart(cart);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
    renderBadge();
  }

  function getCount() {
    return getCart().reduce((total, item) => total + Number(item.qty || 0), 0);
  }

  function getTotal() {
    return getCart().reduce((total, item) => {
      return total + productSubtotal(item);
    }, 0);
  }

  function addToCart(item) {
    if (!item || !item.id || !item.name) return;

    const cart = getCart();
    const quantity = Math.max(1, Number(item.qty || 1));
    const incoming = { ...item, qty: quantity };
    const existing = cart.find(product => product.id === incoming.id);

    if (existing) {
      existing.qty = Number(existing.qty || 0) + quantity;
    } else {
      cart.push(incoming);
    }

    saveCart(cart);
    renderModal();
    openModal();
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(item => item.id !== id));
    renderModal();
  }

  function updateQty(id, qty) {
    const cart = getCart();
    const item = cart.find(product => product.id === id);
    if (!item) return;

    item.qty = Math.max(1, Number(qty || 1));
    saveCart(cart);
    renderModal();
  }

  function clearCart() {
    saveCart([]);
    renderModal();
  }

  function renderBadge() {
    const count = getCount();

    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function openModal() {
    const overlay = document.getElementById('lux-cart-overlay');
    if (!overlay) return;

    lastFocusedElement = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = '';
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.lux-cart-close')?.focus();
  }

  function closeModal() {
    const overlay = document.getElementById('lux-cart-overlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function itemMarkup(item) {
    const id = encodeURIComponent(item.id);
    const quantity = Math.max(1, Number(item.qty || 1));
    const subtotal = productSubtotal(item);
    const image = String(item.image || '').replace(/["'()\\]/g, '\\$&');

    return `
      <article class="lux-cart-item" data-cart-id="${id}">
        <div class="lux-cart-item-img" style="background-image:url('${image}')" aria-hidden="true"></div>
        <div class="lux-cart-item-info">
          <p class="lux-cart-item-cat">${escapeHtml(item.category)}</p>
          <p class="lux-cart-item-name">${escapeHtml(item.name)}</p>
          <p class="lux-cart-item-details">${escapeHtml(item.details || '')}</p>
          <div class="lux-cart-item-row">
            <div class="lux-qty-control" aria-label="Cantidad de ${escapeHtml(item.name)}">
              <button type="button" data-cart-action="decrease" aria-label="Reducir cantidad">−</button>
              <span>${quantity}</span>
              <button type="button" data-cart-action="increase" aria-label="Aumentar cantidad">+</button>
            </div>
            <span class="lux-cart-item-price">$${subtotal.toLocaleString('es-MX')} <small>MXN</small></span>
          </div>
        </div>
        <button type="button" class="lux-cart-item-remove" data-cart-action="remove" aria-label="Eliminar ${escapeHtml(item.name)}">×</button>
      </article>`;
  }

  function renderModal() {
    const body = document.getElementById('lux-cart-body');
    const footer = document.getElementById('lux-cart-footer');
    if (!body || !footer) return;

    const cart = getCart();

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="lux-cart-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
          <p>Tu cotización está vacía</p>
          <span>Agrega los productos que deseas cotizar</span>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    body.innerHTML = cart.map(itemMarkup).join('');
    footer.style.display = 'block';

    document.getElementById('lux-cart-total').innerHTML =
      `$${getTotal().toLocaleString('es-MX')} <span>MXN</span>`;
  }

  function checkout() {
    const cart = getCart();
    if (cart.length === 0) return;

    let message = '¡Hola! Quiero solicitar una cotización en Lux Concept Store MX 🛒\n\n';

    cart.forEach((item, index) => {
      const quantity = Number(item.qty || 1);
      const subtotal = productSubtotal(item);

      message += `${index + 1}. ${item.name} (x${quantity})\n`;
      if (item.details) message += `   ${item.details}\n`;
      message += `   Subtotal estimado: $${subtotal.toLocaleString('es-MX')} MXN\n\n`;
    });

    message += `TOTAL ESTIMADO: $${getTotal().toLocaleString('es-MX')} MXN\n\n`;
    message += 'Quedo al pendiente de confirmar disponibilidad, entrega, instalación y forma de pago. ¡Gracias!';

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const quoteWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (quoteWindow) quoteWindow.opener = null;
  }

  function ensureMobileNavigation() {
    const mobileMenu = document.getElementById('mobile-menu');
    const actions = document.querySelector('.nav-actions');
    if (!mobileMenu || !actions || document.getElementById('hamburger')) return;

    const button = document.createElement('button');
    button.className = 'nav-hamburger';
    button.id = 'hamburger';
    button.type = 'button';
    button.setAttribute('aria-label', 'Abrir menú');
    button.setAttribute('aria-controls', 'mobile-menu');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span></span><span></span><span></span>';

    actions.appendChild(button);

    const setOpen = open => {
      mobileMenu.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };

    button.addEventListener('click', () => {
      setOpen(!mobileMenu.classList.contains('open'));
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function injectMarkup() {
    if (document.getElementById('lux-cart-overlay')) return;

    const style = document.createElement('style');
    style.textContent = `
      .nav-icon{position:relative}.csw{width:100%!important}
      .cart-badge{position:absolute;top:-2px;right:-2px;display:none;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 3px;border-radius:50%;background:#ff3b30;color:#fff;font:600 10px -apple-system,sans-serif}
      #lux-cart-overlay{position:fixed;inset:0;z-index:2000;display:none;justify-content:flex-end;background:rgba(0,0,0,.4)}#lux-cart-overlay.open{display:flex}
      .lux-cart-panel{width:420px;max-width:92vw;height:100%;display:flex;flex-direction:column;background:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
      .lux-cart-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #f0f0f0}.lux-cart-head h3{margin:0;font-size:18px}
      .lux-cart-close,.lux-cart-item-remove{border:0;background:none;cursor:pointer}.lux-cart-close{width:32px;height:32px;border-radius:50%;font-size:22px;color:#6e6e73}.lux-cart-close:hover{background:#f5f5f7}
      #lux-cart-body{flex:1;overflow:auto;padding:12px 22px}.lux-cart-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:#6e6e73}.lux-cart-empty p{margin:8px 0 0;color:#1d1d1f;font-weight:600}.lux-cart-empty span{font-size:13px}
      .lux-cart-item{position:relative;display:flex;gap:12px;padding:16px 0;border-bottom:1px solid #f5f5f7}.lux-cart-item-img{width:64px;height:64px;flex:none;border-radius:12px;background:#f5f5f7 center/contain no-repeat}.lux-cart-item-info{flex:1;min-width:0}.lux-cart-item-cat{margin:0 0 2px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6e6e73}.lux-cart-item-name{margin:0 24px 3px 0;font-size:14px;font-weight:600}.lux-cart-item-details{margin:0 0 8px;font-size:11px;line-height:1.4;color:#6e6e73}.lux-cart-item-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.lux-qty-control{display:flex;align-items:center;gap:10px;padding:3px 10px;border:1px solid #e8e8e8;border-radius:999px}.lux-qty-control button{width:18px;height:18px;border:0;background:none;cursor:pointer}.lux-qty-control span{min-width:14px;text-align:center;font-size:13px}.lux-cart-item-price{font-size:14px;font-weight:600}.lux-cart-item-price small{font-size:10px;color:#6e6e73;font-weight:400}.lux-cart-item-remove{position:absolute;top:14px;right:0;color:#c8c8cc;font-size:20px}.lux-cart-item-remove:hover{color:#ff3b30}
      #lux-cart-footer{display:none;padding:18px 22px 22px;border-top:1px solid #f0f0f0}.lux-cart-total-row{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px}.lux-cart-total-label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6e6e73}#lux-cart-total{font-size:24px;font-weight:600}#lux-cart-total span{font-size:13px;color:#6e6e73;font-weight:400}
      .lux-cart-checkout-btn{width:100%;padding:15px;border:0;border-radius:999px;background:#25d366;color:#fff;font:600 15px -apple-system,sans-serif;cursor:pointer}.lux-cart-checkout-btn:hover{background:#1eb858}.lux-cart-disclaimer{margin:10px 0 0;text-align:center;color:#86868b;font-size:11px;line-height:1.45}.lux-cart-clear{width:100%;margin-top:10px;border:0;background:none;color:#6e6e73;font-size:12px;cursor:pointer}.lux-cart-clear:hover{color:#ff3b30}
    `;

    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'lux-cart-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'lux-cart-title');
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="lux-cart-panel">
        <header class="lux-cart-head">
          <h3 id="lux-cart-title">Tu cotización</h3>
          <button type="button" class="lux-cart-close" aria-label="Cerrar cotización">×</button>
        </header>
        <div id="lux-cart-body"></div>
        <footer id="lux-cart-footer">
          <div class="lux-cart-total-row">
            <span class="lux-cart-total-label">Total estimado</span>
            <span id="lux-cart-total">$0 <span>MXN</span></span>
          </div>
          <button type="button" class="lux-cart-checkout-btn">Solicitar cotización por WhatsApp</button>
          <p class="lux-cart-disclaimer">El total es estimado y está sujeto a disponibilidad, entrega e instalación.</p>
          <button type="button" class="lux-cart-clear">Vaciar cotización</button>
        </footer>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('.lux-cart-close').addEventListener('click', closeModal);
    overlay.querySelector('.lux-cart-checkout-btn').addEventListener('click', checkout);
    overlay.querySelector('.lux-cart-clear').addEventListener('click', clearCart);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeModal();
    });

    overlay.addEventListener('click', event => {
      const action = event.target.closest('[data-cart-action]');
      const item = event.target.closest('[data-cart-id]');
      if (!action || !item) return;

      const id = decodeURIComponent(item.dataset.cartId);
      const cartItem = getCart().find(product => product.id === id);
      if (!cartItem) return;

      if (action.dataset.cartAction === 'remove') removeFromCart(id);
      if (action.dataset.cartAction === 'decrease') {
        updateQty(id, Number(cartItem.qty) - 1);
      }
      if (action.dataset.cartAction === 'increase') {
        updateQty(id, Number(cartItem.qty) + 1);
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) {
        closeModal();
      }
    });
  }

  function wireCartIcons() {
    document.querySelectorAll('.nav-icon[aria-label="Carrito"]').forEach(icon => {
      let badge = icon.querySelector('.cart-badge');

      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge';
        badge.setAttribute('aria-hidden', 'true');
        icon.appendChild(badge);
      }

      icon.setAttribute('aria-haspopup', 'dialog');

      icon.addEventListener('click', event => {
        event.preventDefault();
        renderModal();
        openModal();
      });
    });
  }

  function init() {
    ensureMobileNavigation();
    injectMarkup();
    wireCartIcons();
    renderBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LuxCart = {
    add: addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    openModal,
    closeModal,
    checkout,
    getCart,
    getTotal
  };
})();
