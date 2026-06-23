/* ================================================
   VISOR DE PRODUCTO — Muebles de baño
   Mantiene los precios y datos del modelo seleccionado.
   ================================================ */

const OVALIN_DATA = {
  titulo: 'Ovalín Bowl',
  desc: 'Ovalín de cerámica blanca con desagüe incluido. Diseño circular moderno.',
  nota: 'IVA incluido · Entrega en Puebla',
  specs: [
    ['Material', 'Cerámica blanca'],
    ['Diámetro', '32 cm'],
    ['Tipo', 'Bowl — se monta sobre el mueble'],
    ['Color', 'Blanco'],
    ['Incluye', 'Desagüe'],
    ['Entrega', 'Empacado con protección']
  ]
};

function getModeloSeleccionado() {
  if (
    typeof MODELOS !== 'undefined' &&
    typeof modeloActual !== 'undefined' &&
    MODELOS[modeloActual]
  ) {
    return MODELOS[modeloActual];
  }

  // Datos de respaldo.
  return {
    nombre: 'Lux Vanity S',
    precios: {
      conjunto: 2069,
      vanity: 1025,
      ovalin: 1044
    },
    specs_vanity: [
      ['Material', 'MDF 15mm Blanco Frosty Navetta'],
      ['Alto', '40 cm'],
      ['Ancho', '40 cm'],
      ['Profundidad', '40 cm'],
      ['Puertas', '2 puertas con bisagra'],
      ['Instalación', 'Colgante — montaje en pared']
    ]
  };
}

function getColorSeleccionado() {
  if (
    typeof selectedColor !== 'undefined' &&
    selectedColor &&
    selectedColor.name
  ) {
    return selectedColor.name;
  }

  return 'Blanco Frosty';
}

function specsConColor(specs) {
  const color = getColorSeleccionado();

  return specs.map(function (spec) {
    if (spec[0] === 'Material') {
      return [
        'Material',
        'MDF 15mm ' + color + ' Navetta'
      ];
    }

    return [spec[0], spec[1]];
  });
}

function getDatosPieza(pieza) {
  const modelo = getModeloSeleccionado();
  const precio = modelo.precios[pieza];
  const specsMueble = specsConColor(modelo.specs_vanity);

  if (pieza === 'ovalin') {
    return {
      titulo: OVALIN_DATA.titulo,
      desc: OVALIN_DATA.desc,
      precio: precio,
      nota: OVALIN_DATA.nota,
      specs: OVALIN_DATA.specs
    };
  }

  if (pieza === 'vanity') {
    return {
      titulo: modelo.nombre + ' — Solo mueble',
      desc:
        'Gabinete fabricado en MDF Navetta. ' +
        'Selecciona el color, ensamble y forma de entrega.',
      precio: precio,
      nota: 'Sin ovalín · IVA incluido · Entrega en Puebla',
      specs: specsMueble
    };
  }

  return {
    titulo: modelo.nombre + ' + Ovalín',
    desc:
      'Conjunto de gabinete y ovalín Bowl. ' +
      'Selecciona el color, ensamble y forma de entrega.',
    precio: precio,
    nota: 'IVA incluido · Entrega en Puebla',
    specs: specsMueble.concat([
      ['Ovalín', 'Bowl cerámico · Diámetro 32 cm'],
      ['Entrega', 'Desarmado, listo para armar']
    ])
  };
}

function selectPiece(pieza) {
  const datos = getDatosPieza(pieza);

  const titulo = document.getElementById('product-title');
  const descripcion = document.getElementById('product-desc');
  const precio = document.getElementById('price-amount');
  const nota = document.getElementById('price-note');
  const lista = document.getElementById('specs-list');

  if (titulo) {
    titulo.textContent = datos.titulo;
  }

  if (descripcion) {
    descripcion.textContent = datos.desc;
  }

  if (precio) {
    precio.innerHTML =
      '$' +
      datos.precio.toLocaleString('es-MX') +
      ' <span>MXN</span>';
  }

  if (nota) {
    nota.textContent = datos.nota;
  }

  if (lista) {
    lista.innerHTML = '';

    datos.specs.forEach(function (spec) {
      lista.insertAdjacentHTML(
        'beforeend',
        `<li>
          <span>${spec[0]}</span>
          <span>${spec[1]}</span>
        </li>`
      );
    });
  }

  document.querySelectorAll('.toggle-btn').forEach(function (boton) {
    boton.classList.remove('active');
  });

  const botonActivo = document.getElementById('btn-' + pieza);

  if (botonActivo) {
    botonActivo.classList.add('active');
  }

  const ovalin = document.getElementById('piece-ovalin');
  const vanity = document.getElementById('piece-vanity');

  if (ovalin) {
    ovalin.classList.remove('active', 'dimmed');
  }

  if (vanity) {
    vanity.classList.remove('active', 'dimmed');
  }

  if (pieza === 'ovalin') {
    if (ovalin) {
      ovalin.classList.add('active');
    }

    if (vanity) {
      vanity.classList.add('dimmed');
    }
  }

  if (pieza === 'vanity') {
    if (vanity) {
      vanity.classList.add('active');
    }

    if (ovalin) {
      ovalin.classList.add('dimmed');
    }
  }

  window.currentBasePrice = datos.precio;

  if (typeof updateTotal === 'function') {
    updateTotal();
  }
}

selectPiece('conjunto');