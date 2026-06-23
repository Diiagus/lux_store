/* Lux Concept — configurador reutilizable de producto */
(function(){
  'use strict';
  const FACTORY=[19.0827,-98.2697], STORE=[19.0414,-98.2063], RATE=15.50;
  const COLORS=[
    {name:'Blanco Frosty',hex:'#F4F4F2'},{name:'Blanco',hex:'#F8F8F5'},{name:'Gris',hex:'#737070'},
    {name:'Oxford',hex:'#5A5A58'},{name:'Castaña',hex:'#9A8860'},{name:'Negro',hex:'#1A1A18'},
    {name:'Modena',hex:'#D4A870'},{name:'Duna',hex:'#A87848'},{name:'Avellana',hex:'#C8A878'},
    {name:'Lisboa',hex:'#B09878'},{name:'Rosa Morada',hex:'#987060'},{name:'Nogal Albura',hex:'#6A4030'},
    {name:'Tabaco',hex:'#282018'},{name:'Cedro',hex:'#B06040'},{name:'Nogal',hex:'#6A4828'},
    {name:'Parota',hex:'#9A7048'},{name:'Tzalam',hex:'#C87840'},{name:'Wengue',hex:'#201408'},
    {name:'Polar',hex:'#E8E5DC'}
  ];
  let state={config:null,color:null,assembly:false,delivery:'factory',deliveryCost:0,address:'',map:null,marker:null,lastFocus:null};

  function markup(){
    if(document.getElementById('lux-quote-overlay'))return;
    const overlay=document.createElement('div');
    overlay.id='lux-quote-overlay';overlay.className='lux-quote-overlay';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="lux-quote-dialog" role="dialog" aria-modal="true" aria-labelledby="lux-quote-title">
      <div class="lux-quote-media"><img id="lux-quote-image" alt=""></div>
      <div class="lux-quote-content">
        <div class="lux-quote-head"><div><p class="lux-quote-eyebrow" id="lux-quote-category"></p><h2 class="lux-quote-title" id="lux-quote-title"></h2><p class="lux-quote-desc" id="lux-quote-desc"></p></div><button class="lux-quote-close" type="button" aria-label="Cerrar">×</button></div>
        <section class="lux-quote-section" id="lux-quote-color-section"><p class="lux-quote-label">Color seleccionado: <strong id="lux-quote-color-name"></strong></p><div class="lux-quote-swatches" id="lux-quote-swatches"></div></section>
        <section class="lux-quote-section" id="lux-quote-assembly-section"><label class="lux-quote-check"><input id="lux-quote-assembly" type="checkbox"><span class="lux-quote-check-copy"><strong>Ensamble incluido</strong><span>Nuestro equipo entrega el mueble ensamblado.</span></span><span class="lux-quote-check-price">+$150</span></label></section>
        <section class="lux-quote-section"><p class="lux-quote-label"><strong>Entrega</strong></p><div class="lux-quote-delivery">
          <label class="lux-quote-delivery-option selected" data-delivery="factory"><input type="radio" name="lux-delivery" value="factory" checked><span class="lux-quote-delivery-copy"><strong>Recoger en fábrica</strong><span>Cuautlancingo, Puebla</span></span><span class="lux-quote-delivery-price">Gratis</span></label>
          <label class="lux-quote-delivery-option" data-delivery="store"><input type="radio" name="lux-delivery" value="store"><span class="lux-quote-delivery-copy"><strong>Recoger en tienda</strong><span>19 Poniente, Puebla</span></span><span class="lux-quote-delivery-price">Gratis</span></label>
          <label class="lux-quote-delivery-option" data-delivery="home"><input type="radio" name="lux-delivery" value="home"><span class="lux-quote-delivery-copy"><strong>Envío a domicilio</strong><span>$15.50 por km, considerando ida y vuelta</span></span><span class="lux-quote-delivery-price" id="lux-quote-delivery-price">Calcular</span></label>
        </div><div class="lux-quote-address" id="lux-quote-address"><div class="lux-quote-search"><input id="lux-quote-address-input" placeholder="Escribe tu dirección en Puebla"><button type="button" id="lux-quote-search-button">Calcular</button></div><div id="lux-quote-map"></div><div class="lux-quote-result" id="lux-quote-result"></div></div></section>
        <section class="lux-quote-section"><div class="lux-quote-total"><p class="lux-quote-total-label">Total estimado</p><p class="lux-quote-total-value" id="lux-quote-total"></p><p class="lux-quote-total-breakdown" id="lux-quote-breakdown"></p></div><button class="lux-quote-add" type="button" id="lux-quote-add">Agregar a mi cotización</button><p class="lux-quote-note">La disponibilidad, entrega e instalación se confirman antes de aceptar el pedido.</p></section>
      </div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.lux-quote-close').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelector('#lux-quote-assembly').addEventListener('change',e=>{state.assembly=e.target.checked;updateTotal()});
    overlay.querySelectorAll('[data-delivery]').forEach(label=>label.addEventListener('click',()=>selectDelivery(label.dataset.delivery)));
    overlay.querySelector('#lux-quote-search-button').addEventListener('click',searchAddress);
    overlay.querySelector('#lux-quote-address-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchAddress()}});
    overlay.querySelector('#lux-quote-add').addEventListener('click',addToCart);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});
  }

  function open(config){
    markup();state={...state,config,color:(config.colors===false?null:COLORS[0]),assembly:false,delivery:'factory',deliveryCost:0,address:'',lastFocus:document.activeElement};
    const overlay=document.getElementById('lux-quote-overlay');
    document.getElementById('lux-quote-image').src=config.image;document.getElementById('lux-quote-image').alt=config.name;
    document.getElementById('lux-quote-category').textContent=config.category||'Lux Concept';document.getElementById('lux-quote-title').textContent=config.name;document.getElementById('lux-quote-desc').textContent=config.description||config.details||'';
    const colorSection=document.getElementById('lux-quote-color-section');colorSection.style.display=config.colors===false?'none':'block';
    if(config.colors!==false)buildColors();
    const assemblySection=document.getElementById('lux-quote-assembly-section');assemblySection.style.display=config.assembly===false?'none':'block';document.getElementById('lux-quote-assembly').checked=false;
    document.querySelectorAll('[data-delivery]').forEach(el=>el.classList.toggle('selected',el.dataset.delivery==='factory'));document.querySelector('input[value="factory"]').checked=true;
    document.getElementById('lux-quote-address').classList.remove('visible');document.getElementById('lux-quote-delivery-price').textContent='Calcular';document.getElementById('lux-quote-result').classList.remove('visible');document.getElementById('lux-quote-address-input').value='';
    updateTotal();overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';overlay.querySelector('.lux-quote-close').focus();
  }

  function close(){const overlay=document.getElementById('lux-quote-overlay');if(!overlay)return;overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';if(state.lastFocus&&state.lastFocus.focus)state.lastFocus.focus()}
  function buildColors(){const box=document.getElementById('lux-quote-swatches');box.innerHTML=COLORS.map((c,i)=>`<button type="button" class="lux-quote-swatch${i===0?' active':''}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}" data-color="${i}"></button>`).join('');document.getElementById('lux-quote-color-name').textContent=COLORS[0].name;box.querySelectorAll('[data-color]').forEach(btn=>btn.addEventListener('click',()=>{state.color=COLORS[Number(btn.dataset.color)];document.getElementById('lux-quote-color-name').textContent=state.color.name;box.querySelectorAll('.lux-quote-swatch').forEach(x=>x.classList.remove('active'));btn.classList.add('active')}))}
  function selectDelivery(mode){state.delivery=mode;state.deliveryCost=0;document.querySelectorAll('[data-delivery]').forEach(el=>el.classList.toggle('selected',el.dataset.delivery===mode));document.querySelector(`input[value="${mode}"]`).checked=true;document.getElementById('lux-quote-address').classList.toggle('visible',mode==='home');document.getElementById('lux-quote-delivery-price').textContent=mode==='home'?'Calcular':'Gratis';if(mode==='home')initMap();updateTotal()}
  function ensureLeaflet(){return new Promise((resolve,reject)=>{if(window.L){resolve();return}if(!document.querySelector('link[data-lux-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.luxLeaflet='1';document.head.appendChild(l)}let s=document.querySelector('script[data-lux-leaflet]');if(s){s.addEventListener('load',resolve,{once:true});s.addEventListener('error',reject,{once:true});return}s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.dataset.luxLeaflet='1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  function initMap(){ensureLeaflet().then(()=>{if(state.map){setTimeout(()=>state.map.invalidateSize(),60);return}state.map=L.map('lux-quote-map').setView([19.0432,-98.1988],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(state.map);L.marker(FACTORY).addTo(state.map).bindPopup('Fábrica · Cuautlancingo');L.marker(STORE).addTo(state.map).bindPopup('Tienda · 19 Poniente');state.map.on('click',e=>placeMarker(e.latlng.lat,e.latlng.lng,'Punto seleccionado'));setTimeout(()=>state.map.invalidateSize(),80)}).catch(()=>{document.getElementById('lux-quote-map').textContent='No fue posible cargar el mapa. Puedes escribir tu dirección y calcularla.'})}
  function searchAddress(){const q=document.getElementById('lux-quote-address-input').value.trim();if(!q)return;fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q+', Puebla, México'),{headers:{'Accept-Language':'es'}}).then(r=>r.json()).then(d=>{if(!d.length){alert('No encontramos esa dirección. Intenta agregar colonia y municipio.');return}placeMarker(Number(d[0].lat),Number(d[0].lon),d[0].display_name)}).catch(()=>alert('No fue posible consultar la dirección. Inténtalo de nuevo.'))}
  function placeMarker(lat,lon,label){ensureLeaflet().then(()=>{if(!state.map)initMap();setTimeout(()=>{if(state.marker)state.map.removeLayer(state.marker);state.marker=L.marker([lat,lon]).addTo(state.map).bindPopup('Destino').openPopup();state.map.setView([lat,lon],14)},80)});const km=Math.min(haversine(FACTORY[0],FACTORY[1],lat,lon),haversine(STORE[0],STORE[1],lat,lon))*1.3*2;state.deliveryCost=Math.round(km*RATE);state.address=label;document.getElementById('lux-quote-delivery-price').textContent='$'+state.deliveryCost.toLocaleString('es-MX');const r=document.getElementById('lux-quote-result');r.classList.add('visible');r.innerHTML=`Distancia estimada: <strong>${km.toFixed(1)} km</strong> ida y vuelta · Envío: <strong>$${state.deliveryCost.toLocaleString('es-MX')} MXN</strong>`;updateTotal()}
  function haversine(a,b,c,d){const R=6371,r=Math.PI/180,dL=(c-a)*r,dO=(d-b)*r,x=Math.sin(dL/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dO/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
  function total(){return Number(state.config.price)+(state.config.assembly===false?0:(state.assembly?150:0))+(state.delivery==='home'?state.deliveryCost:0)}
  function updateTotal(){if(!state.config)return;const parts=[`Producto: $${Number(state.config.price).toLocaleString('es-MX')}`];if(state.config.assembly!==false&&state.assembly)parts.push('Ensamble: $150');if(state.delivery==='home'&&state.deliveryCost)parts.push(`Envío: $${state.deliveryCost.toLocaleString('es-MX')}`);parts.push('IVA incluido');document.getElementById('lux-quote-total').innerHTML=`$${total().toLocaleString('es-MX')} <span>MXN</span>`;document.getElementById('lux-quote-breakdown').textContent=parts.join(' · ')}
  function addToCart(){if(state.delivery==='home'&&!state.deliveryCost){alert('Calcula primero el costo de envío con tu dirección o selecciona una opción de recolección.');return}if(!window.LuxCart){alert('El carrito todavía no está disponible. Recarga la página.');return}const cfg=state.config,parts=[];if(cfg.colors!==false&&state.color)parts.push('Color: '+state.color.name);if(cfg.assembly!==false&&state.assembly)parts.push('Ensamble incluido');if(state.delivery==='factory')parts.push('Recoger en fábrica');if(state.delivery==='store')parts.push('Recoger en tienda');if(state.delivery==='home'){parts.push('Envío a domicilio: $'+state.deliveryCost.toLocaleString('es-MX'));if(state.address)parts.push('Destino: '+state.address)}LuxCart.add({id:[cfg.id,state.color?.name||'sin-color',state.assembly?'ensamblado':'sin-ensamble',state.delivery,state.deliveryCost].join('|'),name:cfg.name,category:cfg.category||'Lux Concept',unitPrice:total(),qty:1,image:cfg.image,details:[cfg.details,...parts].filter(Boolean).join(' · ')});close()}
  window.LuxQuote={open,close,navettaColors:COLORS};
})();
