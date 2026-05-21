# ARGIRA — Museo Sonoro

> **Convertimos color y estructura pictórica en sonido espacial.**

Una persona invidente puede distinguir un Van Gogh de un Rothko solo por el sonido. Eso es Argira.

🔗 **[argira.eus/argira-sonification](https://argira.eus/argira-sonification/)**

---

## Qué es

Argira es un museo sonoro que convierte pinturas en audio mediante matemáticas emergentes. No hay reglas fijas de "este color = esta nota". La estructura sonora emerge de la pintura misma: su variabilidad cromática, su textura fractal, la distribución espacial del color.

El resultado: 16 obras ordenadas de menor a mayor cromatismo. Del silencio de Malevich al caos organizado de Kandinsky.

**Publicado en ICAD 2026 · Jose Ranero García**

---

## La correlación que lo hace posible

```
Pearson r = 0.9289   R² = 0.8629   p < 0.001   N = 47 obras
```

`hue_std` (variabilidad de tono) predice `Ds` (dimensión espectral sonora) con r = 0.9289.

Malevich tiene el hue_std más bajo de la historia del arte occidental. Kandinsky tiene uno de los más altos. El sonido lo confirma.

📊 **[Dataset completo en Zenodo](https://doi.org/10.5281/zenodo.20097327)**

---

## Qué puedes hacer

| Función | Descripción |
|---|---|
| **Galería sonora** | 16 obras, escúchalas en orden. Cada una tiene su firma acústica. |
| **Toca la imagen** | Pulsa cualquier punto del cuadro para oír el color de ese píxel en tiempo real. |
| **Tour sonoro** | Recorre la obra como un reloj (12 posiciones) con audio espacial estéreo. |
| **Oír la obra** | Síntesis completa de la paleta en 8 segundos. Tempo y armónicos calculados desde el color. |
| **Estructura espacial** | Narración de dónde se concentra el color activo en la composición. |
| **Lupa temporal** | Ralentiza el sonido de Matisse hasta ×0.1 para percibir la textura. Visualización Chladni en vivo. |
| **Analiza tu imagen** | Sube cualquier pintura. El navegador calcula sus métricas y genera su firma acústica. |
| **Test auditivo** | 3 pares de obras. ¿Puedes distinguir el Malevich del Kandinsky solo por el sonido? |

---

## Cómo funciona (técnico)

Todo el procesamiento ocurre **en el navegador**. No hay servidor, no hay API de audio.

```
Imagen → Canvas API → pixels RGB → HSV → hue_std + fractalD + centroid
       → Web Audio API → osciladores + armónicos + pan estéreo → sonido
```

**Variables que controlan el sonido:**

- `hue_std` (desviación circular del tono) → complejidad espectral, número de armónicos
- `irregularidad` (Sobel) → frecuencia base (200–1000 Hz)
- `fractalD` → profundidad de modulación FM
- `centroidX` → paneo estéreo
- `centroidY` → pitch (arriba = agudo, abajo = grave)
- `satMean` → volumen relativo de armónicos

---

## Stack

- HTML + CSS + JS vanilla — sin frameworks, sin dependencias
- Web Audio API (osciladores, filtros shelving, panner estéreo)
- Canvas API (análisis de píxeles, visualización Chladni/Lissajous)
- SpeechSynthesis API (narración accesible)
- Audio: OGG con fallback MP3

---

## Accesibilidad

Argira nació como herramienta de accesibilidad para personas con discapacidad visual. Cada función tiene:

- `aria-label` y `aria-pressed` en todos los controles interactivos
- Región live (`aria-live`) para anuncios de navegador de pantalla
- Narración por voz de posición, color y objetos detectados en cada zona
- Funciona sin ratón (touch + teclado)

---

## Estructura del repositorio

```
/
├── index.html          # Aplicación completa
├── script_v2.js        # Toda la lógica: audio, análisis, UI
├── style.css           # Estilos
├── *.ogg / *.mp3       # Audios de las 16 obras (OGG + fallback MP3)
└── *.jpg / *.png       # Imágenes de las obras
```

---

## Citar

Si usas el dataset o el método en una investigación:

```
Ranero García, J. (2026). Argira: Sonification of Pictorial Color Structure.
ICAD 2026. Zenodo. https://doi.org/10.5281/zenodo.20097327
```

---

## Autor

**Jose Ranero García** · [argira.eus](https://argira.eus)

Proyecto presentado en ICAD 2026 (International Conference on Auditory Display).
