// ========== 1. AudioContext global y desbloqueo móvil ==========
window.ArgiraAudio = (function () {
  let ctx = null;
  return {
    get: function () {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      return ctx;
    },
    resume: function () {
      const c = this.get();
      if (c.state === 'suspended') return c.resume().then(() => c);
      return Promise.resolve(c);
    }
  };
})();

document.addEventListener('touchstart', () => {
  window.ArgiraAudio.resume();
}, { once: true });

// ========== 2. Cola centralizada de voz ==========
window.ArgiraSpeech = {
  current: null,
  speaking: false,
  speak(text, opts = {}) {
    if (!window.speechSynthesis) return;
    if (this.speaking && this.current && this.current.text === text) return;

    window.speechSynthesis.cancel();
    this.speaking = false;
    this.current = null;

    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(text);
      Object.assign(u, { lang: 'es-ES', rate: 0.95, volume: 0.9, ...opts });
      this.current = u;
      this.speaking = true;
      u.onend = () => {
        this.speaking = false;
        this.current = null;
      };
      u.onerror = () => {
        this.speaking = false;
        this.current = null;
      };
      window.speechSynthesis.speak(u);
    };

    // Safari móvil en iOS necesita un tick después del cancel()
    // para procesar la cancelación antes de lanzar la nueva utterance.
    // CRÍTICO: marcamos speaking=true ANTES del setTimeout para que
    // waitForSpeech no se resuelva prematuramente durante los 50ms de espera.
    if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
      this.speaking = true; // bloquear waitForSpeech durante el tick de espera
      setTimeout(doSpeak, 50);
    } else {
      doSpeak();
    }
  },
  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.speaking = false;
      this.current = null;
    }
  }
};

// ========== 3. Sincronización de audio en el test ==========
function initAudioSync() {
  const allAudios = document.querySelectorAll('audio');
  allAudios.forEach(audio => {
    audio.addEventListener('play', () => {
      allAudios.forEach(other => {
        if (other !== audio && !other.paused) other.pause();
      });
    });
  });
}
document.addEventListener('DOMContentLoaded', initAudioSync);

