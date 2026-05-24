const PRODUCTOS = {
  conjunto: {
    titulo: 'Conjunto Mueble + Ovalín',
    desc: 'Mueble colgante con ovalín Bowl incluido. Listo para instalar en Puebla.',
    precio: '$2,069',
    nota: 'IVA incluido · Entrega en Puebla',
    specs: [
      ['Material',    'MDF 15mm Blanco Frosty Navetta'],
      ['Medidas',     '40 × 40 × 40 cm'],
      ['Puertas',     '2 puertas con bisagra incluida'],
      ['Instalación', 'Colgante — montaje en pared'],
      ['Ovalín',      'Bowl cerámico · Diámetro 32 cm'],
      ['Entrega',     'Desarmado, listo para armar']
    ]
  },
  vanity: {
    titulo: 'Mueble de Baño',
    desc: 'Gabinete colgante de 2 puertas. Fabricado con MDF 15mm Blanco Frosty Navetta.',
    precio: '$1,025',
    nota: 'Sin ovalín · IVA incluido · Entrega en Puebla',
    specs: [
      ['Material',    'MDF 15mm Blanco Frosty Navetta'],
      ['Alto',        '40 cm'],
      ['Ancho',       '40 cm'],
      ['Profundidad', '40 cm'],
      ['Puertas',     '2 puertas con bisagra'],
      ['Instalación', 'Colgante — montaje en pared']
    ]
  },
  ovalin: {
    titulo: 'Ovalín Bowl',
    desc: 'Ovalín de cerámica blanca con desagüe incluido. Diseño circular moderno.',
    precio: '$1,044',
    nota: 'IVA incluido · Entrega en Puebla',
    specs: [
      ['Material', 'Cerámica blanca'],
      ['Diámetro', '32 cm'],
      ['Tipo',     'Bowl — se monta sobre el mueble'],
      ['Color',    'Blanco'],
      ['Incluye',  'Desagüe'],
      ['Entrega',  'Empacado con protección']
    ]
  }
};

function selectPiece(pieza) {
  const datos = PRODUCTOS[pieza];

  document.getElementById('product-title').textContent = datos.titulo;
  document.getElementById('product-desc').textContent = datos.desc;
  document.getElementById('price-amount').innerHTML = datos.precio + ' <span>MXN</span>';
  document.getElementById('price-note').textContent = datos.nota;

  const lista = document.getElementById('specs-list');
  lista.innerHTML = '';
  datos.specs.forEach(function(spec) {
    lista.innerHTML += `<li><span>${spec[0]}</span><span>${spec[1]}</span></li>`;
  });

  document.querySelectorAll('.toggle-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.getElementById('btn-' + pieza).classList.add('active');

  const elOvalin = document.getElementById('piece-ovalin');
  const elVanity = document.getElementById('piece-vanity');
  elOvalin.classList.remove('active', 'dimmed');
  elVanity.classList.remove('active', 'dimmed');

  if (pieza === 'ovalin') {
    elOvalin.classList.add('active');
    elVanity.classList.add('dimmed');
  } else if (pieza === 'vanity') {
    elVanity.classList.add('active');
    elOvalin.classList.add('dimmed');
  }

  // Guarda precio base y actualiza total
  const precios = {conjunto: 2069, vanity: 1025, ovalin: 1044};
  window.currentBasePrice = precios[pieza];
  if (typeof updateTotal === 'function') updateTotal();
}

selectPiece('conjunto');