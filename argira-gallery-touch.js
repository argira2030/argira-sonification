/**
 * argira-gallery-touch.js  —  v23
 *
 * Galería sonora táctil accesible: exploración de 16 pinturas mediante
 * sonificación multidimensional del color y síntesis espacial binaural.
 *
 * NUEVAS FUNCIONALIDADES v23
 * ──────────────────────────
 * · Centroide cromático: calcula el centro de masa del color en cada imagen
 *   usando circular mean ponderado por saturación (evita artefacto rojo/violeta).
 * · Panorámica estéreo automática: centroid.x → StereoPannerNode (−1 izq, +1 der).
 *   Cada pintura tiene una "firma espacial" única derivada de su distribución cromática.
 * · Registro vertical: centroid.y → modulación ±25 % de la frecuencia base
 *   (arriba=agudo, abajo=grave), añadiendo una tercera dimensión perceptiva.
 * · Indicador pan en etiqueta: muestra ← · → en tiempo real para feedback
 *   inmediato sin necesidad de auriculares.
 * · Fallback StereoPanner: compatibilidad con navegadores sin createStereoPanner.
 *
 * ESPACIO PERCEPTIVO MULTIDIMENSIONAL
 * ─────────────────────────────────────
 *   hue          → frecuencia (200–1000 Hz)
 *   saturación   → volumen (0.40–0.85) + timbre (sine / triangle)
 *   centroid.x   → panorámica estéreo (−1…+1)
 *   centroid.y   → registro (×0.75…×1.25 sobre frecuencia base)
 *
 * HISTORIAL
 * ─────────
 * v22  color → frecuencia + saturación → volumen/timbre + zonas 3×3 + teclado
 * v23  centroide cromático → panorámica estéreo + registro vertical (este archivo)
 *
 * Sin llamadas a la API — descripciones hardcodeadas por imagen.
 * Insertar antes de </body> en index.html:
 *   <script src="argira-gallery-touch.js"></script>
 */