// ========== 4. Test auditivo dinámico (con rutas .wav) ==========
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
if (testContainer) {
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
          <img src="${p.imgA}" alt="${p.labelA}" loading="lazy" crossorigin="anonymous">
          <div class="reveal-item-label"><strong>Sonido A ${p.correct === 'A' ? '✓ correcto' : ''}</strong><span>${p.labelA}</span></div>
          <button type="button" class="argira-spatial-btn argira-scan-btn argira-test-scan" style="margin-top:8px;width:100%;" aria-label="Tour sonoro de ${p.labelA}" aria-pressed="false" data-img="${p.imgA}"><span aria-hidden="true">🕐</span> Tour sonoro</button>
        </div>
        <div class="reveal-item" id="reveal-item-${p.pair}-B">
          <img src="${p.imgB}" alt="${p.labelB}" loading="lazy" crossorigin="anonymous">
          <div class="reveal-item-label"><strong>Sonido B ${p.correct === 'B' ? '✓ correcto' : ''}</strong><span>${p.labelB}</span></div>
          <button type="button" class="argira-spatial-btn argira-scan-btn argira-test-scan" style="margin-top:8px;width:100%;" aria-label="Tour sonoro de ${p.labelB}" aria-pressed="false" data-img="${p.imgB}"><span aria-hidden="true">🕐</span> Tour sonoro</button>
        </div>
      </div>
    `;
    testContainer.appendChild(pairDiv);
  });
}

let score = 0, answered = 0;
const totalPairs = testPairs.length;
const liveRegion = document.getElementById('live-region');

function announce(msg) {
  if (liveRegion) {
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = msg; }, 100);
  }
}

function answerHandler(e) {
  const btn = e.currentTarget;
  const pairNum = parseInt(btn.getAttribute('data-pair'), 10);
  const choice = btn.getAttribute('data-choice');
  const isCorrect = btn.getAttribute('data-correct') === 'true';
  const pairData = testPairs.find(t => t.pair === pairNum);

  const reveal = document.getElementById(`reveal-${pairNum}`);
  const status = document.getElementById(`status-${pairNum}`);
  const pairDiv = document.getElementById(`pair-${pairNum}`);
  const btns = pairDiv.querySelectorAll('.test-btn');

  btns.forEach(b => { b.disabled = true; b.setAttribute('aria-disabled', 'true'); });

  let announcement = '';
  if (choice === '?') {
    status.textContent = '— Sin respuesta';
    status.setAttribute('data-state', 'skip');
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
  if (!panel || !numEl || !msgEl) return;
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
  score = 0; answered = 0;
  const panel = document.getElementById('score-panel');
  if (panel) panel.classList.remove('show');
  for (let i = 1; i <= totalPairs; i++) {
    const reveal = document.getElementById(`reveal-${i}`);
    const status = document.getElementById(`status-${i}`);
    const pairDiv = document.getElementById(`pair-${i}`);
    if (reveal) reveal.classList.remove('show');
    if (status) { status.textContent = 'Escucha y elige'; status.removeAttribute('data-state'); }
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

if (testContainer) {
  testContainer.addEventListener('click', e => {
    const btn = e.target.closest('.test-btn');
    if (btn && !btn.disabled) answerHandler({ currentTarget: btn });
  });
}
const resetBtn = document.getElementById('resetTestBtn');
if (resetBtn) resetBtn.addEventListener('click', resetTest);

// ========== 5. Lector de voz (descripciones) ==========
document.querySelectorAll('.speak-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const text = this.getAttribute('data-text');
    if (!text) return;
    if (window.ArgiraSpeech.current && window.ArgiraSpeech.current.text === text) {
      window.ArgiraSpeech.stop();
      this.classList.remove('speaking');
      this.innerHTML = '🔊 Leer descripción';
    } else {
      window.ArgiraSpeech.stop();
      window.ArgiraSpeech.speak(text, { rate: 0.95 });
      this.classList.add('speaking');
      this.innerHTML = '⏹ Detener';
      const self = this;
      const checkEnd = setInterval(() => {
        if (!window.ArgiraSpeech.current) {
          clearInterval(checkEnd);
          self.classList.remove('speaking');
          self.innerHTML = '🔊 Leer descripción';
        }
      }, 100);
    }
  });
});

// ========== 6. Tour sonoro en los paneles de revelación del test ==========
function argiraTestScan(btn) {
  const item = btn.closest('.reveal-item');
  if (!item) return;
  let img = item.querySelector('img');
  if (!img) return;
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
    const zCnt = new Int32Array(NZONES);
    const zHist = new Uint32Array(NZONES * NBINS);

    for (let i = 0; i < N; i++) {
      const r = data[i*4]/255, g = data[i*4+1]/255, b = data[i*4+2]/255;
      const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
      const s = mx > 0 ? d/mx : 0;
      let h = 0;
      if (d > 0) {
        if (mx===r) h = ((g-b)/d+6)%6;
        else if (mx===g) h = (b-r)/d+2;
        else h = (r-g)/d+4;
        h /= 6;
      }
      const col = i%SIZE, row = Math.floor(i/SIZE);
      const dx = col-cx0, dy = row-cy0;
      const radius = Math.sqrt(dx*dx+dy*dy);
      let zi;
      if (radius < R_CTR) zi = 12;
      else {
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
      if (deg<45) return 'naranja';
      if (deg<70) return 'amarillo';
      if (deg<150) return 'verde';
      if (deg<210) return 'cian';
      if (deg<270) return 'azul';
      if (deg<330) return 'violeta';
      return 'rosa';
    }
    function hourToPan(zi) { return zi===12 ? 0 : Math.sin((zi/12)*2*Math.PI); }

    window.ArgiraSpeech.stop();
    btn.setAttribute('aria-pressed','true');
    btn.innerHTML = '<span aria-hidden="true">⏹</span> Detener';

    const STEP_MS = 1100;
    let active = true;
    const timers = [];

    function stop() {
      active = false;
      timers.forEach(t=>clearTimeout(t));
      window.ArgiraSpeech.stop();
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
          if (!active) return;
          window.ArgiraSpeech.speak(textoVoz, { rate: 1.3 });
          if(liveRegion) liveRegion.textContent=textoVoz;
        },300));
        if (idx===12) timers.push(setTimeout(stop, STEP_MS));
      }, idx*STEP_MS);
      timers.push(t);
    });
  }

  if (img.complete && img.naturalWidth) {
    runScan();
  } else {
    const onLoad = () => {
      img.removeEventListener('load', onLoad);
      runScan();
    };
    img.addEventListener('load', onLoad);
  }
}

if (testContainer) {
  testContainer.addEventListener('click', e => {
    const btn = e.target.closest('.argira-test-scan');
    if (btn) argiraTestScan(btn);
  });
}

// ========== 7. Lupa temporal y canvas inversa (con 30 fps) ==========
// Usar un archivo .wav existente (La Mesa Roja de Matisse)
const wavUrl = 'La_Desserte_rouge,_par_Henri_Matisse.wav';
const speedSlider = document.getElementById('lupaSpeed');
const speedVal = document.getElementById('lupaSpeedVal');
const gainSlider = document.getElementById('lupaShelvingGain');
const freqSlider = document.getElementById('lupaShelvingFreq');
const gainVal = document.getElementById('lupaShelvingGainVal');
const freqVal = document.getElementById('lupaShelvingFreqVal');
const fill = document.getElementById('lupaShelvingFill');
const btnPlay = document.getElementById('lupaBtnPlay');
const btnStop = document.getElementById('lupaBtnStop');
const statusDiv = document.getElementById('lupaStatus');
let source = null, buffer = null, isPlaying = false, currentFilter = null;
const audioCtx = window.ArgiraAudio.get();

function updateShelvingUI() {
  const g = parseFloat(gainSlider.value), f = parseFloat(freqSlider.value);
  if (gainVal) gainVal.textContent = g;
  if (freqVal) freqVal.textContent = f;
  if (fill) fill.style.width = ((g * -1) / 12) * 100 + '%';
  if (currentFilter && audioCtx) {
    currentFilter.gain.cancelScheduledValues(audioCtx.currentTime);
    currentFilter.gain.setValueAtTime(g, audioCtx.currentTime);
    currentFilter.frequency.cancelScheduledValues(audioCtx.currentTime);
    currentFilter.frequency.setValueAtTime(f, audioCtx.currentTime);
  }
}
if (gainSlider && freqSlider) {
  gainSlider.addEventListener('input', updateShelvingUI);
  freqSlider.addEventListener('input', updateShelvingUI);
  updateShelvingUI();
}
if (speedSlider) {
  speedSlider.addEventListener('input', function() {
    const v = parseFloat(this.value);
    if (speedVal) speedVal.textContent = v.toFixed(2) + '×';
    if (source && isPlaying && audioCtx) source.playbackRate.value = v;
  });
}

async function loadBuffer() {
  if (buffer) return buffer;
  if (statusDiv) statusDiv.textContent = 'Cargando audio…';
  try {
    const resp = await fetch(wavUrl);
    if (!resp.ok) throw new Error();
    const ab = await resp.arrayBuffer();
    buffer = await new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(ab, resolve, reject);
    });
    if (statusDiv) statusDiv.textContent = '';
    return buffer;
  } catch(e) {
    if (statusDiv) statusDiv.textContent = `Error: ${wavUrl} no encontrado`;
    return null;
  }
}

async function playLupa() {
  if (isPlaying) stopLupa();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const buf = await loadBuffer();
  if (!buf) return;
  const speed = parseFloat(speedSlider.value);
  source = audioCtx.createBufferSource();
  source.buffer = buf;
  source.playbackRate.value = speed;
  currentFilter = audioCtx.createBiquadFilter();
  currentFilter.type = 'highshelf';
  currentFilter.frequency.value = parseFloat(freqSlider.value);
  currentFilter.gain.value = parseFloat(gainSlider.value);
  source.connect(currentFilter);
  currentFilter.connect(audioCtx.destination);
  source.onended = () => stopLupa();
  source.start();
  isPlaying = true;
  if (btnPlay) { btnPlay.style.background = '#e8c96a'; btnPlay.style.color = '#000'; }
  if (statusDiv) statusDiv.textContent = 'Reproduciendo a ' + speed.toFixed(2) + '× · Matisse';
  if (window.LupaInversa) window.LupaInversa.start();
}

function stopLupa() {
  if (source) { try { source.stop(); } catch(e) {} source = null; }
  if (currentFilter) { currentFilter.disconnect(); currentFilter = null; }
  isPlaying = false;
  if (btnPlay) { btnPlay.style.background = 'rgba(232,201,106,0.08)'; btnPlay.style.color = 'var(--gold)'; }
  if (statusDiv) statusDiv.textContent = '';
  if (window.LupaInversa) window.LupaInversa.stop();
}

if (btnPlay) btnPlay.addEventListener('click', playLupa);
if (btnStop) btnStop.addEventListener('click', stopLupa);

// ========== 8. Argira Inversa (visualización optimizada a 30 fps) ==========
(function() {
  const canvas = document.getElementById('lupa-inversa-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const wrap = document.getElementById('lupa-inversa-wrap');
  const freqLbl = document.getElementById('lupa-inversa-freq-label');

  const RENDER_W = 320, RENDER_H = 200;
  canvas.width = RENDER_W; canvas.height = RENDER_H;
  canvas.style.width = '100%'; canvas.style.height = 'auto';

  const LUT = 4096, MASK = LUT - 1, SCALE = LUT / (Math.PI * 2);
  const cosLUT = new Float32Array(LUT), sinLUT = new Float32Array(LUT);
  for (let i = 0; i < LUT; i++) {
    const a = (i / LUT) * Math.PI * 2;
    cosLUT[i] = Math.cos(a); sinLUT[i] = Math.sin(a);
  }
  const fcos = r => cosLUT[(r * SCALE & MASK + LUT) & MASK];
  const fsin = r => sinLUT[(r * SCALE & MASK + LUT) & MASK];

  let pattern = 'chladni';
  let rafId = null;
  let phase = 0;
  let currentFreq = 432;
  let active = false;
  const MATISSE = { freq: 1480, harmonics: 6, phi: 0.618, complexity: 8 };

  function freqFromSpeed(speed) { return Math.max(20, Math.min(2000, MATISSE.freq * speed)); }
  function getSpeed() { const sl = document.getElementById('lupaSpeed'); return sl ? parseFloat(sl.value) : 1.0; }
  function freqToSpatial(hz) { return Math.max(1, Math.log2(Math.max(20, hz) / 20) * 3.2); }
  function hsl(h, s, l, a) { return `hsla(${h|0},${s}%,${l}%,${a})`; }

  const FRAME_INTERVAL = 1000 / 30; // 30 fps
  let lastFrameTime = 0;

  function drawChladni(freq, phi, complexity, t) {
    const fsp = freqToSpatial(freq);
    const m = Math.max(1, Math.round(fsp));
    const n = Math.max(1, Math.round(fsp * phi));
    const imageData = ctx.createImageData(RENDER_W, RENDER_H);
    const data = imageData.data;
    const hue = (freq / 2000 * 300 + 40) | 0;
    for (let y = 0; y < RENDER_H; y++) {
      const ny = (y / RENDER_H) * Math.PI;
      for (let x = 0; x < RENDER_W; x++) {
        const nx = (x / RENDER_W) * Math.PI;
        const v = Math.abs(fcos(m * nx + t * 0.3) * fcos(n * ny + t * 0.2)
                          - fcos(n * nx + t * 0.25) * fcos(m * ny + t * 0.35));
        const thresh = 0.04 + (complexity / 12) * 0.08;
        const i4 = (y * RENDER_W + x) * 4;
        if (v < thresh) {
          const bri = Math.max(0, 1 - v / thresh);
          const r = Math.round(bri * 60  + bri * 80  * Math.sin(hue * Math.PI / 180));
          const g = Math.round(bri * 180 * (hue > 60 && hue < 200 ? 0.9 : 0.5));
          const b = Math.round(bri * 60  + bri * 80  * Math.sin((hue + 120) * Math.PI / 180));
          data[i4] = Math.min(255, r + 20);
          data[i4+1] = Math.min(255, g + 160);
          data[i4+2] = Math.min(255, b + 20);
          data[i4+3] = 255;
        } else {
          data[i4] = 5; data[i4+1] = 5; data[i4+2] = 8; data[i4+3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function drawLissajous(freq, phi, complexity, t) {
    const cx = RENDER_W/2, cy = RENDER_H/2;
    const rx = RENDER_W*0.44, ry = RENDER_H*0.44;
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    const hue = (freq / 2000 * 300 + 40) | 0;
    const steps = 3000 + complexity * 400;
    const a = Math.max(1, Math.round(freqToSpatial(freq)));
    const b = Math.max(1, Math.round(a * phi));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * Math.PI * 2;
      const x = cx + rx * fcos(a * s + t * 0.4 + phi);
      const y = cy + ry * fsin(b * s + t * 0.3);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, 0, RENDER_W, RENDER_H);
    grad.addColorStop(0, hsl(hue, 80, 65, 0.7));
    grad.addColorStop(0.5, hsl((hue+60)%360, 80, 65, 0.7));
    grad.addColorStop(1, hsl((hue+120)%360, 80, 65, 0.7));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawPolar(freq, phi, complexity, t) {
    const cx = RENDER_W/2, cy = RENDER_H/2;
    const R = Math.min(RENDER_W, RENDER_H) * 0.44;
    const hue = (freq / 2000 * 300 + 40) | 0;
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    const petals = Math.max(2, Math.round(freqToSpatial(freq)));
    const steps = 1200 + complexity * 200;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2 * petals;
      const r = R * Math.abs(fcos(angle + t * 0.5));
      const x = cx + r * Math.cos(angle / petals);
      const y = cy + r * Math.sin(angle / petals);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hsl(hue, 75, 60, 0.75);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function drawPhi(freq, phi, complexity, t) {
    const cx = RENDER_W/2, cy = RENDER_H/2;
    const hue = (freq / 2000 * 300 + 40) | 0;
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    const turns = 4 + complexity * 0.5;
    const steps = 2000 + complexity * 300;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * Math.PI * 2 * turns;
      const r = (Math.min(RENDER_W, RENDER_H) * 0.44) * (i / steps);
      const x = cx + r * fcos(s * phi + t * 0.3);
      const y = cy + r * fsin(s + t * 0.25);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(RENDER_W,RENDER_H)*0.44);
    grad.addColorStop(0, hsl(hue, 85, 70, 0.9));
    grad.addColorStop(1, hsl((hue+180)%360, 70, 55, 0.4));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  function drawCurrentPattern() {
    const speed = getSpeed();
    currentFreq = freqFromSpeed(speed);
    if (freqLbl) freqLbl.textContent = currentFreq.toFixed(0) + ' Hz · ' + speed.toFixed(2) + '×';
    phase += 0.018 * speed;
    switch (pattern) {
      case 'chladni': drawChladni(currentFreq, MATISSE.phi, MATISSE.complexity, phase); break;
      case 'lissajous': drawLissajous(currentFreq, MATISSE.phi, MATISSE.complexity, phase); break;
      case 'polar': drawPolar(currentFreq, MATISSE.phi, MATISSE.complexity, phase); break;
      case 'phi': drawPhi(currentFreq, MATISSE.phi, MATISSE.complexity, phase); break;
    }
  }

  function renderFrame(now) {
    if (!active) { rafId = null; return; }
    if (now - lastFrameTime >= FRAME_INTERVAL) {
      lastFrameTime = now;
      drawCurrentPattern();
    }
    rafId = requestAnimationFrame(renderFrame);
  }

  window.LupaInversa = {
    start() {
      if (wrap) wrap.classList.add('visible');
      if (!active) {
        active = true;
        lastFrameTime = performance.now();
        if (!rafId) renderFrame(lastFrameTime);
      }
    },
    stop() {
      if (wrap) wrap.classList.remove('visible');
      active = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      phase = 0;
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (window.LupaInversa) window.LupaInversa.stop();
    } else {
      if (wrap && wrap.classList.contains('visible')) window.LupaInversa.start();
    }
  });

  document.querySelectorAll('.lupa-pchip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lupa-pchip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pattern = btn.dataset.pattern;
      phase = 0;
    });
  });
})();

// ========== 9. Análisis y sonificación de imagen subida ==========
const zone = document.getElementById('tu-upload-zone');
const fileInput = document.getElementById('tu-file-input');
const canvasHidden = document.getElementById('tu-canvas');
const panel = document.getElementById('tu-panel');
const preview = document.getElementById('tu-preview');
const nombreSpan = document.getElementById('tu-nombre');
const metricasEl = document.getElementById('tu-metricas');
const chromaPct = document.getElementById('tu-chroma-pct');
const chromaBar = document.getElementById('tu-chroma-bar');
const paramsGrid = document.getElementById('tu-params-grid');
const speedSliderTu = document.getElementById('tu-speed');
const speedValTu = document.getElementById('tu-speed-val');
const btnPlayTu = document.getElementById('tu-btn-play');
const btnStopTu = document.getElementById('tu-btn-stop');
const btnDL = document.getElementById('tu-btn-download');
const statusEl = document.getElementById('tu-status');
const tuGainSlider = document.getElementById('tuShelvingGain');
const tuFreqSlider = document.getElementById('tuShelvingFreq');
const tuGainVal = document.getElementById('tuShelvingGainVal');
const tuFreqVal = document.getElementById('tuShelvingFreqVal');
const tuFill = document.getElementById('tuShelvingFill');

let wavBuffer = null, wavPCM = null, sourceTu = null, currentFilterTu = null, isPlayingTu = false, currentFileName = 'mi-imagen';

function updateTuShelvingUI() {
  const g = parseFloat(tuGainSlider.value), f = parseFloat(tuFreqSlider.value);
  if (tuGainVal) tuGainVal.textContent = g;
  if (tuFreqVal) tuFreqVal.textContent = f;
  if (tuFill) tuFill.style.width = ((g * -1) / 12) * 100 + '%';
  if (currentFilterTu && audioCtx) {
    currentFilterTu.gain.cancelScheduledValues(audioCtx.currentTime);
    currentFilterTu.gain.setValueAtTime(g, audioCtx.currentTime);
    currentFilterTu.frequency.cancelScheduledValues(audioCtx.currentTime);
    currentFilterTu.frequency.setValueAtTime(f, audioCtx.currentTime);
  }
}
if (tuGainSlider && tuFreqSlider) {
  tuGainSlider.addEventListener('input', updateTuShelvingUI);
  tuFreqSlider.addEventListener('input', updateTuShelvingUI);
  updateTuShelvingUI();
}

function rgbToHsv(r,g,b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
  let h = 0;
  if (d>0) {
    if (max===r) h = ((g-b)/d+6)%6;
    else if (max===g) h = (b-r)/d+2;
    else h = (r-g)/d+4;
    h/=6;
  }
  return [h, max>0?d/max:0, max];
}

// Desviación circular
function circularStd(hues) {
  const TAU = 2 * Math.PI;
  let sumSin = 0, sumCos = 0;
  for (let h of hues) {
    const angle = h * TAU;
    sumSin += Math.sin(angle);
    sumCos += Math.cos(angle);
  }
  const R = Math.hypot(sumSin, sumCos) / hues.length;
  const Rclamped = Math.max(R, 0.001);
  const circularStdRad = Math.sqrt(-2 * Math.log(Rclamped));
  return Math.min(0.5, circularStdRad / TAU);
}

function analyzePixels(imgData, size) {
  const d = imgData.data;
  const N = size*size;
  let sumH=0, sumS=0, sumV=0;
  let hVals = new Array(N);
  let sVals = new Float32Array(N), vVals = new Float32Array(N);
  for(let i=0;i<N;i++) {
    const r=d[i*4]/255, g=d[i*4+1]/255, b=d[i*4+2]/255;
    const hsv=rgbToHsv(r,g,b);
    hVals[i]=hsv[0]; sVals[i]=hsv[1]; vVals[i]=hsv[2];
    sumH+=hsv[0]; sumS+=hsv[1]; sumV+=hsv[2];
  }
  const hueMean=sumH/N, satMean=sumS/N, valMean=sumV/N;
  const hueStd = circularStd(hVals);
  const gray=new Float32Array(N);
  for(let i=0;i<N;i++) gray[i]=vVals[i];
  let sobel=0, sobelCount=0;
  for(let y=1;y<size-1;y++) {
    for(let x=1;x<size-1;x++) {
      const tl=gray[(y-1)*size+(x-1)], tc=gray[(y-1)*size+x], tr=gray[(y-1)*size+(x+1)];
      const ml=gray[y*size+(x-1)], mr=gray[y*size+(x+1)];
      const bl=gray[(y+1)*size+(x-1)], bc=gray[(y+1)*size+x], br=gray[(y+1)*size+(x+1)];
      const gx=-tl-2*ml-bl+tr+2*mr+br;
      const gy=-tl-2*tc-tr+bl+2*bc+br;
      sobel+=Math.sqrt(gx*gx+gy*gy);
      sobelCount++;
    }
  }
  const irregularidad=Math.min(sobel/sobelCount/1.5,1.0);
  const fractalD=1.0+hueStd*0.8+irregularidad*0.2;
  let weightSumX=0,weightSumY=0,weightTotal=0;
  for(let i=0;i<N;i++) {
    const s=sVals[i];
    if(s<0.08) continue;
    const col=i%size, row=Math.floor(i/size);
    const w=s*s;
    weightSumX+=col*w; weightSumY+=row*w; weightTotal+=w;
  }
  const centroidX=weightTotal>0?weightSumX/weightTotal/(size-1):0.5;
  const centroidY=weightTotal>0?weightSumY/weightTotal/(size-1):0.5;
  return {
    hueMean,satMean,valMean,hueStd,irregularidad,fractalD,
    freqBase:200+irregularidad*800, centroidX, centroidY
  };
}

function synthesize(m) {
  const SR=44100, DUR=8.0, N=Math.floor(SR*DUR);
  const out=new Float32Array(N);
  const pitchY=m.centroidY!==undefined?m.centroidY:0.5;
  const yFactor=1.25-pitchY*0.50;
  const freqBase=m.freqBase*yFactor;
  const nHarmonics=Math.round(3+m.satMean*10);
  const oddBias=Math.min(m.hueStd*1.5,1.0);
  const NYQUIST=SR/2;
  const modDepth=80+m.fractalD*80+m.hueStd*120;
  const modDepthSafe=Math.min(modDepth,freqBase*0.9);
  const modRate=1.0+m.hueStd*6;
  const tempoBPM=70+m.hueStd*50;
  const decay=0.6;
  for(let i=0;i<N;i++) {
    const t=i/SR;
    const modulator=modDepthSafe*Math.sin(2*Math.PI*modRate*t);
    let s=0;
    for(let k=1;k<=nHarmonics;k++) {
      let freqRaw=freqBase*k+modulator;
      const freqK=Math.max(20,Math.min(NYQUIST-100,freqRaw));
      let amp=1.0/Math.pow(k,1.5);
      if(k%2===0) amp*=(1.0-oddBias*0.9);
      s+=amp*Math.sin(2*Math.PI*freqK*t);
    }
    out[i]=s;
  }
  for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i] * 1.2);
  let maxVal=0;
  for(let i=0;i<N;i++) if(Math.abs(out[i])>maxVal) maxVal=Math.abs(out[i]);
  if(maxVal>0) for(let i=0;i<N;i++) out[i]/=maxVal;
  const beatSamples=Math.floor(SR*60/tempoBPM);
  const attackSamples=Math.floor(0.02*SR);
  const relSamples=Math.floor(Math.min(decay,60/tempoBPM*0.8)*SR);
  for(let beat=0;beat*beatSamples<N;beat++) {
    const bs=beat*beatSamples;
    for(let i=0;i<attackSamples;i++) {
      const idx=bs+i; if(idx<N) out[idx]*=i/attackSamples;
    }
    const be=bs+beatSamples;
    for(let i=0;i<relSamples;i++) {
      const idx=be-relSamples+i;
      if(idx>=0&&idx<N) out[idx]*=i/relSamples;
    }
  }
  const fadeSamples=Math.floor(0.5*SR);
  for(let i=0;i<fadeSamples;i++) out[N-fadeSamples+i]*=1-i/fadeSamples;
  maxVal=0;
  for(let i=0;i<N;i++) if(Math.abs(out[i])>maxVal) maxVal=Math.abs(out[i]);
  if(maxVal>0) for(let i=0;i<N;i++) out[i]/=maxVal;
  return out;
}

function pcmToAudioBuffer(pcm) {
  const buf = audioCtx.createBuffer(1, pcm.length, 44100);
  buf.copyToChannel(pcm, 0);
  return buf;
}

function processFile(file) {
  currentFileName = file.name.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    if (preview) preview.src = url;
    if (nombreSpan) nombreSpan.textContent = file.name;
    if (statusEl) statusEl.textContent = 'Analizando…';
    const SIZE = 256;
    canvasHidden.width = SIZE; canvasHidden.height = SIZE;
    const ctx = canvasHidden.getContext('2d');
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
    const metrics = analyzePixels(imgData, SIZE);
    renderMetrics(metrics, file.name);
    wavPCM = synthesize(metrics);
    wavPCM._centroidX = metrics.centroidX;
    if (!wavBuffer) wavBuffer = pcmToAudioBuffer(wavPCM);
    if (statusEl) statusEl.textContent = 'Audio listo · Pulsa Escuchar';
    if (panel) panel.style.display = 'block';
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    if (window._argiraTouchInit) window._argiraTouchInit(img);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function renderMetrics(m, filename) {
  const pct = Math.round((m.hueStd - 0.016) / (0.364 - 0.016) * 100);
  const pctClamped = Math.min(Math.max(pct, 0), 100);
  let nivel = 'MÍNIMO';
  if (m.hueStd > 0.040) nivel = 'MUY BAJO';
  if (m.hueStd > 0.080) nivel = 'BAJO';
  if (m.hueStd > 0.130) nivel = 'BAJO-MEDIO';
  if (m.hueStd > 0.180) nivel = 'MEDIO';
  if (m.hueStd > 0.230) nivel = 'MEDIO-ALTO';
  if (m.hueStd > 0.270) nivel = 'ALTO';
  if (m.hueStd > 0.310) nivel = 'MUY ALTO';
  if (m.hueStd > 0.345) nivel = 'MÁXIMO';
  if (chromaPct) chromaPct.textContent = pctClamped.toFixed(0) + '% · ' + nivel;
  if (chromaBar) chromaBar.style.width = pctClamped.toFixed(1) + '%';
  if (metricasEl) metricasEl.innerHTML = `hue_std: <strong>${m.hueStd.toFixed(4)}</strong> · Irregularidad: <strong>${m.irregularidad.toFixed(4)}</strong> · Saturación: <strong>${m.satMean.toFixed(3)}</strong> · Pan: <strong>${m.centroidX < 0.4 ? '← izq' : m.centroidX > 0.6 ? 'der →' : '· centro'}</strong> · Pitch: <strong>${m.centroidY < 0.4 ? '↑ agudo' : m.centroidY > 0.6 ? '↓ grave' : '· medio'}</strong>`;
  if (paramsGrid) {
    const params = [ ['Frecuencia base', m.freqBase.toFixed(1) + ' Hz'],
                     ['Dimensión fractal', m.fractalD.toFixed(4)],
                     ['Armónicos', Math.round(3 + m.satMean * 10)],
                     ['Tempo (estim.)', Math.round(70 + m.hueStd * 50) + ' BPM'] ];
    paramsGrid.innerHTML = params.map(([k,v]) => `<div style="padding:12px 20px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);"><div style="font-size:0.65rem;font-family:'Cinzel',serif;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:2px;">${k}</div><div style="font-family:'IBM Plex Mono',monospace;font-size:0.9rem;color:var(--gold);">${v}</div></div>`).join('');
  }
}

function pararTu() {
  if (sourceTu) { try { sourceTu.stop(); } catch(e) {} sourceTu = null; }
  if (currentFilterTu) { currentFilterTu.disconnect(); currentFilterTu = null; }
  isPlayingTu = false;
  if (btnPlayTu) { btnPlayTu.style.background = 'rgba(232,201,106,0.08)'; btnPlayTu.style.color = 'var(--gold)'; }
  if (statusEl) statusEl.textContent = '';
}

function pcmToStereoWavBlob(pcm, sr, pan) {
  const numSamples = pcm.length;
  const theta = ((pan + 1) / 2) * (Math.PI / 2);
  const gainL = Math.cos(theta), gainR = Math.sin(theta);
  const buffer = new ArrayBuffer(44 + numSamples * 4);
  const view = new DataView(buffer);
  function w(off, str) { for (let i=0;i<str.length;i++) view.setUint8(off+i, str.charCodeAt(i)); }
  function u16(off,v) { view.setUint16(off, v, true); }
  function u32(off,v) { view.setUint32(off, v, true); }
  w(0, 'RIFF'); u32(4, 36 + numSamples * 4); w(8, 'WAVE'); w(12, 'fmt ');
  u32(16, 16); u16(20, 1); u16(22, 2); u32(24, sr); u32(28, sr * 4);
  u16(32, 4); u16(34, 16); w(36, 'data'); u32(40, numSamples * 4);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    const int16 = s < 0 ? s * 32768 : s * 32767;
    view.setInt16(offset, Math.round(int16 * gainL), true);
    view.setInt16(offset + 2, Math.round(int16 * gainR), true);
    offset += 4;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

if (zone && fileInput) {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.background = 'rgba(232,201,106,0.1)'; });
  zone.addEventListener('dragleave', () => { zone.style.background = 'transparent'; });
  zone.addEventListener('drop', e => { e.preventDefault(); zone.style.background = 'transparent'; const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) processFile(f); });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) processFile(fileInput.files[0]); });
}

if (speedSliderTu) {
  speedSliderTu.addEventListener('input', function() { const v = parseFloat(this.value); if (speedValTu) speedValTu.textContent = v.toFixed(2) + '×'; if (sourceTu && isPlayingTu) sourceTu.playbackRate.value = v; });
}
if (btnPlayTu) {
  btnPlayTu.addEventListener('click', async function() {
    if (!wavBuffer) return;
    pararTu();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const speed = parseFloat(speedSliderTu.value);
    sourceTu = audioCtx.createBufferSource();
    sourceTu.buffer = wavBuffer;
    sourceTu.playbackRate.value = speed;
    currentFilterTu = audioCtx.createBiquadFilter();
    currentFilterTu.type = 'highshelf';
    currentFilterTu.frequency.value = parseFloat(tuFreqSlider.value);
    currentFilterTu.gain.value = parseFloat(tuGainSlider.value);
    sourceTu.connect(currentFilterTu);
    if (wavPCM && wavPCM._centroidX !== undefined && audioCtx.createStereoPanner) {
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, (wavPCM._centroidX - 0.5) * 2));
      currentFilterTu.connect(panner);
      panner.connect(audioCtx.destination);
    } else {
      currentFilterTu.connect(audioCtx.destination);
    }
    sourceTu.onended = () => { isPlayingTu = false; if (btnPlayTu) { btnPlayTu.style.background = 'rgba(232,201,106,0.08)'; btnPlayTu.style.color = 'var(--gold)'; } if (statusEl) statusEl.textContent = ''; };
    sourceTu.start();
    isPlayingTu = true;
    if (btnPlayTu) { btnPlayTu.style.background = '#e8c96a'; btnPlayTu.style.color = '#000'; }
    if (statusEl) statusEl.textContent = 'Reproduciendo a ' + speed.toFixed(2) + '× · ' + currentFileName;
  });
}
if (btnStopTu) btnStopTu.addEventListener('click', pararTu);
if (btnDL) {
  btnDL.addEventListener('click', function() {
    if (!wavPCM) return;
    const speed = parseFloat(speedSliderTu.value);
    const exportSR = Math.round(44100 * speed);
    const pan = (wavPCM._centroidX !== undefined) ? Math.max(-1, Math.min(1, (wavPCM._centroidX - 0.5) * 2)) : 0;
    const wavBlob = pcmToStereoWavBlob(wavPCM, exportSR, pan);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    const speedTag = speed !== 1.0 ? '_' + speed.toFixed(2).replace('.', '') + 'x' : '';
    a.download = currentFileName + speedTag + '_argira.wav';
    a.click();
    URL.revokeObjectURL(url);
    if (statusEl) statusEl.textContent = 'WAV descargado a ' + speed.toFixed(2) + '× · ' + a.download;
  });
}

window._argiraAnalyze = analyzePixels;
window._argiraSynthesize = synthesize;
window._argiraPcmToBuffer = pcmToAudioBuffer;
window._argiraHueToName = function(h, s, v) {
  if (s < 0.12) {
    if (v > 0.85) return 'blanco';
    if (v < 0.20) return 'negro';
    return 'gris';
  }
  const deg = h * 360;
  if (deg < 15 || deg >= 345) return 'rojo';
  if (deg < 45) return 'naranja';
  if (deg < 70) return 'amarillo';
  if (deg < 150) return 'verde';
  if (deg < 210) return 'cian';
  if (deg < 270) return 'azul';
  if (deg < 330) return 'violeta';
  return 'rosa';
};

// ========== 10. Inicializaciones de la galería (sin cambios, solo se declaran) ==========
function initGallerySonify() {
  const cards = document.querySelectorAll('#galeria .card');
  cards.forEach(card => {
    const img = card.querySelector('.card-image');
    const scanBtn = card.querySelector('.argira-scan-btn');
    if (!img || !scanBtn) return;

    const sliderWrap = document.createElement('div');
    sliderWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px;padding:0 2px;';
    sliderWrap.innerHTML = `
      <span style="font-family:'Cinzel',serif;font-size:0.68rem;letter-spacing:0.1em;color:var(--text-dim);white-space:nowrap;">🐢 Ritmo</span>
      <input type="range" min="0.25" max="1.5" step="0.05" value="1.0" style="flex:1;accent-color:rgba(220,130,200,0.8);cursor:pointer;">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:0.72rem;color:var(--gold);min-width:3ch;">1×</span>`;
    const slider = sliderWrap.querySelector('input');
    const speedLbl = sliderWrap.querySelector('span:last-child');

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      speedLbl.textContent = v.toFixed(2).replace(/\.?0+$/, '') + '×';
      if (source) source.playbackRate.value = v;
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'argira-spatial-btn argira-sonify-btn';
    btn.setAttribute('aria-label', 'Oír la paleta sonora completa de esta obra a tu ritmo');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<span aria-hidden="true">🎵</span> Oír la obra';

    scanBtn.before(sliderWrap);
    sliderWrap.after(btn);

    let source = null, isPlaying = false, cachedPcm = null, cachedCx = 0.5;

    function stop() {
      if (source) { try { source.stop(); } catch(e) {} source = null; }
      isPlaying = false;
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<span aria-hidden="true">🎵</span> Oír la obra';
    }

    function play(pcm, centroidX) {
      const audioCtx = window.ArgiraAudio.resume();
      const buf = window._argiraPcmToBuffer(pcm);
      source = audioCtx.createBufferSource();
      source.buffer = buf;
      source.playbackRate.value = parseFloat(slider.value);
      if (audioCtx.createStereoPanner) {
        const panner = audioCtx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, (centroidX - 0.5) * 2));
        source.connect(panner);
        panner.connect(audioCtx.destination);
      } else {
        source.connect(audioCtx.destination);
      }
      source.onended = stop;
      source.start();
      isPlaying = true;
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '<span aria-hidden="true">⏹</span> Detener';
    }

    function synthesizeAndPlay() {
      if (cachedPcm) { play(cachedPcm, cachedCx); return; }
      btn.innerHTML = '<span aria-hidden="true">⏳</span> Calculando…';
      btn.disabled = true;
      setTimeout(() => {
        try {
          const SIZE = 128;
          const cvs = document.createElement('canvas');
          cvs.width = cvs.height = SIZE;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
          const m = window._argiraAnalyze(imgData, SIZE);
          cachedPcm = window._argiraSynthesize(m);
          cachedCx = m.centroidX;
          btn.disabled = false;
          play(cachedPcm, cachedCx);
        } catch(e) {
          btn.disabled = false;
          btn.innerHTML = '<span aria-hidden="true">🎵</span> Oír la obra';
        }
      }, 16);
    }

    btn.addEventListener('click', () => {
      if (isPlaying) { stop(); return; }
      if (!img.complete || !img.naturalWidth) {
        img.addEventListener('load', synthesizeAndPlay, { once: true });
      } else {
        synthesizeAndPlay();
      }
    });
  });
}

