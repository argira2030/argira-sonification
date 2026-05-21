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
      <div class="reveal-item" id="reveal-item-${p.pair}-A">
        <img src="${p.imgA}" alt="${p.labelA}" loading="lazy">
        <div class="reveal-item-label"><strong>Sonido A ${p.correct === 'A' ? '✓ correcto' : ''}</strong><span>${p.labelA}</span></div>
        <button type="button" class="argira-spatial-btn argira-scan-btn argira-test-scan" style="margin-top:8px;width:100%;" aria-label="Tour sonoro de ${p.labelA}" aria-pressed="false" data-img="${p.imgA}"><span aria-hidden="true">🕐</span> Tour sonoro</button>
      </div>
      <div class="reveal-item" id="reveal-item-${p.pair}-B">
        <img src="${p.imgB}" alt="${p.labelB}" loading="lazy">
        <div class="reveal-item-label"><strong>Sonido B ${p.correct === 'B' ? '✓ correcto' : ''}</strong><span>${p.labelB}</span></div>
        <button type="button" class="argira-spatial-btn argira-scan-btn argira-test-scan" style="margin-top:8px;width:100%;" aria-label="Tour sonoro de ${p.labelB}" aria-pressed="false" data-img="${p.imgB}"><span aria-hidden="true">🕐</span> Tour sonoro</button>
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

// ── Tour sonoro en los paneles de revelación del test ─────────────────────────
// Cada reveal-item tiene un botón .argira-test-scan que lanza el barrido de reloj
// de la imagen correspondiente. Misma lógica que initClockScan en index.html.

function argiraTestScan(btn) {
  // Encontrar la imagen del mismo reveal-item
  const item = btn.closest('.reveal-item');
  if (!item) return;
  const img = item.querySelector('img');
  if (!img) return;

  // Si ya hay un tour activo en este botón, detenerlo
  if (btn._argiraScanStop) { btn._argiraScanStop(); return; }

  function runScan() {
    const SIZE = 64;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = SIZE;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const N = SIZE * SIZE, NZONES = 13, NBINS = 12;
    const cx0 = (SIZE-1)/2, cy0 = (SIZE-1)/2;
    const R_CTR = (SIZE/2) * 0.25;
    const zSumH = new Float64Array(NZONES), zSumH2 = new Float64Array(NZONES);
    const zCnt  = new Int32Array(NZONES);
    const zHist = new Uint32Array(NZONES * NBINS);

    for (let i = 0; i < N; i++) {
      const r = data[i*4]/255, g = data[i*4+1]/255, b = data[i*4+2]/255;
      const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
      const s = mx > 0 ? d/mx : 0;
      let h = 0;
      if (d > 0) {
        if (mx===r)      h = ((g-b)/d+6)%6;
        else if (mx===g) h = (b-r)/d+2;
        else             h = (r-g)/d+4;
        h /= 6;
      }
      const col = i%SIZE, row = Math.floor(i/SIZE);
      const dx = col-cx0, dy = row-cy0;
      const radius = Math.sqrt(dx*dx+dy*dy);
      let zi;
      if (radius < R_CTR) {
        zi = 12;
      } else {
        const angle = ((Math.atan2(dy,dx)+Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
        zi = Math.min(11, Math.floor(angle/(2*Math.PI)*12));
      }
      zSumH[zi]+=h; zSumH2[zi]+=h*h; zCnt[zi]++;
      if (s < 0.08) continue;
      zHist[zi*NBINS + Math.min(NBINS-1, Math.floor(h*NBINS))]++;
    }

    const zStd = Array.from({length:NZONES},(_,i)=>{
      const n=zCnt[i]; if(!n) return 0;
      const mean=zSumH[i]/n;
      return Math.sqrt(Math.max(0, zSumH2[i]/n - mean*mean));
    });
    const zMax = Math.max(...zStd, 0.001);
    const zNorm = zStd.map(v=>v/zMax);
    const zoneModeH = Array.from({length:NZONES},(_,zi)=>{
      let maxBin=0, maxCount=0;
      for(let b=0;b<NBINS;b++){const c=zHist[zi*NBINS+b];if(c>maxCount){maxCount=c;maxBin=b;}}
      return maxCount===0 ? -1 : (maxBin+0.5)/NBINS;
    });

    function hueToColorName(h) {
      if (h < 0) return null;
      if (window._argiraHueToName) return window._argiraHueToName(h, 0.8, 0.7);
      const deg = h*360;
      if (deg<15||deg>=345) return 'rojo';
      if (deg<45)  return 'naranja';
      if (deg<70)  return 'amarillo';
      if (deg<150) return 'verde';
      if (deg<210) return 'cian';
      if (deg<270) return 'azul';
      if (deg<330) return 'violeta';
      return 'rosa';
    }
    function hourToPan(zi) {
      return zi===12 ? 0 : Math.sin((zi/12)*2*Math.PI);
    }

    if (window.speechSynthesis) speechSynthesis.cancel();
    btn.setAttribute('aria-pressed','true');
    btn.innerHTML = '<span aria-hidden="true">⏹</span> Detener';

    const STEP_MS = 1100;
    let active = true;
    const timers = [];

    function stop() {
      active = false;
      timers.forEach(t=>clearTimeout(t));
      if (window.speechSynthesis) speechSynthesis.cancel();
      btn.setAttribute('aria-pressed','false');
      btn.innerHTML = '<span aria-hidden="true">🕐</span> Tour sonoro';
      btn._argiraScanStop = null;
    }
    btn._argiraScanStop = stop;

    [0,1,2,3,4,5,6,7,8,9,10,11,12].forEach((zi,idx) => {
      const t = setTimeout(() => {
        if (!active) return;
        const hue=zoneModeH[zi], act=zNorm[zi], pan=hourToPan(zi);
        const horaLabel = zi===12 ? 'Centro' : `a las ${zi===0?12:zi} en punto`;
        const colorName = hueToColorName(hue);
        const textoVoz = colorName ? `${horaLabel} — ${colorName}` : horaLabel;
        try {
          const audioCtx = window.ArgiraAudio.resume();
          const freq = hue>=0 ? (200+hue*800) : 400;
          const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
          osc.type='triangle'; osc.frequency.value=freq;
          gain.gain.setValueAtTime(0.12+act*0.45, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.28);
          osc.connect(gain);
          if (audioCtx.createStereoPanner) {
            const panner=audioCtx.createStereoPanner(); panner.pan.value=pan;
            gain.connect(panner); panner.connect(audioCtx.destination);
          } else { gain.connect(audioCtx.destination); }
          osc.start(); osc.stop(audioCtx.currentTime+0.28);
        } catch(e){}
        timers.push(setTimeout(()=>{
          if (!active||!window.speechSynthesis) return;
          speechSynthesis.cancel();
          const u=new SpeechSynthesisUtterance(textoVoz);
          u.lang='es-ES'; u.rate=1.3; u.volume=0.85;
          speechSynthesis.speak(u);
          const lv=document.getElementById('live-region');
          if(lv) lv.textContent=textoVoz;
        },300));
        if (idx===12) timers.push(setTimeout(stop, STEP_MS));
      }, idx*STEP_MS);
      timers.push(t);
    });
  }

  // Si la imagen aún no cargó, esperar
  if (!img.complete || !img.naturalWidth) {
    img.addEventListener('load', runScan, {once:true});
  } else {
    runScan();
  }
}

// Delegación de eventos: clic en cualquier .argira-test-scan dentro del test
document.getElementById('testPairsContainer').addEventListener('click', e => {
  const btn = e.target.closest('.argira-test-scan');
  if (btn) argiraTestScan(btn);
});
