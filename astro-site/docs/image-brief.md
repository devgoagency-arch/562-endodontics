# Ficha de imágenes — 562 endodontics

Documento de trabajo para generar y aprobar las imágenes de las páginas de tratamiento.
Idioma del documento: español. Los prompts y los `alt` van en inglés (el sitio es en inglés y los generadores responden mejor).

## 1. Qué marcó el cliente y qué proponemos nosotros

| Origen | Imagen | Motivo |
|---|---|---|
| **Cliente** (doc "Correcciones Cracked Teeth") | CT-01 `cracked-tooth-fractured-incisor-smile` | "La foto actual no es la correcta para este tipo de fracturas": muestra un incisivo astillado (trauma), no una fisura. Su referencia: muelas con líneas finas de fisura, y "cracked tooth" vs "split tooth". |
| Nosotros (confirmar con el cliente) | CT-02, CT-03 | Misma familia: incisivos astillados en una página de fisuras. |
| Nosotros (confirmar con el cliente) | DT-01, DT-02, DT-03 | Renders 3D que se ven artificiales ("detalles de la boca poco reales"). DT-01 hoy comparte archivo con CT-03. |
| Nosotros (confirmar con el cliente) | RC-01, RC-02, RC-03 | Escenas con personas/manos que se ven generadas. |
| El doc de Root Canal | — | No marca imágenes: solo quitó secciones (esas 3 fotos ya se borraron). |

**No se tocan** (parecen reales y son de la clínica): las 4 imágenes de secuelas (`pulp-canal-obliteration`, `internal-inflammatory-resorption`, `external-cervical-resorption`, `external-replacement-resorption-ankylosis`) y las fotos del microscopio, equipo y clínica.

⚠️ Las imágenes que pegó el cliente en su documento (milburndental.com, sharedentalcare.com) tienen marca de agua y derechos de terceros: sirven **solo como referencia** de lo que quiere ver, nunca para publicarlas.

## 2. Flujo de trabajo (Codex)

1. **Carpeta de trabajo, fuera del despliegue:** `astro-site/_image-work/<ID>/` con las candidatas `v1.png`, `v2.png`… (ya está en `.gitignore`; no se sube).
2. **Primero una sola imagen, CT-03** (la más simple), para fijar el estilo. Se manda al Dr. para aprobarlo. Las demás se generan en la **misma conversación**, usando la CT-03 aprobada como referencia de estilo.
3. Por imagen: 3–4 variantes → elegir 1 → **revisión clínica del doctor** (sección 5) → recién entonces pasar a destino.
4. **Destino y optimización (lo hace Codex):** WebP, calidad ~82, sin metadatos, al tamaño de la tabla, en la ruta `astro-site/public/images/...` con **el mismo nombre de archivo** (así reemplaza sin tocar código).
5. Avisarme y yo compilo, reviso proporciones/recortes/`alt` y verifico que no queden rutas rotas.

Reglas de entrega:
- Nombre: minúsculas, guiones, sin espacios ni acentos (mismo patrón que hoy).
- Tamaño: 2× el tamaño en pantalla (nítido en pantallas retina), no más. Ver columna "Entregar".
- Sujeto centrado con ~12 % de margen (el menú y los contenedores recortan con `object-cover`).
- Sin texto, letras, números, etiquetas, logos ni marcas de agua dentro de la imagen (los generadores los escriben mal y no se traducen).

## 3. Bloque de estilo (pegar siempre ANTES del prompt de cada imagen)

```
STYLE: Premium dental educational illustration, soft 3D clay-render look with gentle
studio lighting, clean and minimal. Tooth enamel in warm ivory with subtle translucency;
gums in muted coral-pink (not saturated); roots a slightly deeper cream; bone in soft
sand beige. The single accent color for highlights (crack lines, arrows, markers) is
brick red #B13E25. Plain flat background #F2EEEA (very light warm beige). Subject
centered with about 12% margin on all sides, soft contact shadow beneath. No text, no
letters, no numbers, no labels, no logos, no watermarks, no borders, no hands, no faces
(unless the prompt says so). Anatomically accurate, realistic proportions, crisp edges,
no plastic gloss, no neon colors, no blood or gore.
```