function initGalleryTouch() {
  const cards = document.querySelectorAll('#galeria .card');
  cards.forEach(card => {
    const img = card.querySelector('.card-image');
    const artistEl = card.querySelector('.card-artist');
    const workEl = card.querySelector('.card-work');
    if (!img || !artistEl || !workEl) return;

    const titulo = workEl.textContent.trim();
    const artista = artistEl.textContent.trim();
    const anuncio = titulo + ', ' + artista;
    const SIZE = 256;
    const tc = document.createElement('canvas');
    tc.width = SIZE; tc.height = SIZE;
    tc.setAttribute('aria-label', 'Toca la imagen para oír posición y color · ' + titulo);
    tc.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;cursor:crosshair;z-index:2;border-radius:inherit;';

    const dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;width:18px;height:18px;border-radius:50%;border:2px solid #fff;pointer-events:none;transform:translate(-50%,-50%);display:none;z-index:3;box-shadow:0 0 6px rgba(0,0,0,0.7);';
    let dotTimer = null;
    const colorLabel = document.createElement('div');
    colorLabel.className = 'argira-color-label';
    colorLabel.style.cssText = 'text-align:center;margin-top:6px;font-family:"IBM Plex Mono",monospace;font-size:0.8rem;color:var(--gold);min-height:18px;';

    const hint = document.createElement('p');
    hint.textContent = '👆 Toca la imagen para oír posición y color';
    hint.style.cssText = 'font-size:0.72rem;color:var(--text-dim);text-align:center;font-family:"Cinzel",serif;letter-spacing:0.1em;text-transform:uppercase;margin:4px 0 0;';
    const hintHeadphones = document.createElement('p');
    hintHeadphones.textContent = '🎧 Usa auriculares para oír la posición espacial del color';
    hintHeadphones.style.cssText = 'font-size:0.68rem;color:var(--text-dim);text-align:center;font-family:"Cinzel",serif;letter-spacing:0.08em;text-transform:uppercase;margin:2px 0 0;opacity:0.7;';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:block;line-height:0;overflow:hidden;';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    wrap.appendChild(tc);
    wrap.appendChild(dot);
    wrap.after(colorLabel);
    colorLabel.after(hintHeadphones);
    wrap.after(hint);

    const PROXY_URL = 'https://argira-proxy.onrender.com/analyze';
    let objectMap = null, objectMapSent = false, objectMapFetched = false;
    function fetchObjectMap() {
      if (objectMapSent) return;
      objectMapSent = true;
      try {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = 512; tmpCanvas.height = 512;
        tmpCanvas.getContext('2d').drawImage(img, 0, 0, 512, 512);
        const base64 = tmpCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        const _ctrl1 = new AbortController();
        const _tid1 = setTimeout(() => _ctrl1.abort(), 10000);
        fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mediaType: 'image/jpeg' }),
          signal: _ctrl1.signal
        }).then(r => r.json()).then(data => {
          clearTimeout(_tid1);
          objectMap = data;
          card._argiraObjectMap = data;
          card._argiraMapFetched = true;
        }).catch(() => {
          clearTimeout(_tid1);
          objectMap = null;
          card._argiraMapFetched = true; // marcar como resuelto aunque haya fallado
        });
      } catch(e) {
        objectMap = null;
        card._argiraMapFetched = true;
      }
    }
    card._argiraFetchObjectMap = fetchObjectMap;
    card._argiraResetObjectMap = () => { objectMapSent = false; card._argiraMapFetched = false; card._argiraObjectMap = null; };

    function posToKey(rowPos, colPos) {
      const r = rowPos === 'arriba' ? 'arriba' : rowPos === 'abajo' ? 'abajo' : 'centro';
      const c = colPos === 'izquierda' ? 'izquierda' : colPos === 'derecha' ? 'derecha' : 'centro';
      if (r === 'centro' && c === 'centro') return 'centro';
      if (r === 'centro') return `centro_${c}`;
      if (c === 'centro') return `${r}_centro`;
      return `${r}_${c}`;
    }

    let primed = false, firstTouch = true;
    let centroid = { cx: 0.5, cy: 0.5 };
    function computeChromaticCentroid(ctx2d) {
      const STEP = 4;
      let xSum = 0, ySum = 0, wSum = 0;
      try {
        const data = ctx2d.getImageData(0, 0, SIZE, SIZE).data;
        for (let row = 0; row < SIZE; row += STEP) {
          for (let col = 0; col < SIZE; col += STEP) {
            const i = (row * SIZE + col) * 4;
            const r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255;
            const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
            const sat = max > 0 ? d/max : 0;
            if (sat < 0.08) continue;
            xSum += col * sat; ySum += row * sat; wSum += sat;
          }
        }
      } catch(e) { return; }
      if (wSum > 0) { centroid.cx = xSum / wSum / SIZE; centroid.cy = ySum / wSum / SIZE; }
    }

    function prime() {
      if (primed) return;
      primed = true;
      const ctx = tc.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      setTimeout(() => computeChromaticCentroid(ctx), 150);
    }
    if (img.complete && img.naturalWidth > 0) prime();
    else img.addEventListener('load', prime);

    function handleGalleryTouch(e) {
      prime();
      fetchObjectMap();
      const rect = tc.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = SIZE / rect.width, scaleY = SIZE / rect.height;
      const px = Math.round((clientX - rect.left) * scaleX);
      const py = Math.round((clientY - rect.top) * scaleY);
      if (px < 0 || px >= SIZE || py < 0 || py >= SIZE) return;

      const ctx = tc.getContext('2d');
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      const r = pixel[0]/255, g = pixel[1]/255, b = pixel[2]/255;
      const [h, s, v] = rgbToHsv(r,g,b);

      dot.style.left = (clientX - rect.left) + 'px';
      dot.style.top = (clientY - rect.top) + 'px';
      dot.style.background = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
      dot.style.display = 'block';
      if (dotTimer) clearTimeout(dotTimer);
      dotTimer = setTimeout(() => { dot.style.display = 'none'; }, 1100);

      const nombre = window._argiraHueToName(h,s,v);
      const freq = Math.round(200 + h * 800);
      const panArrow = centroid.cx > 0.60 ? 'derecha' : centroid.cx > 0.53 ? 'centro-derecha' : centroid.cx < 0.40 ? 'izquierda' : centroid.cx < 0.47 ? 'centro-izquierda' : 'centro';
      colorLabel.textContent = `${nombre}  ·  ${freq} Hz  ·  pan ${panArrow}`;

      const relX = px / SIZE, relY = py / SIZE;
      const colPos = relX < 0.33 ? 'izquierda' : relX < 0.66 ? 'centro' : 'derecha';
      const rowPos = relY < 0.33 ? 'arriba' : relY < 0.66 ? 'centro' : 'abajo';
      const posicion = (rowPos === 'centro' && colPos === 'centro') ? 'centro' : rowPos === 'centro' ? colPos : colPos === 'centro' ? rowPos : `${rowPos} ${colPos}`;

      try {
        const audioCtx = window.ArgiraAudio.resume();
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.type = s < 0.12 ? 'sine' : 'triangle';
        osc.frequency.value = 200 + h * 800;
        gain.gain.setValueAtTime(0.15 + s * 0.55, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.32);
        osc.connect(gain);
        if (audioCtx.createStereoPanner) {
          const panner = audioCtx.createStereoPanner();
          const CX_MIN = 0.38, CX_MAX = 0.65;
          const panNorm = (centroid.cx - CX_MIN) / (CX_MAX - CX_MIN);
          panner.pan.value = Math.max(-1, Math.min(1, panNorm * 2 - 1));
          gain.connect(panner);
          panner.connect(audioCtx.destination);
        } else {
          gain.connect(audioCtx.destination);
        }
        osc.start();
        osc.stop(audioCtx.currentTime + 0.32);
      } catch(e) {}

      setTimeout(() => {
        const key = posToKey(rowPos, colPos);
        const objeto = objectMap && objectMap[key] ? objectMap[key] : null;
        if (firstTouch) {
          firstTouch = false;
          window.ArgiraSpeech.speak(anuncio, { rate: 1.0 });
          const estimado = Math.max(6000, anuncio.length * 100);
          setTimeout(() => {
            const texto2 = objeto ? `${posicion}, ${nombre}, ${freq} hercios, pan ${panArrow}, ${objeto}` : `${posicion}, ${nombre}, ${freq} hercios, pan ${panArrow}`;
            window.ArgiraSpeech.speak(texto2, { rate: 0.92 });
          }, estimado);
        } else {
          const texto = objeto ? `${posicion}, ${nombre}, ${freq} hercios, pan ${panArrow}, ${objeto}` : `${posicion}, ${nombre}, ${freq} hercios, pan ${panArrow}`;
          window.ArgiraSpeech.speak(texto, { rate: 0.92 });
        }
      }, 500);
    }

    let touchMode = 'tap';

    const modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:6px;margin:8px 0 2px;justify-content:center;flex-wrap:wrap;';
    modeBar.innerHTML = `
      <button class="argira-mode-btn argira-mode-active" data-mode="tap">👆 Tocar</button>
      <button class="argira-mode-btn" data-mode="sweep">🖐 Barrido</button>
      <button class="argira-mode-btn" data-mode="braille">🦯 Braille</button>`;

    const modeStatus = document.createElement('p');
    modeStatus.style.cssText = 'font-size:0.68rem;color:var(--text-dim);text-align:center;font-family:"Cinzel",serif;letter-spacing:0.1em;margin:2px 0 0;';
    modeStatus.textContent = '✓ Scroll libre';

    const MODE_INFO = {
      tap:    { status: '✓ Scroll libre',     announce: 'Modo tocar. Scroll libre. Toca la imagen para oír posición y color.' },
      sweep:  { status: '🔒 Scroll bloqueado', announce: 'Modo barrido activado. Scroll bloqueado. Desliza para explorar tonos.' },
      braille:{ status: '🔒 Scroll bloqueado', announce: 'Modo braille activado. Scroll bloqueado. Desliza despacio, oirás posición y descripción de cada zona.' }
    };

    wrap.after(modeBar);
    modeBar.after(modeStatus);
    modeBar.querySelectorAll('.argira-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        touchMode = btn.dataset.mode;
        modeBar.querySelectorAll('.argira-mode-btn').forEach(b => b.classList.toggle('argira-mode-active', b === btn));
        const info = MODE_INFO[touchMode];
        modeStatus.textContent = info.status;
        if (liveRegion) { liveRegion.textContent = ''; setTimeout(() => { liveRegion.textContent = info.announce; }, 50); }
        fetchObjectMap();
      });
    });

    let _isTouchDevice = false;
    let _lastHandleT = 0, THROTTLE_MS = 120;
    let _touchStartY = 0;
    let _brailleBlocked = false;

    function throttledHandle(e) {
      const now = Date.now();
      if (now - _lastHandleT < THROTTLE_MS) return;
      _lastHandleT = now;
      handleGalleryTouch(e);
    }

    async function brailleHandle(e) {
      if (_brailleBlocked) return;
      _brailleBlocked = true;
      handleGalleryTouch(e);
      await new Promise(r => {
        const deadline = setTimeout(r, 10000);
        const poll = setInterval(() => {
          if (!window.ArgiraSpeech.speaking) { clearInterval(poll); clearTimeout(deadline); r(); }
        }, 80);
      });
      await new Promise(r => setTimeout(r, 300));
      _brailleBlocked = false;
    }

    tc.addEventListener('click', e => { if (!_isTouchDevice) handleGalleryTouch(e); });
    tc.addEventListener('mousedown', e => {
      if (_isTouchDevice) return;
      fetchObjectMap();
      handleGalleryTouch(e);
      function onMove(ev) { throttledHandle(ev); }
      function onUp() { tc.removeEventListener('mousemove', onMove); }
      tc.addEventListener('mousemove', onMove);
      tc.addEventListener('mouseup', onUp, { once: true });
      tc.addEventListener('mouseleave', onUp, { once: true });
    });

    tc.addEventListener('touchstart', e => {
      _isTouchDevice = true;
      _touchStartY = e.touches[0].clientY;
      try { window.ArgiraAudio.resume(); } catch(e) {}
      fetchObjectMap();
    }, { passive: true });

    tc.addEventListener('touchend', e => {
      if (touchMode !== 'tap') return;
      if (window.ArgiraSpeech.speaking) return;
      const dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
      if (dy > 10) return;
      const t = e.changedTouches[0];
      handleGalleryTouch({ preventDefault:()=>{}, cancelable:false, touches:[{clientX:t.clientX,clientY:t.clientY}], clientX:t.clientX, clientY:t.clientY });
    });

    tc.addEventListener('touchmove', e => {
      if (touchMode === 'tap') return;
      e.preventDefault();
      const t = e.touches[0];
      const ev = { preventDefault:()=>{}, cancelable:false, touches:[{clientX:t.clientX,clientY:t.clientY}], clientX:t.clientX, clientY:t.clientY };
      if (touchMode === 'sweep') throttledHandle(ev);
      else if (touchMode === 'braille') brailleHandle(ev);
    }, { passive: false });
  });
}

