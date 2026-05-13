// ========== TEST AUDITIVO DINÁMICO ==========
const testPairs = [
  {
    pair: 1, correct: 'B',
    audioA: 'White_on_White_(Malevich,_1918).wav',
    audioB: '3840px-Kandinsky_-_Jaune_Rouge_Bleu.wav',
    imgA: 'White_on_White_(Malevich,_1918).png',
    imgB: '3840px-Kandinsky_-_Jaune_Rouge_Bleu.jpg',
    labelA: 'Malevich · Blanco sobre Blanco · Nivel MÍNIMO',
    labelB: 'Kandinsky · Amarillo Rojo Azul · Nivel MÁXIMO'
  },
  {
    pair: 2, correct: 'B',
    audioA: '500px-Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.wav',
    audioB: 'Edgar_Germain_Hilaire_Degas_076.wav',
    imgA: '500px-Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg',
    imgB: 'Edgar_Germain_Hilaire_Degas_076.jpg',
    labelA: 'Rembrandt · Autorretrato · Nivel BAJO',
    labelB: 'Degas · Bailarinas Azules · Nivel MEDIO-ALTO'
  },
  {
    pair: 3, correct: 'B',
    audioA: 'Dalí,_Perfil_del_tiempo,_Vroclavo,_7.wav',
    audioB: 'este.wav',
    imgA: 'Dalí,_Perfil_del_tiempo,_Vroclavo,_7.jpeg',
    imgB: 'este.jpg',
    labelA: 'Dalí · Perfil del Tiempo · Nivel BAJO-MEDIO',
    labelB: 'Kandinsky · Several Circles · Nivel ALTO'
  }
];

const testContainer = document.getElementById('testPairsContainer');

testPairs.forEach(p => {
  const pairDiv = document.createElement('div');
  pairDiv.className = 'test-pair';
  pairDiv.id = `pair-${p.pair}`;
  pairDiv.innerHTML = `
    <div class="test-pair-header">
      <span class="test-pair-num">Par ${p.pair} de 3</span>
      <span class="test-pair-status" id="status-${p.pair}">Escucha y elige</span>
    </div>
    <div class="test-players">
      <div class="test-player">
        <span class="test-player-label">Sonido A</span>
        <audio controls aria-label="Sonido A del par ${p.pair}">
          <source src="${p.audioA}" type="audio/wav">
        </audio>
      </div>
      <div class="test-player">
        <span class="test-player-label">Sonido B</span>
        <audio controls aria-label="Sonido B del par ${p.pair}">
          <source src="${p.audioB}" type="audio/wav">
        </audio>
      </div>
    </div>
    <div class="test-question">
      <p>¿Cuál tiene mayor variabilidad cromática (más color, más caos)?</p>
      <div class="test-buttons">
        <button class="test-btn" data-pair="${p.pair}" data-choice="A" data-correct="${p.correct === 'A'}">El Sonido A</button>
        <button class="test-btn" data-pair="${p.pair}" data-choice="B" data-correct="${p.correct === 'B'}">El Sonido B</button>
        <button class="test-btn" data-pair="${p.pair}" data-choice="?" data-correct="false">No sé</button>
      </div>
    </div>
    <div class="test-reveal" id="reveal-${p.pair}">
      <div class="reveal-item">
        <img src="${p.imgA}" alt="${p.labelA}" loading="lazy">
        <div class="reveal-item-label"><strong>Sonido A ${p.correct === 'A' ? '✓ correcto' : ''}</strong><span>${p.labelA}</span></div>
      </div>
      <div class="reveal-item">
        <img src="${p.imgB}" alt="${p.labelB}" loading="lazy">
        <div class="reveal-item-label"><strong>Sonido B ${p.correct === 'B' ? '✓ correcto' : ''}</strong><span>${p.labelB}</span></div>
      </div>
    </div>
  `;
  testContainer.appendChild(pairDiv);
});

// ── Lógica de respuestas ──────────────────────────────────────────────────────
let score = 0, answered = 0;
const totalPairs = testPairs.length; // FIX: dinámico, no hardcodeado

const liveRegion = document.getElementById('live-region');
function announce(msg) {
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = msg; }, 100);
}

