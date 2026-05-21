// ================================================
// PRODUCT VIEWER
// Este archivo controla el selector interactivo
// ================================================

// ── DATOS DE CADA PIEZA ──
// Aquí defines el contenido de cada selección.
// Cuando agregues más productos, solo copias este patrón.

const PRODUCTOS = {

  conjunto: {
    titulo: 'Conjunto Mueble + Ovalín',
    desc: 'Mueble colgante con ovalín Bowl incluido. Listo para instalar en Puebla.',
    precio: '$2,069',
    nota: 'IVA incluido · Entrega en Puebla',
    specs: [
      ['Material',      'MDF 15mm Blanco Frosty Navetta'],
      ['Medidas',       '40 × 40 × 40 cm'],
      ['Puertas',       '2 puertas con bisagra incluida'],
      ['Instalación',   'Colgante — montaje en pared'],
      ['Ovalín',        'Bowl cerámico · Diámetro 32 cm'],
      ['Entrega',       'Desarmado, listo para armar']
    ]
  },

  vanity: {
    titulo: 'Mueble de Baño',
    desc: 'Gabinete colgante de 2 puertas. Fabricado con MDF 15mm Blanco Frosty Navetta.',
    precio: '$1,025',
    nota: 'Sin ovalín · IVA incluido · Entrega en Puebla',
    specs: [
      ['Material',      'MDF 15mm Blanco Frosty Navetta'],
      ['Alto',          '40 cm'],
      ['Ancho',         '40 cm'],
      ['Profundidad',   '40 cm'],
      ['Puertas',       '2 puertas con bisagra'],
      ['Instalación',   'Colgante — montaje en pared']
    ]
  },

  ovalin: {
    titulo: 'Ovalín Bowl',
    desc: 'Ovalín de cerámica blanca con desagüe incluido. Diseño circular moderno.',
    precio: '$1,044',
    nota: 'IVA incluido · Entrega en Puebla',
    specs: [
      ['Material',  'Cerámica blanca'],
      ['Diámetro',  '32 cm'],
      ['Tipo',      'Bowl — se monta sobre el mueble'],
      ['Color',     'Blanco'],
      ['Incluye',   'Desagüe'],
      ['Entrega',   'Empacado con protección']
    ]
  }

};

// ================================================
// FUNCIÓN PRINCIPAL: selectPiece(pieza)
// Se llama cuando el cliente hace clic en algo.
// pieza puede ser: 'conjunto', 'vanity' o 'ovalin'
// ================================================

function selectPiece(pieza) {

  // 1. Tomamos los datos de la pieza seleccionada
  const datos = PRODUCTOS[pieza];

  // 2. Actualizamos el título en pantalla
  document.getElementById('product-title').textContent = datos.titulo;

  // 3. Actualizamos la descripción
  document.getElementById('product-desc').textContent = datos.desc;

  // 4. Actualizamos el precio
  document.getElementById('price-amount').innerHTML =
    datos.precio + ' <span>MXN</span>';

  // 5. Actualizamos la nota del precio
  document.getElementById('price-note').textContent = datos.nota;

  // 6. Actualizamos la lista de características
  const lista = document.getElementById('specs-list');
  lista.innerHTML = ''; // Primero la vaciamos

  // Luego llenamos con las specs de esta pieza
  // forEach recorre cada par [nombre, valor]
  datos.specs.forEach(function(spec) {
    lista.innerHTML += `
      <li>
        <span>${spec[0]}</span>
        <span>${spec[1]}</span>
      </li>
    `;
  });

  // ── Actualizar los botones de toggle ──
  // Quitamos active de todos
  document.querySelectorAll('.toggle-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  // Ponemos active solo en el que corresponde
  document.getElementById('btn-' + pieza).classList.add('active');

  // ── Actualizar el resaltado del sandwich ──
  const elOvalin = document.getElementById('piece-ovalin');
  const elVanity = document.getElementById('piece-vanity');

  // Limpiamos clases anteriores
  elOvalin.classList.remove('active', 'dimmed');
  elVanity.classList.remove('active', 'dimmed');

  // Aplicamos según la selección
  if (pieza === 'ovalin') {
    elOvalin.classList.add('active');  // Ovalín resaltado
    elVanity.classList.add('dimmed'); // Mueble atenuado
  } else if (pieza === 'vanity') {
    elVanity.classList.add('active'); // Mueble resaltado
    elOvalin.classList.add('dimmed'); // Ovalín atenuado
  }
  // Si es 'conjunto', ambos quedan normales

}

// Al cargar la página mostramos el conjunto por defecto
selectPiece('conjunto');