Por qué ilustración y no fotorrealismo: una boca fotorrealista con IA es justo lo que se ve falso (encías, saliva, reflejos). La ilustración suave es coherente entre sí y no cae en el "casi real pero raro".

## 4. Fichas por imagen

### CT-01 · Cracked Teeth · intro (MARCADA POR EL CLIENTE)
- **Archivo:** `public/images/treatments/cracked-teeth/cracked-tooth-fractured-incisor-smile.webp`
- **Dónde:** foto grande junto al título "Cracked Teeth treatment in London, ON" (columna derecha, ~418 px de ancho).
- **Proporción / entregar:** 4:3 horizontal → **1200 × 900**.
- **Debe mostrar:** dos muelas lado a lado sobre bloques de encía/hueso: a la izquierda un *cracked tooth* (fisura fina de mesial a distal por la cara masticatoria, bajando por un lado de la corona hacia la raíz, el diente sigue entero) y a la derecha un *split tooth* (la grieta lo atraviesa y las dos mitades se ven separadas por una rendija). Es la idea de la referencia 2 del cliente.
- **Evitar:** incisivos, dientes astillados, grietas gruesas o caricaturescas, texto "Cracked tooth / Split tooth" dentro de la imagen.
- **Prompt (después del bloque STYLE):**
```
Two upper molars side by side, each on a small gum-and-bone cross-section block, seen
from a slightly raised 3/4 angle. LEFT molar: a cracked tooth — one thin hairline crack
crosses the chewing surface from the mesial to the distal edge and continues down one
side of the crown toward the root; the tooth is still in one piece. RIGHT molar: a split
tooth — the crack goes completely through, the two halves are visibly separated by a
narrow gap and one segment is slightly shifted. Cracks are fine dark-red lines in the
#B13E25 family, realistic, not cartoonish. Landscape 4:3.
```
- **Alt sugerido:** `Illustration of a cracked molar and a split molar showing the difference between the two types of tooth fracture`

### CT-02 · Cracked Teeth · "Patient guide"
- **Archivo:** `public/images/treatments/cracked-teeth/cracked-tooth-fractured-incisor-patient.webp`
- **Dónde:** junto a "Patient guide: Immediate steps for a cracked or fractured tooth" (~418 px de ancho).
- **Proporción / entregar:** 4:5 vertical → **1024 × 1280**.
- **Debe mostrar:** una muela inferior de perfil sobre un bloque de encía, con una fisura vertical fina desde la cara masticatoria, bajando por la corona hasta cerca de la encía, con un resalte rojo suave que marca el recorrido. Tranquila e informativa, nada alarmante.
- **Evitar:** pacientes, bocas, labios, dientes frontales.
- **Prompt:**
```
A single lower molar seen from the side, standing on a small gum block. A fine vertical
hairline crack starts at the chewing surface, runs down the side of the crown and ends
near the gumline; a subtle soft #B13E25 line highlights the crack path. Calm, clear,
educational. Portrait 4:5.
```
- **Alt sugerido:** `Illustration of a molar with a fine crack running from the chewing surface toward the gumline`

### CT-03 · Cracked Teeth · "What to do…" (también en el menú desplegable)
- **Archivo:** `public/images/treatments/cracked-teeth/cracked-tooth-incisor-diagram.webp`
- **Dónde:** fila "What to do if you think you have a cracked tooth" (se ve a ~227 px) y tarjeta de Cracked Teeth del menú (recorte vertical ~136 × 190 px: lo importante va al centro).
- **Proporción / entregar:** 1:1 → **1024 × 1024**. Debe leerse bien pequeña: formas simples y contraste claro.
- **Debe mostrar:** corte transversal de una muela (corona, cámara pulpar, raíces) sobre encía y hueso; una línea de fisura roja que baja de la corona hacia la raíz y muestra hasta dónde llega; una línea fina que marca el nivel del hueso.
- **Evitar:** incisivos; demasiados detalles internos que desaparecen al achicar.
- **Prompt:**
```
Cross-section of a single molar (crown, pulp chamber, two roots) embedded in gum and
bone, side view. One thin #B13E25 crack line starts on the crown and travels down toward
the root, clearly showing how deep it goes; a thin horizontal line marks the bone level.
Large simple shapes that stay readable when small. Square 1:1.
```
- **Alt sugerido:** `Cross-section illustration of a molar showing how deep a crack extends from the crown toward the root`
- **Hoy este archivo también se usa en Dental Trauma** ("Tooth Fractures"); con DT-01 deja de compartirse (ver nota en DT-01).