(function () {
  'use strict';

  // ── JSON de objetos por pintura (clave = src exacto del <img>) ──────────────
  const GALLERY_MAPS = {

    'White_on_White_(Malevich,_1918).png': {
      arriba_izquierda: 'fondo blanco',   arriba_centro: 'borde cuadrado',    arriba_derecha: 'fondo blanco',
      centro_izquierda: 'borde izquierdo', centro: 'cuadrado blanco',          centro_derecha: 'borde derecho',
      abajo_izquierda: 'fondo blanco',    abajo_centro: 'borde inferior',      abajo_derecha: 'fondo blanco'
    },

    'Kazimir_Malevich,_1915,_Black_Suprematic_Square,_oil_on_linen_canvas,_79.5_x_79.5_cm,_Tretyakov_Gallery,_Moscow.jpg': {
      arriba_izquierda: 'borde blanco',   arriba_centro: 'borde superior',     arriba_derecha: 'borde blanco',
      centro_izquierda: 'borde lateral',  centro: 'cuadrado negro',            centro_derecha: 'borde lateral',
      abajo_izquierda: 'borde blanco',    abajo_centro: 'borde inferior',      abajo_derecha: 'borde blanco'
    },

    'Francisco_de_Goya,_Saturno_devorando_a_su_hijo_(1819-1823).jpg': {
      arriba_izquierda: 'fondo oscuro',   arriba_centro: 'cabeza figura',      arriba_derecha: 'fondo negro',
      centro_izquierda: 'brazo enorme',   centro: 'cuerpo devorado',           centro_derecha: 'sombra oscura',
      abajo_izquierda: 'fondo negro',     abajo_centro: 'torso Saturno',       abajo_derecha: 'oscuridad'
    },

    '500px-Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg': {
      arriba_izquierda: 'fondo oscuro',   arriba_centro: 'boina marrón',       arriba_derecha: 'fondo oscuro',
      centro_izquierda: 'rostro iluminado', centro: 'cara Rembrandt',          centro_derecha: 'hombro oscuro',
      abajo_izquierda: 'ropa oscura',     abajo_centro: 'manos paleta',        abajo_derecha: 'fondo marrón'
    },

    'EdwardHopperMorningSun1952.jpg': {
      arriba_izquierda: 'pared gris',     arriba_centro: 'pared iluminada',    arriba_derecha: 'ventana cielo',
      centro_izquierda: 'figura sentada', centro: 'mujer en cama',             centro_derecha: 'edificio urbano',
      abajo_izquierda: 'cama blanca',     abajo_centro: 'piernas figura',      abajo_derecha: 'suelo madera'
    },

    'Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.png': {
      arriba_izquierda: 'ventana luz',    arriba_centro: 'cesta mimbre',       arriba_derecha: 'pared blanca',
      centro_izquierda: 'jarra leche',    centro: 'figura vertiendo',          centro_derecha: 'delantal azul',
      abajo_izquierda: 'pan cesta',       abajo_centro: 'cuenco barro',        abajo_derecha: 'caja madera'
    },

    'Dalí,_Perfil_del_tiempo,_Vroclavo,_7.jpeg': {
      arriba_izquierda: 'estructura metal', arriba_centro: 'reloj derretido',  arriba_derecha: 'cristal edificio',
      centro_izquierda: 'rama árbol',     centro: 'reloj bronce',              centro_derecha: 'fondo urbano',
      abajo_izquierda: 'base verde',      abajo_centro: 'gota bronce',         abajo_derecha: 'pedestal'
    },

    'Paul_Cézanne_-_Montagne_Saint-victoire_-_Google_Art_Project.jpg': {
      arriba_izquierda: 'cielo azul',     arriba_centro: 'montaña cumbre',     arriba_derecha: 'cielo claro',
      centro_izquierda: 'árbol pino',     centro: 'ladera verde',              centro_derecha: 'llanura ocre',
      abajo_izquierda: 'campo verde',     abajo_centro: 'casas tejados',       abajo_derecha: 'llanura tierra'
    },

    'Claude_Monet_-_Cliff_Walk_at_Pourville_-_Google_Art_Project.jpg': {
      arriba_izquierda: 'cielo nublado',  arriba_centro: 'horizonte mar',      arriba_derecha: 'cielo azul',
      centro_izquierda: 'acantilado verde', centro: 'figuras paseo',           centro_derecha: 'mar azul',
      abajo_izquierda: 'hierba verde',    abajo_centro: 'sendero acantilado',  abajo_derecha: 'mar verde'
    },

    'Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg': {
      arriba_izquierda: 'figuras viento', arriba_centro: 'cielo rosado',       arriba_derecha: 'árboles verdes',
      centro_izquierda: 'Céfiro Cloris',  centro: 'Venus desnuda',             centro_derecha: 'ninfa manto',
      abajo_izquierda: 'mar verde',       abajo_centro: 'concha marina',       abajo_derecha: 'orilla mar'
    },

    'Edgar_Germain_Hilaire_Degas_076.jpg': {
      arriba_izquierda: 'fondo naranja',  arriba_centro: 'brazo alzado',       arriba_derecha: 'fondo azul',
      centro_izquierda: 'bailarina espalda', centro: 'figura central',         centro_derecha: 'bailarina derecha',
      abajo_izquierda: 'falda azul',      abajo_centro: 'cabeza bailarina',    abajo_derecha: 'fondo colorido'
    },

    'field-of-poppies.jpg!Large.jpg': {
      arriba_izquierda: 'árboles verdes', arriba_centro: 'árbol grande',       arriba_derecha: 'cielo nubes',
      centro_izquierda: 'amapolas rojas', centro: 'figuras paseando',          centro_derecha: 'campo verde',
      abajo_izquierda: 'amapolas rojas',  abajo_centro: 'figura sombrilla',    abajo_derecha: 'hierba verde'
    },

    '1280px-Korenveld_met_kraaien_-_s0149V1962_-_Van_Gogh_Museum.jpg': {
      arriba_izquierda: 'cielo azul',     arriba_centro: 'nubes blancas',      arriba_derecha: 'cuervos vuelo',
      centro_izquierda: 'trigo amarillo', centro: 'camino tierra',             centro_derecha: 'trigo amarillo',
      abajo_izquierda: 'tierra verde',    abajo_centro: 'camino curva',        abajo_derecha: 'tierra ocre'
    },

    'este.jpg': {
      arriba_izquierda: 'círculo rosa',   arriba_centro: 'círculo negro azul', arriba_derecha: 'círculos colores',
      centro_izquierda: 'círculo gris',   centro: 'gran círculo negro',        centro_derecha: 'círculos verdes',
      abajo_izquierda: 'círculos amarillos', abajo_centro: 'fondo negro',      abajo_derecha: 'círculo lila'
    },

    'La_Desserte_rouge,_par_Henri_Matisse.jpg': {
      arriba_izquierda: 'ventana jardín', arriba_centro: 'pared roja',         arriba_derecha: 'jardín verde',
      centro_izquierda: 'mesa roja',      centro: 'mantel arabescos',          centro_derecha: 'figura sirvienta',
      abajo_izquierda: 'silla azul',      abajo_centro: 'vajilla mesa',        abajo_derecha: 'figura de pie'
    },

    '3840px-Kandinsky_-_Jaune_Rouge_Bleu.jpg': {
      arriba_izquierda: 'líneas rojas',   arriba_centro: 'círculo gris',       arriba_derecha: 'forma azul negra',
      centro_izquierda: 'círculo rojo',   centro: 'rectángulo amarillo',       centro_derecha: 'formas rosas',
      abajo_izquierda: 'líneas geométricas', abajo_centro: 'formas abstractas', abajo_derecha: 'línea serpentina'
    }
  };

  // ── Utilidades ──────────────────────────────────────────────────────────────

  function hueToName(h, s, v) {
    if (s < 0.12) {
      if (v > 0.85) return 'blanco';
      if (v < 0.20) return 'negro';
      return 'gris';
    }
    const deg = h * 360;
    if (deg < 15 || deg >= 345) return 'rojo';
    if (deg < 45)  return 'naranja';
    if (deg < 70)  return 'amarillo';
    if (deg < 150) return 'verde';
    if (deg < 210) return 'cian';
    if (deg < 270) return 'azul';
    if (deg < 330) return 'violeta';
    return 'rosa';
  }

  function rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d > 0) {
      if (max === r)      h = ((g - b) / d + 6) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, max > 0 ? d / max : 0, max];
  }

  function posToKey(rowPos, colPos) {
    if (rowPos === 'centro' && colPos === 'centro') return 'centro';
    if (rowPos === 'centro') return `centro_${colPos}`;
    if (colPos === 'centro') return `${rowPos}_centro`;
    return `${rowPos}_${colPos}`;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1.15; u.volume = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  /**
   * playTone — color → sonido con posición espacial del centroide cromático.
   *
   * @param {number} h      Hue 0–1 → frecuencia base (200–1000 Hz)
   * @param {number} s      Saturación 0–1 → volumen (0.40–0.85)
   * @param {number} [panX] Centroide X normalizado 0–1 → panorámica estéreo (−1 izq, +1 der). Default 0.5 (centro).
   * @param {number} [pitchY] Centroide Y normalizado 0–1 → registro (0=arriba=agudo, 1=abajo=grave). Default 0.5.
   */
  function playTone(h, s, panX, pitchY) {
    try {
      const actx = window.ArgiraAudio
        ? window.ArgiraAudio.resume()
        : new (window.AudioContext || window.webkitAudioContext)();

      // Frecuencia base del hue, modulada ±25 % por la posición vertical del centroide.
      // pitchY=0 (arriba) → +25 % más agudo; pitchY=1 (abajo) → −25 % más grave.
      const freqBase  = 200 + h * 800;
      const yFactor   = (pitchY !== undefined) ? 1.25 - pitchY * 0.50 : 1.0;  // rango [0.75, 1.25]
      const freq      = freqBase * yFactor;

      const vol = 0.40 + s * 0.45;
      const dur = 0.55;

      const osc  = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = s < 0.12 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);

      // StereoPannerNode: cx 0–1 → pan −1…+1
      // Los centroides reales caen en [0.42, 0.62] — amplificamos ese rango
      // al espectro estéreo completo para que sea perceptible con auriculares.
      const CX_MIN = 0.40, CX_MAX = 0.65;
      const panNorm = (panX !== undefined)
        ? Math.max(-1, Math.min(1, ((panX - CX_MIN) / (CX_MAX - CX_MIN)) * 2 - 1))
        : 0;
      if (actx.createStereoPanner) {
        const panner = actx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, panNorm));
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(actx.destination);
      } else {
        // Fallback navegadores sin StereoPanner
        osc.connect(gain);
        gain.connect(actx.destination);
      }

      osc.start();
      osc.stop(actx.currentTime + dur);
    } catch (e) { /* sin audio */ }
  }

  // ── Cargar centroides desde JSON (una sola vez) ────────────────────────────

  let CENTROIDES = {};

  function loadCentroides(callback) {
    fetch('centroides.json')
      .then(r => r.json())
      .then(data => { CENTROIDES = data; callback(); })
      .catch(() => { console.warn('Argira: centroides.json no encontrado — pan centrado por defecto'); callback(); });
  }

  // ── Crear overlay táctil sobre una card ────────────────────────────────────

  function attachTouchToCard(cardImg, objectMap) {
    const SIZE = 512;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;margin-top:8px;';
    wrap.setAttribute('role', 'application');
    wrap.setAttribute('aria-label', 'Área de exploración táctil. Toca para oír el color y el elemento de cada zona.');

    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    canvas.style.cssText = 'width:100%;height:auto;display:block;cursor:crosshair;border-radius:6px;touch-action:pan-y;';
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('aria-label', 'Lienzo interactivo de la pintura. Toca o usa las flechas del teclado para explorar zonas.');

    const ctx = canvas.getContext('2d');

    // Centroide desde JSON — clave = nombre de fichero
    const filename = cardImg.src.split('/').pop().split('?')[0];
    const centroid = CENTROIDES[filename] || { cx: 0.5, cy: 0.5 };

    // Dibujar imagen respetando proporciones reales
    cardImg.addEventListener('load', drawImage, { once: true });
    function drawImage() {
      const aspect = cardImg.naturalHeight / cardImg.naturalWidth;
      canvas.height = Math.round(SIZE * aspect);
      ctx.drawImage(cardImg, 0, 0, SIZE, canvas.height);
    }
    if (cardImg.complete && cardImg.naturalWidth > 0) {
      drawImage();
    }

    // Etiqueta de color accesible
    const label = document.createElement('div');
    label.style.cssText = 'text-align:center;margin-top:6px;font-family:"IBM Plex Mono",monospace;font-size:0.82rem;color:#e8c96a;min-height:20px;';
    label.setAttribute('aria-live', 'polite');
    label.setAttribute('aria-atomic', 'true');

    // Punto indicador visual
    const dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;width:18px;height:18px;border-radius:50%;border:2px solid #fff;pointer-events:none;display:none;transform:translate(-50%,-50%);box-shadow:0 0 6px rgba(0,0,0,0.6);';
    let dotTimer;

    // Guardar alt antes de eliminar el img original
    const imgAlt = cardImg.getAttribute('alt') || '';

    wrap.appendChild(canvas);
    wrap.appendChild(dot);
    cardImg.parentNode.insertBefore(wrap, cardImg.nextSibling);
    wrap.after(label);

    // El canvas ya muestra la imagen — eliminar el <img> original para evitar duplicado.
    // El alt queda accesible en el aria-label del canvas (ya puesto arriba) y en el <article>.
    cardImg.remove();
    if (imgAlt) canvas.setAttribute('aria-label', imgAlt + '. Toca para oír el color de cada zona. Usa las flechas del teclado para explorar las 9 zonas.');

    // Hint
    const hint = document.createElement('p');
    hint.textContent = '👆 Toca la imagen para oír color y elemento';
    hint.style.cssText = 'font-size:0.7rem;color:#a89e88;text-align:center;margin:4px 0 0;font-family:"IBM Plex Mono",monospace;';
    hint.setAttribute('aria-hidden', 'true');
    label.after(hint);

    // Keyboard grid navigation (9 zones)
    let keyZone = { row: 1, col: 1 }; // centro
    const ROWS = ['arriba','centro','abajo'];
    const COLS = ['izquierda','centro','derecha'];

    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp')    { keyZone.row = Math.max(0, keyZone.row - 1); e.preventDefault(); }
      if (e.key === 'ArrowDown')  { keyZone.row = Math.min(2, keyZone.row + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { keyZone.col = Math.max(0, keyZone.col - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { keyZone.col = Math.min(2, keyZone.col + 1); e.preventDefault(); }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)) {
        const rp = ROWS[keyZone.row];
        const cp = COLS[keyZone.col];
        const key = posToKey(rp, cp);
        const px = Math.round((keyZone.col * 2 + 1) / 6 * SIZE);
        const py = Math.round((keyZone.row * 2 + 1) / 6 * canvas.height);
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        const [h, s, v] = rgbToHsv(pixel[0]/255, pixel[1]/255, pixel[2]/255);
        const colorName = hueToName(h, s, v);
        const objeto = objectMap && objectMap[key] ? objectMap[key] : null;
        const posLabel = (rp === 'centro' && cp === 'centro') ? 'centro' : rp === 'centro' ? cp : cp === 'centro' ? rp : `${rp} ${cp}`;
        const texto = objeto ? `${posLabel}: ${objeto}, ${colorName}` : `${posLabel}, ${colorName}`;
        label.textContent = texto;
        playTone(h, s, centroid.cx, centroid.cy);
        speak(texto);
      }
    });

    function handleTouch(e) {
      if (e.preventDefault && e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = SIZE / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = Math.round((clientX - rect.left) * scaleX);
      const py = Math.round((clientY - rect.top)  * scaleY);
      if (px < 0 || px >= SIZE || py < 0 || py >= canvas.height) return;

      const pixel = ctx.getImageData(px, py, 1, 1).data;
      const [h, s, v] = rgbToHsv(pixel[0]/255, pixel[1]/255, pixel[2]/255);
      const colorName = hueToName(h, s, v);
      const freq = Math.round(200 + h * 800);

      // Punto visual
      const dotX = clientX - rect.left;
      const dotY = clientY - rect.top;
      dot.style.left = dotX + 'px';
      dot.style.top  = dotY + 'px';
      dot.style.background = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
      dot.style.display = 'block';
      clearTimeout(dotTimer);
      dotTimer = setTimeout(() => { dot.style.display = 'none'; }, 1000);

      // Zona 3×3
      const relX = px / SIZE, relY = py / canvas.height;
      const colPos = relX < 0.33 ? 'izquierda' : relX < 0.66 ? 'centro' : 'derecha';
      const rowPos = relY < 0.33 ? 'arriba'    : relY < 0.66 ? 'centro' : 'abajo';
      const key = posToKey(rowPos, colPos);
      const posLabel = (rowPos === 'centro' && colPos === 'centro') ? 'centro' : rowPos === 'centro' ? colPos : colPos === 'centro' ? rowPos : `${rowPos} ${colPos}`;
      const objeto = objectMap && objectMap[key] ? objectMap[key] : null;
      const texto = objeto ? `${posLabel}: ${objeto}, ${colorName}` : `${posLabel}, ${colorName}`;

      const panLabel = centroid.cx > 0.52 ? 'derecha' : centroid.cx < 0.48 ? 'izquierda' : 'centro';
      label.textContent = `${texto}  ·  ${freq} Hz  ·  pan ${panLabel}`;
      playTone(h, s, centroid.cx, centroid.cy);

      const textoHablado = `${texto}, ${freq} hercios, color dominante hacia ${panLabel}`;
      setTimeout(() => speak(textoHablado), 450);
    }

    // ── Eventos táctiles corregidos ────────────────────────────────────────────
    // Mismo patrón que "Tu Imagen": touchend con guard de desplazamiento
    // evita (1) disparar handleTouch al hacer scroll, (2) doble disparo touch+click en móvil.

    let _isTouchDevice = false;
    let _touchStartY   = 0;

    canvas.addEventListener('click', e => {
      if (_isTouchDevice) return;                    // móvil: lo gestiona touchend
      if (e.clientX === 0 && e.clientY === 0) return; // click sintético AT/teclado
      handleTouch(e);
    });

    canvas.addEventListener('touchstart', e => {
      _isTouchDevice  = true;
      _touchStartY    = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      const dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
      if (dy < 10) {                                  // tap, no scroll
        const t = e.changedTouches[0];
        handleTouch({
          preventDefault: () => {},
          cancelable: false,
          touches: [{ clientX: t.clientX, clientY: t.clientY }],
          clientX: t.clientX,
          clientY: t.clientY
        });
      }
    });
  }

  // ── Inicializar todas las cards al cargar ───────────────────────────────────

  function init() {
    loadCentroides(() => {
      const cardImages = document.querySelectorAll('.card-image');
      cardImages.forEach(img => {
        const src = img.getAttribute('src');
        const objectMap = GALLERY_MAPS[src] || null;
        if (img.complete) {
          attachTouchToCard(img, objectMap);
        } else {
          img.addEventListener('load', () => attachTouchToCard(img, objectMap), { once: true });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