function initGalleryAudioPan() {
  const cards = Array.from(document.querySelectorAll('#galeria .card'));
  function calcCentroids(img) {
    const SIZE = 64;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = SIZE;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const N = SIZE*SIZE, NZONES = 13, NBINS = 12;
    const cx0 = (SIZE-1)/2, cy0 = (SIZE-1)/2;
    const R_CTR = (SIZE/2)*0.25;
    const zSumH = new Float64Array(NZONES), zSumH2 = new Float64Array(NZONES);
    const zCnt = new Int32Array(NZONES);
    const zHist = new Uint32Array(NZONES*NBINS);
    for (let i=0; i<N; i++) {
      const r=data[i*4]/255, g=data[i*4+1]/255, b=data[i*4+2]/255;
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
      const s=mx>0?d/mx:0;
      let h=0;
      if (d>0) {
        if (mx===r) h=((g-b)/d+6)%6;
        else if (mx===g) h=(b-r)/d+2;
        else h=(r-g)/d+4;
        h/=6;
      }
      const col=i%SIZE, row=Math.floor(i/SIZE);
      const dx=col-cx0, dy=row-cy0;
      const radius=Math.sqrt(dx*dx+dy*dy);
      let zi;
      if (radius<R_CTR) zi=12;
      else { const angle=((Math.atan2(dy,dx)+Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI); zi=Math.min(11, Math.floor(angle/(2*Math.PI)*12)); }
      zSumH[zi]+=h; zSumH2[zi]+=h*h; zCnt[zi]++;
      if (s<0.08) continue;
      zHist[zi*NBINS + Math.min(NBINS-1, Math.floor(h*NBINS))]++;
    }
    const zStd = Array.from({length:NZONES},(_,i)=>{ const n=zCnt[i]; if(!n) return 0; const mean=zSumH[i]/n; return Math.sqrt(Math.max(0, zSumH2[i]/n - mean*mean)); });
    const zMax = Math.max(...zStd, 0.001);
    const zNorm = zStd.map(v=>v/zMax);
    const zoneModeH = Array.from({length:NZONES},(_,zi)=>{ let maxBin=0, maxCount=0; for(let b=0;b<NBINS;b++){ const c=zHist[zi*NBINS+b]; if(c>maxCount){maxCount=c;maxBin=b;}} return maxCount===0?-1:(maxBin+0.5)/NBINS; });
    let sumX=0, sumY=0, total=0;
    for (let i=0;i<N;i++) {
      const s = (data[i*4+1]/255);
      if (s<0.08) continue;
      const col=i%SIZE, row=Math.floor(i/SIZE);
      const w=s*s;
      sumX+=col*w; sumY+=row*w; total+=w;
    }
    return { cx: total>0?sumX/total/(SIZE-1):0.5, cy: total>0?sumY/total/(SIZE-1):0.5, zNorm, zoneModeH };
  }
  function applyPanToAudio(audioEl, cx, cy) {
    try {
      const audioCtx = window.ArgiraAudio.get();
      if (!audioCtx || !audioCtx.createStereoPanner) return;
      if (audioEl._argiraPanApplied) return;
      audioEl._argiraPanApplied = true;
      const src = audioCtx.createMediaElementSource(audioEl);
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, (cx-0.5)*2));
      src.connect(panner);
      panner.connect(audioCtx.destination);
      audioEl.dataset.argiraPan = cx.toFixed(3);
      const yFactor = 1.25 - cy*0.50;
      audioEl.playbackRate = Math.max(0.5, Math.min(2.0, yFactor));
      audioEl.dataset.argiraPlaybackRate = yFactor.toFixed(3);
    } catch(e) {}
  }
  function processCard(idx) {
    if (idx>=cards.length) return;
    const card = cards[idx];
    const img = card.querySelector('.card-image');
    const audioEl = card.querySelector('audio');
    if (!img || !audioEl) { setTimeout(()=>processCard(idx+1),10); return; }
    function doCalc() {
      try {
        const {cx, cy, zNorm, zoneModeH} = calcCentroids(img);
        applyPanToAudio(audioEl, cx, cy);
        audioEl.dataset.argiraCx = cx.toFixed(3);
        audioEl.dataset.argiraCy = cy.toFixed(3);
        card.dataset.argiraCx = cx.toFixed(3);
        card.dataset.argiraCy = cy.toFixed(3);
        card.dataset.argiraClockZones = zNorm.map(v=>v.toFixed(4)).join(',');
        card.dataset.argiraClockHues = zoneModeH.map(v=>v.toFixed(4)).join(',');
      } catch(e) {}
      setTimeout(()=>processCard(idx+1), 120);
    }
    if (img.complete && img.naturalWidth>0) doCalc();
    else { img.addEventListener('load', doCalc, {once:true}); setTimeout(()=>processCard(idx+1),120); }
  }
  setTimeout(()=>processCard(0), 800);
}

