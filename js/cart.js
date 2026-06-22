/* ================================================
   LUX CART — Carrito de compras global
   Funciona en TODAS las páginas con solo agregar:
   <script src="../js/cart.js"></script> (o "js/cart.js" en index.html)

   Guarda el carrito en localStorage, así que persiste
   aunque el cliente cierre el navegador y vuelva después.
   ================================================ */

(function () {
  const STORAGE_KEY = 'luxCart';
  const WHATSAPP_NUMBER = '527771071589';

  // ── Detecta si estamos en /pages/ o en la raíz, para armar rutas ──
  const inPages = window.location.pathname.includes('/pages/');
  const ROOT = inPages ? '../' : '';

  // ════════════════════════════════════════
  // ESTADO DEL CARRITO
  // ════════════════════════════════════════
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderBadge();
  }

  function addToCart(item) {
    const cart = getCart();
    // item necesita: id, name, category, unitPrice, qty, image, details
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      cart.push(Object.assign({ qty: 1 }, item));
    }
    saveCart(cart);
    openModal();
    renderModal();
  }

  function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    renderModal();
  }

  function updateQty(id, qty) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
      item.qty = Math.max(1, qty);
      saveCart(cart);
      renderModal();
    }
  }

  function getTotal() {
    return getCart().reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  }

  function getCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }

  function clearCart() {
    saveCart([]);
    renderModal();
  }

  // ════════════════════════════════════════
  // BADGE (número rojo sobre el ícono de carrito)
  // ════════════════════════════════════════
  function renderBadge() {
    const count = getCount();
    document.querySelectorAll('.cart-badge').forEach(b => {
      if (count > 0) {
        b.textContent = count;
        b.style.display = 'flex';
      } else {
        b.style.display = 'none';
      }
    });
  }

  // ════════════════════════════════════════
  // MODAL DEL CARRITO
  // ════════════════════════════════════════
  function openModal() {
    document.getElementById('lux-cart-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('lux-cart-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderModal() {
    const cart = getCart();
    const body = document.getElementById('lux-cart-body');
    const footer = document.getElementById('lux-cart-footer');

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="lux-cart-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p>Tu carrito está vacío</p>
          <span>Explora el catálogo y agrega tus muebles favoritos</span>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    body.innerHTML = cart.map(item => `
      <div class="lux-cart-item">
        <div class="lux-cart-item-img" style="background-image:url('${item.image}')"></div>
        <div class="lux-cart-item-info">
          <p class="lux-cart-item-cat">${item.category}</p>
          <p class="lux-cart-item-name">${item.name}</p>
          <p class="lux-cart-item-details">${item.details || ''}</p>
          <div class="lux-cart-item-row">
            <div class="lux-qty-control">
              <button onclick="LuxCart.updateQty('${item.id}', ${item.qty - 1})">−</button>
              <span>${item.qty}</span>
              <button onclick="LuxCart.updateQty('${item.id}', ${item.qty + 1})">+</button>
            </div>
            <span class="lux-cart-item-price">$${(item.unitPrice * item.qty).toLocaleString()} <small>MXN</small></span>
          </div>
        </div>
        <button class="lux-cart-item-remove" onclick="LuxCart.removeFromCart('${item.id}')" aria-label="Eliminar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `).join('');

    document.getElementById('lux-cart-total').innerHTML =
      '$' + getTotal().toLocaleString() + ' <span>MXN</span>';
  }

  // ════════════════════════════════════════
  // CHECKOUT POR WHATSAPP
  // ════════════════════════════════════════
  function checkout() {
    const cart = getCart();
    if (cart.length === 0) return;

    let msg = '¡Hola! Quiero hacer un pedido en Lux Concept Store MX 🛒\n\n';
    cart.forEach((item, i) => {
      msg += `${i + 1}. ${item.name} (x${item.qty})\n`;
      if (item.details) msg += `   ${item.details}\n`;
      msg += `   Subtotal: $${(item.unitPrice * item.qty).toLocaleString()} MXN\n\n`;
    });
    msg += `TOTAL: $${getTotal().toLocaleString()} MXN\n\n`;
    msg += 'Quedo al pendiente de los datos de pago. ¡Gracias!';

    const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  }

  // ════════════════════════════════════════
  // INYECTAR HTML + CSS DEL MODAL
  // ════════════════════════════════════════
  function injectMarkup() {
    const style = document.createElement('style');
    style.textContent = `
      .cart-badge {
        position: absolute; top: -2px; right: -2px;
        background: #ff3b30; color: #fff;
        font-size: 10px; font-weight: 600;
        min-width: 16px; height: 16px;
        border-radius: 50%;
        display: none; align-items: center; justify-content: center;
        padding: 0 3px;
        font-family: -apple-system, sans-serif;
      }
      .nav-icon { position: relative; }

      #lux-cart-overlay {
        position: fixed; inset: 0; z-index: 2000;
        background: rgba(0,0,0,0.4);
        display: none; align-items: stretch; justify-content: flex-end;
        opacity: 0; transition: opacity .25s ease;
      }
      #lux-cart-overlay.open { display: flex; opacity: 1; }
      .lux-cart-panel {
        background: #fff; width: 420px; max-width: 92vw; height: 100%;
        display: flex; flex-direction: column;
        transform: translateX(100%); transition: transform .3s cubic-bezier(.4,0,.2,1);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      #lux-cart-overlay.open .lux-cart-panel { transform: translateX(0); }
      .lux-cart-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 22px; border-bottom: 1px solid #f0f0f0;
      }
      .lux-cart-head h3 { font-size: 18px; font-weight: 600; color: #1d1d1f; }
      .lux-cart-close {
        background: none; border: none; cursor: pointer; color: #6e6e73;
        width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        transition: background .15s;
      }
      .lux-cart-close:hover { background: #f5f5f7; }
      #lux-cart-body { flex: 1; overflow-y: auto; padding: 12px 22px; }
      .lux-cart-empty {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        height: 100%; color: #6e6e73; text-align: center; gap: 8px;
      }
      .lux-cart-empty p { font-size: 15px; font-weight: 500; color: #1d1d1f; margin-top: 8px; }
      .lux-cart-empty span { font-size: 13px; }
      .lux-cart-item {
        display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid #f5f5f7;
        position: relative;
      }
      .lux-cart-item-img {
        width: 64px; height: 64px; border-radius: 12px; background-color: #f5f5f7;
        background-size: contain; background-position: center; background-repeat: no-repeat;
        flex-shrink: 0;
      }
      .lux-cart-item-info { flex: 1; min-width: 0; }
      .lux-cart-item-cat { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #6e6e73; margin-bottom: 2px; }
      .lux-cart-item-name { font-size: 14px; font-weight: 600; color: #1d1d1f; margin-bottom: 3px; line-height: 1.3; }
      .lux-cart-item-details { font-size: 11px; color: #6e6e73; margin-bottom: 8px; line-height: 1.4; }
      .lux-cart-item-row { display: flex; align-items: center; justify-content: space-between; }
      .lux-qty-control {
        display: flex; align-items: center; gap: 10px;
        border: 1px solid #e8e8e8; border-radius: 980px; padding: 3px 10px;
      }
      .lux-qty-control button {
        background: none; border: none; cursor: pointer; font-size: 14px; color: #1d1d1f;
        width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
      }
      .lux-qty-control span { font-size: 13px; font-weight: 500; min-width: 14px; text-align: center; }
      .lux-cart-item-price { font-size: 14px; font-weight: 600; color: #1d1d1f; }
      .lux-cart-item-price small { font-size: 10px; color: #6e6e73; font-weight: 400; }
      .lux-cart-item-remove {
        position: absolute; top: 14px; right: 0;
        background: none; border: none; cursor: pointer; color: #c8c8cc;
        transition: color .15s;
      }
      .lux-cart-item-remove:hover { color: #ff3b30; }
      #lux-cart-footer {
        padding: 18px 22px 22px; border-top: 1px solid #f0f0f0; display: none;
      }
      .lux-cart-total-row {
        display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px;
      }
      .lux-cart-total-label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #6e6e73; }
      #lux-cart-total { font-size: 24px; font-weight: 600; color: #1d1d1f; }
      #lux-cart-total span { font-size: 13px; color: #6e6e73; font-weight: 400; }
      .lux-cart-checkout-btn {
        width: 100%; padding: 15px; background: #25D366; color: #fff; border: none;
        border-radius: 980px; font-size: 15px; font-weight: 600; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: background .2s; font-family: -apple-system, sans-serif;
      }
      .lux-cart-checkout-btn:hover { background: #1eb858; }
      .lux-cart-clear {
        display: block; text-align: center; width: 100%; margin-top: 10px;
        background: none; border: none; color: #6e6e73; font-size: 12px; cursor: pointer;
        font-family: -apple-system, sans-serif;
      }
      .lux-cart-clear:hover { color: #ff3b30; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'lux-cart-overlay';
    overlay.innerHTML = `
      <div class="lux-cart-panel">
        <div class="lux-cart-head">
          <h3>Tu carrito</h3>
          <button class="lux-cart-close" onclick="LuxCart.closeModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div id="lux-cart-body"></div>
        <div id="lux-cart-footer">
          <div class="lux-cart-total-row">
            <span class="lux-cart-total-label">Total</span>
            <span id="lux-cart-total">$0 <span>MXN</span></span>
          </div>
          <button class="lux-cart-checkout-btn" onclick="LuxCart.checkout()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.3A8.7 8.7 0 0 0 12 4a8.8 8.8 0 0 0-7.6 13.3L3 21l3.8-1.3A8.8 8.8 0 0 0 12 20.8 8.8 8.8 0 0 0 17.6 6.3zM12 19.2a7.2 7.2 0 0 1-3.7-1l-.3-.2-2.8 1 .9-2.7-.2-.3A7.2 7.2 0 1 1 19.2 12 7.3 7.3 0 0 1 12 19.2z"/></svg>
            Finalizar pedido por WhatsApp
          </button>
          <button class="lux-cart-clear" onclick="LuxCart.clearCart()">Vaciar carrito</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  function wireCartIcons() {
    document.querySelectorAll('.nav-icon[aria-label="Carrito"]').forEach(icon => {
      const badge = document.createElement('span');
      badge.className = 'cart-badge';
      icon.appendChild(badge);
      icon.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
        renderModal();
      });
    });
  }

  // ════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════
  function init() {
    injectMarkup();
    wireCartIcons();
    renderBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── API pública ──
  window.LuxCart = {
    add: addToCart,
    removeFromCart: removeFromCart,
    updateQty: updateQty,
    clearCart: clearCart,
    openModal: openModal,
    closeModal: closeModal,
    checkout: checkout,
    getCart: getCart,
    getTotal: getTotal
  };
})();