function answerHandler(e) {
  const btn = e.currentTarget;
  const pairNum  = parseInt(btn.getAttribute('data-pair'), 10);
  const choice   = btn.getAttribute('data-choice');
  const isCorrect = btn.getAttribute('data-correct') === 'true';

  // FIX: acceder al objeto del par para leer p.correct dinámicamente
  const pairData = testPairs.find(t => t.pair === pairNum);

  const reveal  = document.getElementById(`reveal-${pairNum}`);
  const status  = document.getElementById(`status-${pairNum}`);
  const pairDiv = document.getElementById(`pair-${pairNum}`);
  const btns    = pairDiv.querySelectorAll('.test-btn');

  btns.forEach(b => {
    b.disabled = true;
    b.setAttribute('aria-disabled', 'true');
  });

  let announcement = '';

  if (choice === '?') {
    status.textContent = '— Sin respuesta';
    status.setAttribute('data-state', 'skip');
    // FIX: usa pairData.correct en vez de 'B' hardcodeado
    announcement = `Par ${pairNum}: sin respuesta. La respuesta correcta era el Sonido ${pairData.correct}.`;

  } else if (isCorrect) {
    score++;
    status.textContent = '✓ Correcto';
    status.setAttribute('data-state', 'correct');
    btns.forEach(b => { if (b.getAttribute('data-choice') === choice) b.classList.add('correct'); });
    announcement = `Par ${pairNum}: ¡Correcto! Elegiste el Sonido ${choice}, que tiene mayor variabilidad cromática.`;

  } else {
    status.textContent = '✗ Incorrecto';
    status.setAttribute('data-state', 'wrong');
    btns.forEach(b => { if (b.getAttribute('data-choice') === choice) b.classList.add('wrong'); });
    // FIX: usa pairData.correct dinámicamente
    announcement = `Par ${pairNum}: incorrecto. Elegiste el Sonido ${choice}. La respuesta correcta era el Sonido ${pairData.correct}.`;
  }

  reveal.classList.add('show');
  answered++;
  announce(announcement);

  if (answered === totalPairs) setTimeout(showScore, 800);
}

function showScore() {
  const panel = document.getElementById('score-panel');
  const numEl = document.getElementById('score-number');
  const msgEl = document.getElementById('score-message');

  numEl.textContent = `${score} de ${totalPairs}`;

  const messages = {
    0: 'El sonido y el color son difíciles de conectar. Sigue escuchando — el cerebro aprende estas correspondencias con la práctica.',
    1: 'Detectaste algo. La correlación entre color y sonido existe, y tu oído ya lo intuye.',
    2: 'Buen oído perceptivo. Distingues estructuras visuales solo a través del sonido.',
    3: 'Extraordinario. Eres capaz de leer pinturas con los oídos. Esto es accesibilidad real.'
  };

  msgEl.textContent = messages[score];
  panel.classList.add('show');
  announce(`Resultado final: ${score} de ${totalPairs} correctas. ${messages[score]}`);

  setTimeout(() => { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
}

function resetTest() {
  score = 0;
  answered = 0;
  document.getElementById('score-panel').classList.remove('show');

  for (let i = 1; i <= totalPairs; i++) {
    const reveal  = document.getElementById(`reveal-${i}`);
    const status  = document.getElementById(`status-${i}`);
    const pairDiv = document.getElementById(`pair-${i}`);

    if (reveal)  reveal.classList.remove('show');
    if (status)  { status.textContent = 'Escucha y elige'; status.removeAttribute('data-state'); }
    if (pairDiv) {
      pairDiv.querySelectorAll('.test-btn').forEach(b => {
        b.disabled = false;
        b.classList.remove('correct', 'wrong');
        b.setAttribute('aria-disabled', 'false');
      });
    }
  }
  announce('Test reiniciado. Puedes volver a intentarlo.');
}

// Asignar eventos — delegación en el contenedor para robustez
testContainer.addEventListener('click', e => {
  const btn = e.target.closest('.test-btn');
  if (btn && !btn.disabled) answerHandler({ currentTarget: btn });
});

const resetBtn = document.getElementById('resetTestBtn');
if (resetBtn) resetBtn.addEventListener('click', resetTest);

// ── Lector de voz (detener al volver a pulsar) ────────────────────────────────
let currentUtterance = null;

document.querySelectorAll('.speak-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const text = this.getAttribute('data-text');
    if (!text || !window.speechSynthesis) return;

    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
      document.querySelectorAll('.speak-btn').forEach(b => {
        b.classList.remove('speaking');
        b.innerHTML = '🔊 Leer descripción';
      });
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 0.95;
    currentUtterance = utter;

    this.classList.add('speaking');
    this.innerHTML = '⏹ Detener';

    utter.onend = () => {
      currentUtterance = null;
      this.classList.remove('speaking');
      this.innerHTML = '🔊 Leer descripción';
    };

    window.speechSynthesis.speak(utter);
  });
});