function initRoughnessWidgets() {
  const ROUGHNESS = {
    'White_on_White_(Malevich,_1918).png':0, 'Kazimir_Malevich,_1915,_Black_Suprematic_Square,_oil_on_linen_canvas,_79.5_x_79.5_cm,_Tretyakov_Gallery,_Moscow.jpg':9,
    'Francisco_de_Goya,_Saturno_devorando_a_su_hijo_(1819-1823).jpg':18, '500px-Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg':33,
    'EdwardHopperMorningSun1952.jpg':43, 'Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.png':53,
    'Dalí,_Perfil_del_tiempo,_Vroclavo,_7.jpeg':61, 'Paul_Cézanne_-_Montagne_Saint-victoire_-_Google_Art_Project.jpg':76,
    'Claude_Monet_-_Cliff_Walk_at_Pourville_-_Google_Art_Project.jpg':79, 'Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg':85,
    'Edgar_Germain_Hilaire_Degas_076.jpg':88, 'field-of-poppies.jpg!Large.jpg':92, '1280px-Korenveld_met_kraaien_-_s0149V1962_-_Van_Gogh_Museum.jpg':95,
    'este.jpg':96, 'La_Desserte_rouge,_par_Henri_Matisse.jpg':97, '3840px-Kandinsky_-_Jaune_Rouge_Bleu.jpg':99
  };
  function roughnessLabel(pct) { if(pct<=8) return 'liso'; if(pct<=25) return 'muy suave'; if(pct<=45) return 'suave'; if(pct<=60) return 'medio'; if(pct<=75) return 'rugoso'; if(pct<=88) return 'áspero'; if(pct<=95) return 'muy áspero'; return 'máximo'; }
  function roughnessBar(pct) { const filled=Math.round(pct/100*8); return '█'.repeat(filled)+'░'.repeat(8-filled); }
  function roughnessColor(pct) { const hue=Math.round(120-pct*1.2); return `hsl(${hue},70%,55%)`; }
  const cards = document.querySelectorAll('#galeria .card');
  cards.forEach(card => {
    const img = card.querySelector('.card-image');
    if(!img) return;
    const src = img.getAttribute('src');
    const pct = (src in ROUGHNESS) ? ROUGHNESS[src] : null;
    if(pct===null) return;
    const rWrap = document.createElement('div');
    rWrap.className = 'argira-roughness-widget';
    rWrap.setAttribute('aria-label', `Rugosidad espectral: ${pct}% — ${roughnessLabel(pct)}`);
    rWrap.style.cssText = 'margin:6px 0 2px;font-family:"IBM Plex Mono",monospace;font-size:0.75rem;text-align:center;line-height:1.5;';
    const rBar = document.createElement('div');
    rBar.style.cssText = `color:${roughnessColor(pct)};letter-spacing:0.04em;`;
    rBar.textContent = `rugosidad ${roughnessBar(pct)} ${pct}%`;
    const rText = document.createElement('div');
    rText.style.cssText = 'color:rgba(168,158,136,0.65);font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;';
    rText.textContent = `${roughnessLabel(pct)} · emergent spectral roughness`;
    rWrap.appendChild(rBar); rWrap.appendChild(rText);
    const colorLabelEl = card.querySelector('.argira-color-label');
    if(colorLabelEl) colorLabelEl.after(rWrap);
    else { const cardBody = card.querySelector('.card-body'); const speakBtn = card.querySelector('.speak-btn'); if(cardBody && speakBtn) cardBody.insertBefore(rWrap, speakBtn); }
    card.dataset.argiraRoughness = pct;
    const narrBtn = document.createElement('button');
    narrBtn.type = 'button'; narrBtn.className = 'argira-spatial-btn';
    narrBtn.setAttribute('aria-label', 'Escuchar descripción de la estructura espacial del color');
    narrBtn.innerHTML = '<span aria-hidden="true">🦯</span> Estructura espacial';
    const cardTagsEl = card.querySelector('.card-tags');
    const speakBtnEl = card.querySelector('.speak-btn');
    if(speakBtnEl) speakBtnEl.after(narrBtn);
    else card.querySelector('.card-body').appendChild(narrBtn);
    narrBtn.addEventListener('click', function() {
      const trySpeak = (attempt) => {
        const zonesRaw = card.dataset.argiraClockZones;
        const huesRaw = card.dataset.argiraClockHues;
        const cx = parseFloat(card.dataset.argiraCx) || 0.5;
        const cy = parseFloat(card.dataset.argiraCy) || 0.5;
        if (!zonesRaw && attempt<15) { setTimeout(()=>trySpeak(attempt+1),200); return; }
        function hueToColorName(h) { if(h<0) return null; if(window._argiraHueToName) return window._argiraHueToName(h,0.8,0.7); const deg=h*360; if(deg<15||deg>=345) return 'rojo'; if(deg<45) return 'naranja'; if(deg<70) return 'amarillo'; if(deg<150) return 'verde'; if(deg<210) return 'cian'; if(deg<270) return 'azul'; if(deg<330) return 'violeta'; return 'rosa'; }
        function clockLabel(zi) { if(zi===12) return 'el centro'; const h=zi===0?12:zi; return `las ${h} en punto`; }
        let tts;
        if(!zonesRaw) {
          const dx=cx-0.5, dy=cy-0.5;
          const angle=((Math.atan2(dy,dx)+Math.PI/2+2*Math.PI)%(2*Math.PI));
          const hora=Math.round(angle/(2*Math.PI)*12)%12;
          const horaLabel=hora===0?12:hora;
          tts = `El color principal de la obra se concentra hacia las ${horaLabel} en punto.`;
        } else {
          const Z = zonesRaw.split(',').map(Number);
          const H = huesRaw ? huesRaw.split(',').map(Number) : null;
          let mxZ=-1, mxI=0, mnZ=2, mnI=0;
          for(let i=0;i<12;i++) { if(Z[i]>mxZ) { mxZ=Z[i]; mxI=i; } if(Z[i]<mnZ) { mnZ=Z[i]; mnI=i; } }
          const colorActiva = H ? hueToColorName(H[mxI]) : null;
          const colorTranquila = H ? hueToColorName(H[mnI]) : null;
          const colorCentro = H ? hueToColorName(H[12]) : null;
          const zonaActivaStr = colorActiva ? `Zona más activa: a ${clockLabel(mxI)}, donde predomina el ${colorActiva}.` : `Zona más activa: a ${clockLabel(mxI)}.`;
          const zonaTranqStr = colorTranquila ? `Zona más uniforme: a ${clockLabel(mnI)}, donde predomina el ${colorTranquila}.` : `Zona más uniforme: a ${clockLabel(mnI)}.`;
          const centroStr = colorCentro ? `En el centro predomina el ${colorCentro}.` : '';
          const topIdx=[10,11,0,1,2], botIdx=[4,5,6,7,8];
          const topAvg=topIdx.reduce((s,i)=>s+Z[i],0)/topIdx.length;
          const botAvg=botIdx.reduce((s,i)=>s+Z[i],0)/botIdx.length;
          const leftIdx=[7,8,9,10,11], rightIdx=[1,2,3,4,5];
          const leftAvg=leftIdx.reduce((s,i)=>s+Z[i],0)/leftIdx.length;
          const rightAvg=rightIdx.reduce((s,i)=>s+Z[i],0)/rightIdx.length;
          const vT = Math.abs(topAvg-botAvg)>0.18 ? (topAvg>botAvg?'Mayor variedad en la mitad superior.':'Mayor variedad en la mitad inferior.') : '';
          const hT = Math.abs(leftAvg-rightAvg)>0.18 ? (leftAvg>rightAvg?'Mayor variedad a la izquierda.':'Mayor variedad a la derecha.') : '';
          tts = [zonaActivaStr, zonaTranqStr, centroStr, vT, hT].filter(Boolean).join(' ');
        }
        window.ArgiraSpeech.speak(tts, { rate:1.0 });
        narrBtn.setAttribute('aria-pressed','true');
        const checkEnd = setInterval(()=>{ if(!window.ArgiraSpeech.current){ clearInterval(checkEnd); narrBtn.setAttribute('aria-pressed','false'); } },100);
      };
      trySpeak(0);
    });
  });
}

