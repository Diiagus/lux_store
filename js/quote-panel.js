/* Lux Concept — configurador reutilizable de producto */
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '527771071589';
  const FACTORY = [19.0827, -98.2697];
  const STORE = [19.0414, -98.2063];
  const RATE = 15.50;

  const COLORS = [
    {name:'Blanco Frosty',hex:'#F4F4F2'},{name:'Blanco',hex:'#F8F8F5'},{name:'Gris',hex:'#737070'},
    {name:'Oxford',hex:'#5A5A58'},{name:'Castaña',hex:'#9A8860'},{name:'Negro',hex:'#1A1A18'},
    {name:'Modena',hex:'#D4A870'},{name:'Duna',hex:'#A87848'},{name:'Avellana',hex:'#C8A878'},
    {name:'Lisboa',hex:'#B09878'},{name:'Rosa Morada',hex:'#987060'},{name:'Nogal Albura',hex:'#6A4030'},
    {name:'Tabaco',hex:'#282018'},{name:'Cedro',hex:'#B06040'},{name:'Nogal',hex:'#6A4828'},
    {name:'Parota',hex:'#9A7048'},{name:'Tzalam',hex:'#C87840'},{name:'Wengue',hex:'#201408'},
    {name:'Polar',hex:'#E8E5DC'}
  ];

  let state = {
    config: null,
    color: null,
    assembly: false,
    delivery: 'factory',
    deliveryCost: 0,
    address: '',
    map: null,
    marker: null,
    lastFocus: null,
    inheritedHomeDelivery: false,
    inheritedShippingCost: 0,
    inheritedAddress: ''
  };


  function getExistingHomeDelivery() {
    if (!window.LuxCart || typeof window.LuxCart.getCart !== 'function') return null;

    const items = window.LuxCart.getCart().filter(item =>
      item &&
      (
        item.deliveryMode === 'home' ||
        item.deliveryMode === 'domicilio' ||
        /Envío a domicilio/i.test(String(item.details || '')) ||
        /Envío incluido en el pedido/i.test(String(item.details || ''))
      )
    );

    if (!items.length) return null;

    const costs = items.map(item => Number(item.shippingCost || 0)).filter(Boolean);
    const addressItem = items.find(item => item.deliveryAddress);

    return {
      cost: costs.length ? Math.max(...costs) : 0,
      address: addressItem ? String(addressItem.deliveryAddress || '') : ''
    };
  }

  function applyInheritedDeliveryUI() {
    const options = document.querySelector('.lux-quote-delivery');
    const address = document.getElementById('lux-quote-address');
    let box = document.getElementById('lux-quote-inherited-delivery');

    if (state.inheritedHomeDelivery) {
      if (options) options.style.display = 'none';
      if (address) address.classList.remove('visible');

      if (!box && options) {
        box = document.createElement('div');
        box.id = 'lux-quote-inherited-delivery';
        box.style.cssText =
          'display:flex;flex-direction:column;gap:5px;padding:15px 17px;' +
          'border:1px solid rgba(143,169,190,.34);border-radius:14px;' +
          'background:rgba(231,240,250,.72);';
        box.innerHTML =
          '<strong style="font-size:14px">Entrega a domicilio heredada</strong>' +
          '<span style="color:#6e6e73;font-size:12px;line-height:1.5">' +
          'Este producto se enviará junto con los productos que ya tienes en el carrito.' +
          '</span>';
        options.parentNode.insertBefore(box, options);
      }

      if (box) box.style.display = 'flex';
    } else {
      if (options) options.style.display = '';
      if (box) box.style.display = 'none';
    }
  }

  function markup() {
    if (document.getElementById('lux-quote-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'lux-quote-overlay';
    overlay.className = 'lux-quote-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="lux-quote-dialog" role="dialog" aria-modal="true" aria-labelledby="lux-quote-title">
        <div class="lux-quote-media">
          <img id="lux-quote-image" alt="">
        </div>

        <div class="lux-quote-content" id="lux-quote-scroll">
          <div class="lux-quote-head">
            <div>
              <p class="lux-quote-eyebrow" id="lux-quote-category"></p>
              <h2 class="lux-quote-title" id="lux-quote-title"></h2>
              <p class="lux-quote-desc" id="lux-quote-desc"></p>
            </div>
            <button class="lux-quote-close" type="button" aria-label="Cerrar">×</button>
          </div>

          <section class="lux-quote-section" id="lux-quote-color-section">
            <p class="lux-quote-label">Color seleccionado: <strong id="lux-quote-color-name"></strong></p>
            <div class="lux-quote-swatches" id="lux-quote-swatches"></div>
          </section>

          <section class="lux-quote-section" id="lux-quote-assembly-section">
            <label class="lux-quote-check">
              <input id="lux-quote-assembly" type="checkbox">
              <span class="lux-quote-check-copy">
                <strong>Ensamble incluido</strong>
                <span>Nuestro equipo entrega el mueble ensamblado.</span>
              </span>
              <span class="lux-quote-check-price">+$150</span>
            </label>
          </section>

          <section class="lux-quote-section">
            <p class="lux-quote-label"><strong>Entrega</strong></p>

            <div class="lux-quote-delivery">
              <label class="lux-quote-delivery-option selected" data-delivery="factory">
                <input type="radio" name="lux-delivery" value="factory" checked>
                <span class="lux-quote-delivery-copy">
                  <strong>Recoger en fábrica</strong>
                  <span>Cuautlancingo, Puebla</span>
                </span>
                <span class="lux-quote-delivery-price">Gratis</span>
              </label>

              <label class="lux-quote-delivery-option" data-delivery="store">
                <input type="radio" name="lux-delivery" value="store">
                <span class="lux-quote-delivery-copy">
                  <strong>Recoger en tienda</strong>
                  <span>19 Poniente, Puebla</span>
                </span>
                <span class="lux-quote-delivery-price">Gratis</span>
              </label>

              <label class="lux-quote-delivery-option" data-delivery="home">
                <input type="radio" name="lux-delivery" value="home">
                <span class="lux-quote-delivery-copy">
                  <strong>Envío a domicilio</strong>
                  <span>$15.50 por km, considerando ida y vuelta</span>
                </span>
                <span class="lux-quote-delivery-price" id="lux-quote-delivery-price">Calcular</span>
              </label>
            </div>

            <div class="lux-quote-address" id="lux-quote-address">
              <div class="lux-quote-search">
                <input id="lux-quote-address-input" placeholder="Escribe tu dirección en Puebla">
                <button type="button" id="lux-quote-search-button">Calcular</button>
              </div>
              <div id="lux-quote-map"></div>
              <div class="lux-quote-result" id="lux-quote-result"></div>
            </div>
          </section>

          <section class="lux-quote-section lux-quote-actions-section">
            <div class="lux-quote-total">
              <p class="lux-quote-total-label">Total estimado</p>
              <p class="lux-quote-total-value" id="lux-quote-total"></p>
              <p class="lux-quote-total-breakdown" id="lux-quote-breakdown"></p>
            </div>

            <button class="lux-quote-add" type="button" id="lux-quote-add">
              Agregar al carrito y seguir comprando
            </button>

            <button class="lux-quote-pay" type="button" id="lux-quote-pay">
              Pagar ahora
            </button>

            <p class="lux-quote-note">
              La disponibilidad, entrega, instalación y forma de pago se confirman antes de procesar la compra.
            </p>
          </section>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('.lux-quote-close').addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });

    overlay.querySelector('#lux-quote-assembly').addEventListener('change', event => {
      state.assembly = event.target.checked;
      updateTotal();
    });

    overlay.querySelectorAll('[data-delivery]').forEach(label => {
      label.addEventListener('click', () => selectDelivery(label.dataset.delivery));
    });

    overlay.querySelector('#lux-quote-search-button').addEventListener('click', searchAddress);
    overlay.querySelector('#lux-quote-address-input').addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchAddress();
      }
    });

    overlay.querySelector('#lux-quote-add').addEventListener('click', addAndContinue);
    overlay.querySelector('#lux-quote-pay').addEventListener('click', payNow);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) close();
    });
  }

  function open(config) {
    markup();

    state = {
      ...state,
      config,
      color: config.colors === false ? null : COLORS[0],
      assembly: false,
      delivery: 'factory',
      deliveryCost: 0,
      address: '',
      lastFocus: document.activeElement,
      inheritedHomeDelivery: false,
      inheritedShippingCost: 0,
      inheritedAddress: ''
    };

    const existingHomeDelivery = getExistingHomeDelivery();

    if (existingHomeDelivery) {
      state.inheritedHomeDelivery = true;
      state.inheritedShippingCost = Number(existingHomeDelivery.cost || 0);
      state.inheritedAddress = existingHomeDelivery.address || '';
      state.delivery = 'home';
      state.deliveryCost = state.inheritedShippingCost;
      state.address = state.inheritedAddress;
    }

    const overlay = document.getElementById('lux-quote-overlay');
    const image = document.getElementById('lux-quote-image');

    image.src = config.image;
    image.alt = config.name;

    document.getElementById('lux-quote-category').textContent = config.category || 'Lux Concept';
    document.getElementById('lux-quote-title').textContent = config.name;
    document.getElementById('lux-quote-desc').textContent =
      config.description || config.details || '';

    const colorSection = document.getElementById('lux-quote-color-section');
    colorSection.style.display = config.colors === false ? 'none' : 'block';
    if (config.colors !== false) buildColors();

    const assemblySection = document.getElementById('lux-quote-assembly-section');
    assemblySection.style.display = config.assembly === false ? 'none' : 'block';
    document.getElementById('lux-quote-assembly').checked = false;

    document.querySelectorAll('[data-delivery]').forEach(element => {
      element.classList.toggle(
        'selected',
        state.inheritedHomeDelivery
          ? element.dataset.delivery === 'home'
          : element.dataset.delivery === 'factory'
      );
    });

    const selectedDelivery = document.querySelector(
      `input[value="${state.inheritedHomeDelivery ? 'home' : 'factory'}"]`
    );
    if (selectedDelivery) selectedDelivery.checked = true;

    document.getElementById('lux-quote-address').classList.remove('visible');
    document.getElementById('lux-quote-delivery-price').textContent =
      state.inheritedHomeDelivery ? 'Incluido' : 'Calcular';
    document.getElementById('lux-quote-result').classList.remove('visible');
    document.getElementById('lux-quote-address-input').value = '';

    applyInheritedDeliveryUI();
    updateTotal();

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const scrollArea = document.getElementById('lux-quote-scroll');
    if (scrollArea) scrollArea.scrollTop = 0;

    overlay.querySelector('.lux-quote-close').focus();
  }

  function close() {
    const overlay = document.getElementById('lux-quote-overlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      state.lastFocus.focus();
    }
  }

  function buildColors() {
    const box = document.getElementById('lux-quote-swatches');

    box.innerHTML = COLORS.map((color, index) => `
      <button
        type="button"
        class="lux-quote-swatch${index === 0 ? ' active' : ''}"
        style="background:${color.hex}"
        title="${color.name}"
        aria-label="${color.name}"
        data-color="${index}">
      </button>`).join('');

    document.getElementById('lux-quote-color-name').textContent = COLORS[0].name;

    box.querySelectorAll('[data-color]').forEach(button => {
      button.addEventListener('click', () => {
        state.color = COLORS[Number(button.dataset.color)];
        document.getElementById('lux-quote-color-name').textContent = state.color.name;

        box.querySelectorAll('.lux-quote-swatch').forEach(swatch => {
          swatch.classList.remove('active');
        });
        button.classList.add('active');
      });
    });
  }

  function selectDelivery(mode) {
    if (state.inheritedHomeDelivery) return;
    state.delivery = mode;
    state.deliveryCost = 0;
    state.address = '';

    document.querySelectorAll('[data-delivery]').forEach(element => {
      element.classList.toggle('selected', element.dataset.delivery === mode);
    });

    document.querySelector(`input[value="${mode}"]`).checked = true;
    document.getElementById('lux-quote-address').classList.toggle('visible', mode === 'home');
    document.getElementById('lux-quote-delivery-price').textContent =
      mode === 'home' ? 'Calcular' : 'Gratis';

    const result = document.getElementById('lux-quote-result');
    result.classList.remove('visible');
    result.textContent = '';

    if (mode === 'home') initMap();
    updateTotal();
  }

  function ensureLeaflet() {
    return new Promise((resolve, reject) => {
      if (window.L) {
        resolve();
        return;
      }

      if (!document.querySelector('link[data-lux-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.luxLeaflet = '1';
        document.head.appendChild(link);
      }

      let script = document.querySelector('script[data-lux-leaflet]');
      if (script) {
        script.addEventListener('load', resolve, {once: true});
        script.addEventListener('error', reject, {once: true});
        return;
      }

      script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.dataset.luxLeaflet = '1';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function initMap() {
    ensureLeaflet()
      .then(() => {
        if (state.map) {
          setTimeout(() => state.map.invalidateSize(), 60);
          return;
        }

        state.map = L.map('lux-quote-map').setView([19.0432, -98.1988], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(state.map);

        L.marker(FACTORY).addTo(state.map).bindPopup('Fábrica · Cuautlancingo');
        L.marker(STORE).addTo(state.map).bindPopup('Tienda · 19 Poniente');

        state.map.on('click', event => {
          placeMarker(event.latlng.lat, event.latlng.lng, 'Punto seleccionado');
        });

        setTimeout(() => state.map.invalidateSize(), 80);
      })
      .catch(() => {
        document.getElementById('lux-quote-map').textContent =
          'No fue posible cargar el mapa. Escribe tu dirección e inténtalo nuevamente.';
      });
  }

  function searchAddress() {
    const query = document.getElementById('lux-quote-address-input').value.trim();
    if (!query) return;

    fetch(
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(query + ', Puebla, México'),
      {headers: {'Accept-Language': 'es'}}
    )
      .then(response => response.json())
      .then(data => {
        if (!data.length) {
          alert('No encontramos esa dirección. Intenta agregar colonia y municipio.');
          return;
        }

        placeMarker(
          Number(data[0].lat),
          Number(data[0].lon),
          data[0].display_name
        );
      })
      .catch(() => {
        alert('No fue posible consultar la dirección. Inténtalo de nuevo.');
      });
  }

  function placeMarker(lat, lon, label) {
    ensureLeaflet().then(() => {
      if (!state.map) initMap();

      setTimeout(() => {
        if (state.marker) state.map.removeLayer(state.marker);

        state.marker = L.marker([lat, lon])
          .addTo(state.map)
          .bindPopup('Destino')
          .openPopup();

        state.map.setView([lat, lon], 14);
      }, 80);
    });

    const distance =
      Math.min(
        haversine(FACTORY[0], FACTORY[1], lat, lon),
        haversine(STORE[0], STORE[1], lat, lon)
      ) * 1.3 * 2;

    state.deliveryCost = Math.round(distance * RATE);
    state.address = label;

    document.getElementById('lux-quote-delivery-price').textContent =
      '$' + state.deliveryCost.toLocaleString('es-MX');

    const result = document.getElementById('lux-quote-result');
    result.classList.add('visible');
    result.innerHTML =
      `Distancia estimada: <strong>${distance.toFixed(1)} km</strong> ida y vuelta · ` +
      `Envío: <strong>$${state.deliveryCost.toLocaleString('es-MX')} MXN</strong>`;

    updateTotal();
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const radius = 6371;
    const radians = Math.PI / 180;
    const deltaLat = (lat2 - lat1) * radians;
    const deltaLon = (lon2 - lon1) * radians;

    const value =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1 * radians) *
      Math.cos(lat2 * radians) *
      Math.sin(deltaLon / 2) ** 2;

    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function total() {
    return (
      Number(state.config.price) +
      (state.config.assembly === false ? 0 : state.assembly ? 150 : 0) +
      (
        state.delivery === 'home' && !state.inheritedHomeDelivery
          ? state.deliveryCost
          : 0
      )
    );
  }

  function updateTotal() {
    if (!state.config) return;

    const parts = [
      `Producto: $${Number(state.config.price).toLocaleString('es-MX')}`
    ];

    if (state.config.assembly !== false && state.assembly) {
      parts.push('Ensamble: $150');
    }

    if (state.delivery === 'home' && state.deliveryCost) {
      parts.push(
        state.inheritedHomeDelivery
          ? 'Envío incluido en el pedido'
          : `Envío: $${state.deliveryCost.toLocaleString('es-MX')}`
      );
    }

    parts.push('IVA incluido');

    document.getElementById('lux-quote-total').innerHTML =
      `$${total().toLocaleString('es-MX')} <span>MXN</span>`;

    document.getElementById('lux-quote-breakdown').textContent =
      parts.join(' · ');
  }

  function validateConfiguration() {
    if (
      state.delivery === 'home' &&
      !state.inheritedHomeDelivery &&
      !state.deliveryCost
    ) {
      alert(
        'Calcula primero el costo de envío con tu dirección o selecciona una opción de recolección.'
      );
      return false;
    }

    return true;
  }

  function configuredProduct() {
    const config = state.config;
    const details = [];

    if (config.colors !== false && state.color) {
      details.push('Color: ' + state.color.name);
    }

    if (config.assembly !== false) {
      details.push(state.assembly ? 'Ensamblado' : 'Sin ensamble');
    }

    if (state.delivery === 'factory') details.push('Recoger en fábrica');
    if (state.delivery === 'store') details.push('Recoger en tienda');

    if (state.delivery === 'home') {
      details.push(
        state.inheritedHomeDelivery
          ? 'Envío incluido en el pedido'
          : 'Envío a domicilio: $' + state.deliveryCost.toLocaleString('es-MX')
      );
      if (state.address) details.push('Destino: ' + state.address);
    }

    return {
      id: [
        config.id,
        state.color?.name || 'sin-color',
        state.assembly ? 'ensamblado' : 'sin-ensamble',
        state.delivery,
        state.deliveryCost
      ].join('|'),
      name: config.name,
      category: config.category || 'Lux Concept',
      unitPrice: total(),
      baseUnitPrice: total(),
      qty: 1,
      image: config.image,
      deliveryMode: state.delivery,
      shippingCost: state.delivery === 'home'
        ? Number(state.deliveryCost || state.inheritedShippingCost || 0)
        : 0,
      shippingIncluded: state.delivery === 'home' && !state.inheritedHomeDelivery,
      shippingSeparated: true,
      deliveryAddress: state.address || state.inheritedAddress || '',
      details: [config.details, ...details].filter(Boolean).join(' · ')
    };
  }

  function addAndContinue() {
    if (!validateConfiguration()) return;

    if (!window.LuxCart) {
      alert('El carrito todavía no está disponible. Recarga la página.');
      return;
    }

    const product = configuredProduct();
    LuxCart.add(product);

    if (typeof LuxCart.closeModal === 'function') {
      LuxCart.closeModal();
    }

    close();
    showConfirmation(product.name + ' fue agregado al carrito.');
  }

  function payNow() {
    if (!validateConfiguration()) return;

    const product = configuredProduct();

    const message = [
      'Hola, quiero continuar con la compra de este producto:',
      '',
      product.name,
      product.details,
      `Total estimado: $${product.unitPrice.toLocaleString('es-MX')} MXN`,
      '',
      'Quedo al pendiente para confirmar disponibilidad, entrega y forma de pago.'
    ].join('\n');

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function showConfirmation(message) {
    let toast = document.getElementById('lux-quote-toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'lux-quote-toast';
      toast.className = 'lux-quote-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(showConfirmation.timer);
    showConfirmation.timer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2800);
  }

  window.LuxQuote = {
    open,
    close,
    navettaColors: COLORS
  };
})();