### DT-01 · Dental Trauma · "Tooth Fractures" (NUEVO ARCHIVO)
- **Archivo nuevo:** `public/images/treatments/dental-trauma/tooth-fractures-diagram.webp`
  *(hoy esta fila reutiliza `cracked-tooth-incisor-diagram.webp`; cuando exista este archivo yo cambio la referencia en `dental-trauma.astro`)*
- **Dónde:** fila "Tooth Fractures" (~227 px).
- **Proporción / entregar:** 1:1 → **1024 × 1024**.
- **Debe mostrar:** un incisivo central superior de frente con una esquina incisal rota: el fragmento aparece junto al diente, borde de fractura limpio, un indicio de pulpa visible.
- **Evitar:** sangre, encías inflamadas, boca completa.
- **Prompt:**
```
A single upper central incisor seen from the front, standing on a small gum block. A
diagonal piece of the incisal corner has broken off and lies next to it. Clean fracture
edge, a hint of pink pulp visible at the break. Square 1:1.
```
- **Alt sugerido:** `Illustration of a chipped front tooth with the broken fragment beside it`

### DT-02 · Dental Trauma · "Tooth Luxation (Displacement)"
- **Archivo:** `public/images/treatments/dental-trauma/tooth-luxation-diagram.webp`
- **Dónde:** fila "Tooth Luxation (Displacement)" (~227 px).
- **Proporción / entregar:** 1:1 → **1024 × 1024**.
- **Debe mostrar:** corte lateral de un incisivo superior en su alvéolo, desplazado hacia el labio (luxación lateral), eje inclinado, con una flecha roja fina que indica la dirección del desplazamiento.
- **Evitar:** texto, varias luxaciones a la vez. *(El doctor decide si prefiere extrusiva o lateral; ver sección 5.)*
- **Prompt:**
```
Side cross-section of an upper central incisor in its socket within gum and bone. The
tooth is pushed sideways out of its normal axis, tilted toward the lip, root tip
displaced inside the socket. One thin #B13E25 arrow shows the direction of
displacement. Square 1:1.
```
- **Alt sugerido:** `Cross-section illustration of a front tooth displaced sideways in its socket`

### DT-03 · Dental Trauma · "Tooth Avulsion" (también en el menú desplegable)
- **Archivo:** `public/images/treatments/dental-trauma/avulsed-tooth-diagram.webp`
- **Dónde:** fila "Tooth Avulsion (Knocked-Out Tooth)" (~227 px) y tarjeta Dental Trauma del menú (recorte vertical ~136 × 190 px).
- **Proporción / entregar:** 1:1 → **1024 × 1024**, sujeto muy centrado.
- **Debe mostrar:** corte lateral de encía y hueso con el alvéolo vacío; el diente completo (con raíz intacta) flotando justo encima, con una línea punteada roja que indica que salió del alvéolo.
- **Evitar:** sangre o aspecto crudo (es para pacientes y el sitio del consultorio).
- **Prompt:**
```
Side cross-section of gum and bone with an empty tooth socket. The complete upper
incisor with its whole root is lifted just above the socket, with a thin dotted #B13E25
line showing the path it was knocked out along. Clean, calm, no blood. Square 1:1.
```
- **Alt sugerido:** `Illustration of a knocked-out tooth lifted out of its empty socket`