function initClockScan() {
  // ── velocidad global del tour (compartida por todas las tarjetas) ──────────
  // 0 = lento (espera voz completa + 600 ms)
  let _tourSpeed = 0;

  // ── función auxiliar: esperar a que SpeechSynthesis termine ───────────────
  // Devuelve una Promise que se resuelve cuando la voz actual termina
  // (o en maxMs si algo falla).
  function waitForSpeech(maxMs) {
    return new Promise(resolve => {
      const deadline = setTimeout(resolve, maxMs);
      setTimeout(() => {
        const poll = setInterval(() => {
          if (!window.ArgiraSpeech || !window.ArgiraSpeech.speaking) {
            clearInterval(poll);
            clearTimeout(deadline);
            resolve();
          }
        }, 80);
      }, 600);
    });
  }

  // ── tarjeta por tarjeta ───────────────────────────────────────────────────
  const cards = document.querySelectorAll('#galeria .card');
  cards.forEach(card => {
    const narrBtn = card.querySelector('.argira-spatial-btn');
    if (!narrBtn) return;
    const scanBtn = document.createElement('button');
    scanBtn.type = 'button';
    scanBtn.className = 'argira-spatial-btn argira-scan-btn';
    scanBtn.setAttribute('aria-label', 'Tour espacial automático: recorre el cuadro por zonas');
    scanBtn.setAttribute('aria-pressed', 'false');
    scanBtn.innerHTML = '<span aria-hidden="true">🖼️</span> Tour espacial';
    narrBtn.after(scanBtn);

    // token de cancelación: cada tour tiene un id único
    let _tourId = 0;
    let _aborted = false;

    function stopScan() {
      _tourId++;          // invalida cualquier tour en vuelo
      _aborted = true;
      window.ArgiraSpeech.stop();
      scanBtn.setAttribute('aria-pressed', 'false');
      scanBtn.innerHTML = '<span aria-hidden="true">🖼️</span> Tour espacial';
      scanBtn._argiraScanStop = null;
    }
    scanBtn._argiraScanStop = null;

    scanBtn.addEventListener('click', function() {
      try { window.ArgiraAudio.resume(); } catch(e) {}

      // si ya corre → parar
      if (scanBtn.getAttribute('aria-pressed') === 'true') { stopScan(); return; }

      const zonesRaw = card.dataset.argiraClockZones;
      const huesRaw  = card.dataset.argiraClockHues;

      // datos aún no listos → esperar hasta 8 s
      if (!zonesRaw) {
        let wait = 0;
        const waitInterval = setInterval(() => {
          wait += 200;
          if (card.dataset.argiraClockZones || wait >= 8000) {
            clearInterval(waitInterval);
            if (card.dataset.argiraClockZones) scanBtn.click();
          }
        }, 200);
        return;
      }

      // ── lanzar tour ──────────────────────────────────────────────────────
      _aborted = false;
      const myTourId = ++_tourId;
      scanBtn.setAttribute('aria-pressed', 'true');
      scanBtn.innerHTML = '<span aria-hidden="true">⏹</span> Detener';
      scanBtn._argiraScanStop = stopScan;

      const Z = zonesRaw.split(',').map(Number);
      const H = huesRaw ? huesRaw.split(',').map(Number) : null;

      const ETIQUETA_RELOJ = [
        'a las doce','a la una','a las dos','a las tres','a las cuatro',
        'a las cinco','a las seis','a las siete','a las ocho','a las nueve',
        'a las diez','a las once','Centro'
      ];
      const ETIQUETA_ESPACIAL = [
        'arriba centro','arriba derecha','centro derecha','centro derecha',
        'abajo derecha','abajo centro','abajo centro','abajo izquierda',
        'centro izquierda','centro izquierda','arriba izquierda','arriba izquierda',
        'centro'
      ];
      const ARGIRA_GRID_KEY_ZONA9 = [
        'arriba_centro','arriba_derecha','centro_derecha','centro_derecha','abajo_derecha',
        'abajo_centro','abajo_centro','abajo_izquierda','centro_izquierda','centro_izquierda',
        'arriba_izquierda','arriba_izquierda','centro'
      ];

      // niveles descriptivos de actividad cromática
      function actToLabel(act) {
        if (act < 0.10) return 'muy tranquilo';
        if (act < 0.28) return 'tranquilo';
        if (act < 0.50) return 'moderado';
        if (act < 0.72) return 'activo';
        if (act < 0.88) return 'muy activo';
        return 'máxima actividad';
      }

      function hueToColorName(h) {
        if (h < 0) return null;
        if (window._argiraHueToName) return window._argiraHueToName(h, 0.8, 0.7);
        const deg = h * 360;
        if (deg<15||deg>=345) return 'rojo';
        if (deg<45)  return 'naranja';
        if (deg<70)  return 'amarillo';
        if (deg<150) return 'verde';
        if (deg<210) return 'cian';
        if (deg<270) return 'azul';
        if (deg<330) return 'violeta';
        return 'rosa';
      }

      function hourToPan(zi) { return zi === 12 ? 0 : Math.sin((zi / 12) * 2 * Math.PI); }

      // sonido del tono de zona
      function playZoneTone(hue, act, pan, durSec) {
        try {
          const audioCtx = window.ArgiraAudio.resume();
          const freq = hue >= 0 ? (200 + hue * 800) : 400;
          const vol  = 0.12 + act * 0.45;
          const osc  = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(vol, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durSec);
          osc.connect(gain);
          if (audioCtx.createStereoPanner) {
            const panner = audioCtx.createStereoPanner();
            panner.pan.value = pan;
            gain.connect(panner);
            panner.connect(audioCtx.destination);
          } else { gain.connect(audioCtx.destination); }
          osc.start();
          osc.stop(audioCtx.currentTime + durSec);
        } catch(e) {}
      }

      // construir descripción completa del sector
      function buildTextoVoz(zi, objeto, colorName, act) {
        const reloj   = ETIQUETA_RELOJ[zi];
        const espacial = ETIQUETA_ESPACIAL[zi];
        const actLabel = actToLabel(act);
        const partes = [];

        // posición: combinar reloj + espacial para mayor claridad
        if (zi === 12) {
          partes.push('Centro del cuadro');
        } else {
          partes.push(espacial);
        }

        // color dominante
        if (colorName) partes.push(`tonos ${colorName}`);

        // nivel de actividad cromática
        partes.push(actLabel);

        // objeto detectado al final
        if (objeto) partes.push(objeto);

        return partes.join('. ') + '.';
      }

      const sequence = [10, 0, 1, 8, 12, 2, 7, 5, 4];

      // tour asíncrono — espera la voz entre sectores
      async function runTour() {
        for (let idx = 0; idx < sequence.length; idx++) {
          if (_aborted || _tourId !== myTourId) return;

          const zi        = sequence[idx];
          const hue       = H ? H[zi] : -1;
          const act       = Z[zi];
          const pan       = hourToPan(zi);
          const colorName = hue >= 0 ? hueToColorName(hue) : null;
          // Leer el mapa en cada sector (puede llegar del proxy mientras el tour corre)
          const objectMap = card._argiraObjectMap || null;
          const zonaKey   = ARGIRA_GRID_KEY_ZONA9[zi];
          const objeto    = objectMap && objectMap[zonaKey] ? objectMap[zonaKey] : null;
          const textoVoz  = buildTextoVoz(zi, objeto, colorName, act);

          // reproducir tono breve
          const toneDur = _tourSpeed === 2 ? 0.22 : 0.35;
          playZoneTone(hue, act, pan, toneDur);

          // pequeña pausa para que el tono suene antes de hablar
          await new Promise(r => setTimeout(r, _tourSpeed === 2 ? 150 : 280));
          if (_aborted || _tourId !== myTourId) return;

          // hablar descripción completa
          const speechRate = _tourSpeed === 0 ? 0.82 : _tourSpeed === 1 ? 0.92 : 1.1;
          window.ArgiraSpeech.speak(textoVoz, { rate: speechRate });
          if (liveRegion) liveRegion.textContent = textoVoz;

          if (_tourSpeed === 2) {
            // modo rápido: tiempo fijo, no espera la voz
            await new Promise(r => setTimeout(r, 1200));
          } else {
            // modos lento/normal: esperar a que termine la voz
            const maxWait = _tourSpeed === 0 ? 15000 : 8000;
            await waitForSpeech(maxWait);
            if (_aborted || _tourId !== myTourId) return;
            // pausa posterior entre sectores
            const pausa = _tourSpeed === 0 ? 900 : 200;
            await new Promise(r => setTimeout(r, pausa));
          }
        }

        // tour completo
        if (!_aborted && _tourId === myTourId) {
          await new Promise(r => setTimeout(r, 400));
          stopScan();
        }
      }

      // esperar el mapa de objetos antes de empezar
      window.ArgiraSpeech.stop();
      if (!card._argiraObjectMap) {
        if (card._argiraResetObjectMap) card._argiraResetObjectMap();
        if (card._argiraFetchObjectMap) card._argiraFetchObjectMap();
      } else {
        card._argiraMapFetched = true;
      }

      const MAP_WAIT_MAX = 8000, MAP_POLL = 150;
      let mapWaited = 0, _vozEsperaEnviada = false;
      function startWhenReady() {
        if (_aborted || _tourId !== myTourId) return;
        // mapFetched = true cuando la petición al proxy terminó (con éxito o error)
        const mapFetched = !!card._argiraMapFetched;
        const timeout    = mapWaited >= MAP_WAIT_MAX;
        if (mapFetched || timeout) {
          runTour();
        } else {
          // Solo avisar si la espera supera 1500ms Y el mapa aún no llegó
          if (!_vozEsperaEnviada && mapWaited >= 1500) {
            _vozEsperaEnviada = true;
            window.ArgiraSpeech.speak('Analizando imagen, un momento…', { rate: 0.9 });
          }
          mapWaited += MAP_POLL;
          setTimeout(startWhenReady, MAP_POLL);
        }
      }
      startWhenReady();
    });
  });
}

function initCanvasTouch() {
  const tuPanel = document.getElementById('tu-panel');
  if (!tuPanel) return;
  const touchCanvas = document.createElement('canvas');
  touchCanvas.id = 'tu-touch-canvas';
  touchCanvas.setAttribute('aria-label', 'Toca cualquier punto de la imagen para oír su color');
  touchCanvas.style.cssText = 'display:none;width:100%;max-width:512px;height:auto;cursor:crosshair;border-radius:4px;border:1px solid rgba(232,201,106,0.25);margin:16px auto 0;position:relative;';
  const dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;width:18px;height:18px;border-radius:50%;border:2px solid #fff;pointer-events:none;transform:translate(-50%,-50%);display:none;z-index:10;box-shadow:0 0 6px rgba(0,0,0,0.7);';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:none;max-width:512px;margin:16px auto 0;';
  wrap.appendChild(touchCanvas); wrap.appendChild(dot);
  const hint = document.createElement('p');
  hint.textContent = '👆 Toca la imagen para oír el color de ese punto';
  hint.style.cssText = 'font-size:0.72rem;color:var(--text-dim);text-align:center;font-family:"Cinzel",serif;letter-spacing:0.1em;text-transform:uppercase;margin:6px 0 0;display:none;';
  const colorLabel = document.createElement('div');
  colorLabel.style.cssText = 'display:none;text-align:center;margin-top:8px;font-family:"IBM Plex Mono",monospace;font-size:0.85rem;color:var(--gold);min-height:22px;';
  tuPanel.insertBefore(wrap, tuPanel.firstChild);
  wrap.after(hint); hint.after(colorLabel);

  let objectMap = null;
  const PROXY_URL = 'https://argira-proxy.onrender.com/analyze';
  async function fetchObjectMap(imageElement) {
    try {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = 512; tmpCanvas.height = 512;
      tmpCanvas.getContext('2d').drawImage(imageElement, 0, 0, 512, 512);
      const base64 = tmpCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      const _ctrl2 = new AbortController();
      const _tid2 = setTimeout(() => _ctrl2.abort(), 10000);
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: 'image/jpeg' }),
        signal: _ctrl2.signal
      });
      clearTimeout(_tid2);
      objectMap = await response.json();
    } catch(e) { objectMap = null; }
  }

  function posToKey(rowPos, colPos) {
    const r = rowPos === 'arriba' ? 'arriba' : rowPos === 'abajo' ? 'abajo' : 'centro';
    const c = colPos === 'izquierda' ? 'izquierda' : colPos === 'derecha' ? 'derecha' : 'centro';
    if (r === 'centro' && c === 'centro') return 'centro';
    if (r === 'centro') return `centro_${c}`;
    if (c === 'centro') return `${r}_centro`;
    return `${r}_${c}`;
  }

  window._argiraTouchInit = function(imageElement) {
    const SIZE = 256;
    touchCanvas.width = SIZE; touchCanvas.height = SIZE;
    const ctx = touchCanvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, SIZE, SIZE);
    touchCanvas.style.display = 'block';
    wrap.style.display = 'block';
    hint.style.display = 'block';
    colorLabel.style.display = 'block';
    objectMap = null;
    fetchObjectMap(imageElement);
  };

  function playColorTone(h, s, v) {
    window.ArgiraAudio.resume().then(function(audioCtx) {
      try {
        const freq = 200 + h * 800;
        const volume = 0.15 + s * 0.55;
        const dur = 0.32;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = s < 0.12 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
      } catch(e) {}
    }).catch(function() {});
  }

  function handleTouch(e) {
    const rect = touchCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = touchCanvas.width / rect.width;
    const scaleY = touchCanvas.height / rect.height;
    const px = Math.round((clientX - rect.left) * scaleX);
    const py = Math.round((clientY - rect.top) * scaleY);
    if (px < 0 || px >= touchCanvas.width || py < 0 || py >= touchCanvas.height) return;
    const ctx = touchCanvas.getContext('2d');
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const r = pixel[0]/255, g = pixel[1]/255, b = pixel[2]/255;
    const [h,s,v] = rgbToHsv(r,g,b);
    const nombre = window._argiraHueToName(h,s,v);
    const freqMostrar = Math.round(200 + h * 800);
    colorLabel.textContent = `${nombre}  ·  ${freqMostrar} Hz`;
    const relX = px / touchCanvas.width, relY = py / touchCanvas.height;
    const colPos = relX < 0.33 ? 'izquierda' : relX < 0.66 ? 'centro' : 'derecha';
    const rowPos = relY < 0.33 ? 'arriba' : relY < 0.66 ? 'centro' : 'abajo';
    const posicion = (rowPos === 'centro' && colPos === 'centro') ? 'centro' : rowPos === 'centro' ? colPos : colPos === 'centro' ? rowPos : `${rowPos} ${colPos}`;
    const panArrow = centroid.cx > 0.60 ? 'derecha' : centroid.cx > 0.53 ? 'centro-derecha' : centroid.cx < 0.40 ? 'izquierda' : centroid.cx < 0.47 ? 'centro-izquierda' : 'centro';
    playColorTone(h,s,v);
    setTimeout(() => {
      const key = posToKey(rowPos, colPos);
      const objeto = objectMap && objectMap[key] ? objectMap[key] : null;
      const texto = objeto ? `${posicion}, ${nombre}, ${freqMostrar} hercios, pan ${panArrow}, ${objeto}` : `${posicion}, ${nombre}, ${freqMostrar} hercios, pan ${panArrow}`;
      window.ArgiraSpeech.speak(texto, { rate:0.92 });
    }, 500);
  }

  let _tuIsTouchDevice = false;
  touchCanvas.addEventListener('click', e => { if (!_tuIsTouchDevice) handleTouch(e); });
  let _tuTouchStartY = 0;
  touchCanvas.addEventListener('touchstart', e => { _tuIsTouchDevice = true; _tuTouchStartY = e.touches[0].clientY; window.ArgiraAudio.resume(); }, { passive: true });
  touchCanvas.addEventListener('touchend', e => {
    const dy = Math.abs(e.changedTouches[0].clientY - _tuTouchStartY);
    if (dy < 10) {
      const t = e.changedTouches[0];
      handleTouch({ preventDefault:()=>{}, cancelable:false, touches:[{clientX:t.clientX,clientY:t.clientY}], clientX:t.clientX, clientY:t.clientY });
    }
  });
}