### RC-01 · Root Canal · "Pre-operative Assessment"
- **Archivo:** `public/images/treatments/root-canal/root-canal-preoperative-assessment.webp`
- **Dónde:** primera fila de pasos de Root Canal (~227 px).
- **Proporción / entregar:** 1:1 → **1024 × 1024**.
- **Preferido: foto real de la clínica** (Dra. y paciente mirando la pantalla con la imagen 3D; con consentimiento). Es lo más creíble y evita el problema de "paciente generado".
- **Alternativa con IA (ilustración, no foto):**
```
Warm editorial flat illustration of a female endodontist in black scrubs and a patient
seated side by side in a bright, modern consultation room, both looking at a monitor
that shows a 3D dental scan. Wood and white interior, small #B13E25 accents, simple
friendly faces. Square 1:1.
```
- **Alt sugerido:** `Endodontist and patient reviewing a 3D dental scan together during a consultation`

### RC-02 · Root Canal · "Post-Treatment Communication"
- **Archivo:** `public/images/treatments/root-canal/root-canal-post-treatment-communication.webp`
- **Dónde:** tercer paso de Root Canal (~227 px).
- **Proporción / entregar:** 1:1 → **1024 × 1024**.
- **Debe mostrar:** un reporte clínico y una pequeña radiografía en una pantalla/portátil y un avioncito o sobre que viaja hacia un segundo consultorio (el dentista que refirió). Sin personas ni manos (las manos son lo que peor generan).
- **Prompt:**
```
Flat editorial illustration: a laptop showing a clinical report page with a small dental
X-ray thumbnail, and a paper-plane/envelope traveling from the clinic toward a second
small dental office icon. Brand palette (#B13E25 and warm beige). No people, no hands,
no text. Square 1:1.
```
- **Alt sugerido:** `Illustration of a clinical report being sent to the referring dental office after treatment`

### RC-03 · Root Canal · intro (CBCT)
- **Archivo:** `public/images/technology/cbct-scan-patient-positioned.webp`
- **Dónde:** foto grande junto al título "Root canal treatment in London, Ontario" (~418 px de ancho).
- **Proporción / entregar:** 1080:1166 (≈ 0,93) → **1080 × 1166** (se mantiene).
- **Preferido: foto real del equipo CBCT de la clínica** (con un miembro del equipo, con consentimiento).
- **Alternativa con IA:**
```
Clean studio render of a modern cone-beam CT dental scanner in a bright clinic room,
with a stylized anonymous patient silhouette positioned in it. No brand names, no
logos, no text on the screen. Warm neutral palette with a small #B13E25 accent.
Portrait, ratio about 0.93.
```
- **Alt sugerido:** `Cone-beam CT scanner at 562 endodontics used for 3D dental imaging`

## 5. Preguntas para el Dr. (revisión clínica antes de publicar)

- ¿Las grietas de CT-01 muestran bien la diferencia entre *cracked tooth* y *split tooth*? ¿Dirección (mesio-distal) y recorrido correctos?
- CT-03: ¿es razonable mostrar la fisura bajando hacia la raíz y el nivel del hueso con esa línea?
- DT-02: ¿luxación **lateral** o **extrusiva** para ilustrar "displacement"?
- DT-03: ¿el diente completo sobre el alvéolo vacío es la representación que prefiere para avulsión?
- ¿Hay fotos reales (microscopio, equipo CBCT, consulta) que prefieran usar en vez de ilustración para RC-01 y RC-03?
- ¿Cómo prefieren presentar las ilustraciones: como "ilustración" en el pie de foto o sin leyenda?

## 6. Antes de publicar

- **Cumplimiento de publicidad (RCDSO):** si se usan personas o pacientes generados con IA, confirmar con la clínica que no pueden interpretarse como resultados reales de pacientes. Las ilustraciones anatómicas no tienen ese problema.
- **Derechos:** las imágenes generadas deben ser originales de este proyecto; no subir ni "mejorar" las de milburndental / sharedentalcare.
- **Pendiente de contenido:** las páginas Endodontic Retreatment, Apical Surgery y Dental Emergencies aún no existen; sus imágenes se definen cuando llegue el contenido del cliente.