// ========== DETENER TODO ==========
window.argiraStopAll = function() {
  if (window.ArgiraSpeech) window.ArgiraSpeech.stop();
  try {
    const ctx = window.ArgiraAudio && window.ArgiraAudio.get();
    if (ctx && ctx.state !== 'closed') ctx.suspend();
  } catch(e) {}
  if (window.LupaInversa) window.LupaInversa.stop();
  if (typeof stopLupa === 'function') stopLupa();
  document.querySelectorAll('audio').forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e) {} });
  document.querySelectorAll('.argira-scan-btn[aria-pressed="true"], .argira-test-scan[aria-pressed="true"]').forEach(btn => {
    if (btn._argiraScanStop) btn._argiraScanStop();
  });
  document.querySelectorAll('.argira-sonify-btn[aria-pressed="true"]').forEach(btn => btn.click());
  try {
    const ctx = window.ArgiraAudio && window.ArgiraAudio.get();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch(e) {}
};

document.addEventListener('DOMContentLoaded', () => {
  const stopAllBtn = document.getElementById('btn-stop-all');
  if (stopAllBtn) {
    stopAllBtn.addEventListener('click', () => {
      window.argiraStopAll();
      stopAllBtn.textContent = '✓ Detenido';
      setTimeout(() => { stopAllBtn.innerHTML = '⏹ Detener todo'; }, 1200);
    });
  }
});

// ========== Inicialización al cargar el DOM ==========
document.addEventListener('DOMContentLoaded', () => {
  initGallerySonify();
  initGalleryTouch();
  initGalleryAudioPan();
  initRoughnessWidgets();
  initClockScan();
  initCanvasTouch();
  console.log('Todas las inicializaciones completadas');
});