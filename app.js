// Lógica funcional de Cazafalacias: construcción del catálogo, selector de
// familias, pestañas, modo proyección, práctica y pantalla de bienvenida.
//
// Nota de refactorización (ver también data.js y index.html):
// - Este archivo es un módulo ES (cargado con <script type="module">), así
//   que ya tiene su propio ámbito de nivel superior: nada de lo declarado
//   aquí llega a `window` aunque no esté envuelto en una función. La IIFE
//   `(function(){ ... })();` del archivo original ya no es necesaria —de
//   hecho, un `import` estático como el de abajo solo puede escribirse en
//   el nivel superior del módulo, así que tenía que salir para poder
//   importar— pero el comportamiento en tiempo de ejecución es el mismo.
// - Todo `var` se reemplazó por `let` o `const` según si el valor se
//   reasigna más adelante. Ningún valor, orden de ejecución ni condición
//   cambió: es un cambio de sintaxis, no de lógica.
// - Un <script type="module"> ya se comporta como si tuviera `defer`
//   (se ejecuta después de parsear el DOM), así que ubicarlo al final del
//   <body> es solo por claridad, no por necesidad.

import { CATS, CAT_ORDER, FALLACIES, PRACTICE } from "./data.js";

// La plataforma original que alojaba esta página no declaraba idioma en
// <html>; aquí index.html ya trae lang="es" propio, pero se deja esta
// línea tal cual estaba (no es más que una reafirmación redundante e
// inofensiva) para no tocar nada de la lógica existente.
document.documentElement.lang = "es";

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

const byId = {};
FALLACIES.forEach(function(f){ byId[f.id] = f; });

function catSoftBg(catKey){ return "var(" + CATS[catKey].soft + ")"; }
function catColor(catKey){ return "var(" + CATS[catKey].varName + ")"; }
function lower1(s){ return s.charAt(0).toLowerCase() + s.slice(1); }

// Se pone en true recién al final de este archivo, cuando toda la
// infraestructura de la inducción progresiva (Fase 1 y Fase 2, más abajo)
// ya quedó definida. renderQuestion() se llama una vez de entrada, en
// caliente, antes de llegar a esa parte del archivo — sin esta bandera,
// esa primera llamada intentaría usar PRACTICE_TIPS/coachOverlay antes de
// que existan y rompería la carga de toda la página.
let onboardingReady = false;

// ---------- Íconos de familia ----------
// Un trazo simple (stroke=currentColor) por familia, deliberadamente
// distinto del ícono de marca (la lupa del encabezado) para que cada
// familia tenga su propia figura reconocible incluso a tamaño pequeño:
// - ataque: un bocadillo de diálogo con una "X" (se ataca el mensaje/a la
//   persona, no se responde el argumento).
// - presión: un megáfono (voz amplificada por autoridad o por número).
// - causa: un matraz (evidencia mal leída, no lectura literal de "ciencia").
// - estructura: fichas de dominó cayendo (la "cadena de consecuencias" y
//   las trampas de forma que fuerzan un camino único).
// Cada una es puramente decorativa (aria-hidden: el nombre de la familia
// siempre va al lado como texto real), así que no necesita texto alternativo.
const CAT_ICON_PATHS = {
  ataque:
    '<path d="M4 6h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2V8a2 2 0 0 1 1-2Z"/>' +
    '<line x1="8.5" y1="10.5" x2="13.5" y2="14.5"/>' +
    '<line x1="13.5" y1="10.5" x2="8.5" y2="14.5"/>',
  presion:
    '<path d="M3 10v4a1 1 0 0 0 1 1h2l6 4V5L6 9H4a1 1 0 0 0-1 1Z"/>' +
    '<path d="M16 9a4 4 0 0 1 0 6"/>' +
    '<path d="M19 6a8 8 0 0 1 0 12"/>',
  causa:
    '<path d="M9 3h6"/>' +
    '<path d="M10 3v5.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3"/>' +
    '<line x1="8.5" y1="14" x2="15.5" y2="14"/>',
  estructura:
    '<rect x="3.5" y="4" width="4" height="12" rx="1"/>' +
    '<rect x="10" y="6" width="4" height="12" rx="1" transform="rotate(18 12 12)"/>' +
    '<rect x="16.5" y="9" width="4" height="12" rx="1" transform="rotate(34 18.5 15)"/>'
};
function catIconSvg(catKey){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    CAT_ICON_PATHS[catKey] + '</svg>';
}
// Envoltorio <span> reutilizable: el tamaño y el color se controlan por CSS
// según dónde se use (.family-icon en un lugar, .skill-row-icon en otro,
// etc.), así el mismo SVG sirve para las 4 vistas sin duplicar marcado.
function catIconEl(catKey, wrapperClass){
  const span = document.createElement("span");
  span.className = wrapperClass;
  span.innerHTML = catIconSvg(catKey);
  return span;
}

// ---------- Mini-práctica por familia ----------
// Al final de cada familia del Catálogo: 3 casos, uno por cada falacia de
// esa familia, con la misma mecánica de dos intentos + pista de la
// Práctica general (mismas clases CSS — .opt-btn, .feedback, .case-stamp —
// así que hereda sus animaciones y sonidos de retroalimentación tal cual,
// sin duplicar ni un solo keyframe). A propósito NO toca los contadores
// globales (Puntos de Análisis Crítico, Persistencia) ni el Diario de
// Caza: es un repaso ligero de lo que se acaba de leer en esa familia, no
// una ronda oficial de Práctica — mezclar sus resultados en esos
// marcadores confundiría lo que miden. Por la misma razón tampoco guarda
// ni muestra ningún puntaje al terminar (ver el resto de la app: "sin
// nota, sin registro"). Cada vez que se entra a la familia (showFamily,
// más abajo) se vuelve a armar con 3 casos nuevos.
//
// Los enunciados salen del mismo banco de 36 (PRACTICE, en data.js), pero
// EXCLUYENDO siempre el primero de cada falacia: para 11 de las 12
// falacias, ese primer enunciado es EXACTAMENTE el mismo texto que ya se
// mostró como "EVIDENCIA" en el expediente que la persona acaba de leer
// (ver FALLACIES[].example en data.js) — repetirlo aquí premiaría reconocer
// una frase memorizada, no aplicar la teoría a un caso distinto. Se
// descarta ese índice para las 12 falacias por igual (no solo para las 11
// donde coincide textualmente) para no necesitar un caso especial.
const familyQuizControllers = {};

function practiceIndicesForFallacy(fallacyId){
  const out = [];
  PRACTICE.forEach(function(entry, i){ if(entry[0] === fallacyId){ out.push(i); } });
  return out;
}

function buildFamilyQuizCases(catKey){
  const fallaciesInCat = FALLACIES.filter(function(f){ return f.cat === catKey; });
  const cases = fallaciesInCat.map(function(f){
    const idxs = practiceIndicesForFallacy(f.id).slice(1);
    const chosenIdx = idxs[Math.floor(Math.random() * idxs.length)];
    return { fallacy: f, text: PRACTICE[chosenIdx][1] };
  });
  return shuffle(cases);
}

// Redacción de la retroalimentación, compartida con la Práctica general
// (showHint/closeCase, más abajo en este archivo): una sola fuente de
// verdad para el texto, así la mini-práctica nunca dice algo distinto de
// la Práctica general ante el mismo tipo de resultado.
function hintFeedback(chosen){
  return {
    verdict: "No es " + chosen.name + ".",
    body: "<p>Recuerda que <strong>" + escapeHtml(chosen.name) + "</strong> ocurre cuando " + escapeHtml(lower1(chosen.def)) + " Vuelve a leer el enunciado e intenta de nuevo.</p>"
  };
}
function closeFeedback(chosen, correctFallacy, isCorrect){
  if(isCorrect){
    return {
      verdict: "¡Exacto! Es " + correctFallacy.name + ".",
      body: "<p>" + escapeHtml(correctFallacy.why) + "</p>"
    };
  }
  return {
    verdict: "No — es " + correctFallacy.name + ", no " + chosen.name + ".",
    body: "<p><strong>" + escapeHtml(chosen.name) + "</strong> es cuando " + escapeHtml(lower1(chosen.def)) + " No es lo que pasa en este caso.</p>" +
          "<p><strong>" + escapeHtml(correctFallacy.name) + "</strong> sí aplica: " + escapeHtml(lower1(correctFallacy.why)) + "</p>"
  };
}

// Arma el controlador de la mini-práctica de UNA familia (se llama una vez
// por familia, al construir el catálogo). container es el <div> ya
// insertado en el DOM de esa familia; start() (guardado en
// familyQuizControllers[catKey]) es lo único que showFamily() necesita
// para (re)lanzarla cada vez que se entra a esta familia.
function setupFamilyQuiz(catKey, container){
  container.innerHTML =
    '<h3 class="journal-title family-quiz-title" tabindex="-1">Practica esta familia</h3>' +
    '<p class="journal-intro">Aplica lo que acabas de leer: 3 casos, solo de esta familia. Misma mecánica que la Práctica general — dos intentos con pista, sin nota.</p>' +
    '<div class="fq-body"></div>';
  const titleEl = container.querySelector(".family-quiz-title");
  const body = container.querySelector(".fq-body");
  let cases, idx;

  function renderDone(){
    body.innerHTML =
      '<div class="fq-done">' +
        '<p>Revisaste los 3 casos de esta familia.</p>' +
        '<div class="journal-actions"><button type="button" class="ghost-btn fq-restart">Practicar de nuevo →</button></div>' +
      '</div>';
    const restartBtn = body.querySelector(".fq-restart");
    restartBtn.addEventListener("click", function(){ start(true); });
    restartBtn.focus();
  }

  function renderCase(){
    const c = cases[idx];
    let attempts = 0;
    let resolved = false;

    // Mismo marcado que #statementText/#optionsRoot/#feedbackBox de la
    // Práctica general (ver index.html), pero sin ids: puede haber hasta 4
    // instancias de esto en el DOM a la vez (una por familia, aunque solo
    // una sección quede visible), así que se consulta todo por clase,
    // acotado a este `body` en particular.
    body.innerHTML =
      '<div class="practice-meta"><span>Caso ' + (idx + 1) + ' de ' + cases.length + '</span></div>' +
      '<p class="case-prompt">¿Qué falacia se esconde aquí?</p>' +
      '<div class="statement">' +
        '<div class="case-stamp" aria-hidden="true" hidden>CASO<br>RESUELTO</div>' +
        '<span class="statement-text"></span>' +
      '</div>' +
      '<div class="options"></div>' +
      '<div class="feedback" aria-live="polite" aria-atomic="true">' +
        '<div class="verdict"></div><div class="fq-feedback-body"></div>' +
      '</div>' +
      '<div class="next-row"><button type="button" class="next-btn" disabled>Siguiente caso →</button></div>';

    const stampEl = body.querySelector(".case-stamp");
    const textEl = body.querySelector(".statement-text");
    const statementEl = body.querySelector(".statement");
    const optionsEl = body.querySelector(".options");
    const feedbackEl = body.querySelector(".feedback");
    const verdictEl = body.querySelector(".verdict");
    const feedbackBodyEl = body.querySelector(".fq-feedback-body");
    const nextBtnEl = body.querySelector(".next-btn");
    statementEl.tabIndex = -1;
    textEl.textContent = c.text;

    const options = pickOptions(c.fallacy);
    const letters = ["A","B","C","D"];
    options.forEach(function(opt, i){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt-btn";
      btn.dataset.fid = opt.id;
      const letter = document.createElement("span");
      letter.className = "opt-letter";
      letter.textContent = letters[i];
      const label = document.createElement("span");
      label.textContent = opt.name;
      btn.appendChild(letter);
      btn.appendChild(label);
      btn.addEventListener("click", function(){ handleAnswerFq(opt, btn); });
      optionsEl.appendChild(btn);
    });

    function close(chosen, isCorrect){
      resolved = true;
      Array.prototype.forEach.call(optionsEl.children, function(b){
        b.disabled = true;
        if(b.dataset.fid === c.fallacy.id){ b.classList.add("correct"); }
      });
      const fb = closeFeedback(chosen, c.fallacy, isCorrect);
      feedbackEl.classList.remove("hint");
      feedbackEl.classList.add("show", isCorrect ? "good" : "bad");
      verdictEl.textContent = fb.verdict;
      feedbackBodyEl.innerHTML = fb.body;
      if(isCorrect){ stampEl.hidden = false; }
      nextBtnEl.disabled = false;
      nextBtnEl.focus();
      scrollIntoViewPolite(nextBtnEl);
    }

    function handleAnswerFq(chosen, btn){
      if(resolved || btn.disabled) return;
      attempts++;
      const isCorrect = chosen.id === c.fallacy.id;

      if(isCorrect){
        playSfx("correct");
        close(chosen, true);
        return;
      }

      btn.classList.add("wrong");
      btn.disabled = true;

      if(attempts < 2){
        playSfx("hint");
        const fb = hintFeedback(chosen);
        feedbackEl.classList.remove("good","bad");
        feedbackEl.classList.add("show","hint");
        verdictEl.textContent = fb.verdict;
        feedbackBodyEl.innerHTML = fb.body;
        scrollIntoViewPolite(feedbackEl);
        const nextOption = Array.prototype.find.call(optionsEl.children, function(b){ return !b.disabled; });
        if(nextOption) nextOption.focus();
      } else {
        playSfx("final");
        close(chosen, false);
      }
    }

    nextBtnEl.addEventListener("click", function(){
      idx++;
      if(idx < cases.length){
        renderCase();
        body.querySelector(".statement").focus();
      } else {
        renderDone();
      }
    });
  }

  // moveFocus: false en el primer armado (showFamily ya enfoca el botón
  // "← Todos los modus operandi" justo después, ver más abajo — enfocar
  // también aquí sería un salto de foco redundante); true al reiniciar
  // desde "Practicar de nuevo", donde sí conviene volver a anunciar el
  // título de esta sección.
  function start(moveFocus){
    cases = buildFamilyQuizCases(catKey);
    idx = 0;
    renderCase();
    if(moveFocus){ titleEl.focus(); }
  }

  familyQuizControllers[catKey] = { start: start };
}

// ---------- Catalog ----------
const catalogRoot = document.getElementById("catalog-root");
CAT_ORDER.forEach(function(catKey){
  const cat = CATS[catKey];
  const section = document.createElement("section");
  section.className = "category";
  section.dataset.cat = catKey;
  // Oculta por defecto: el selector de familias decide cuál mostrar.
  section.hidden = true;

  const head = document.createElement("div");
  head.className = "category-head";
  const row = document.createElement("div");
  row.className = "row";
  const headingIcon = catIconEl(catKey, "family-icon category-icon");
  headingIcon.style.color = "var(" + cat.varName + ")";
  const h2 = document.createElement("h2");
  h2.textContent = cat.label;
  const tag = document.createElement("span");
  tag.className = "cat-tag";
  tag.style.background = "var(" + cat.soft + ")";
  tag.style.color = "var(" + cat.varName + ")";
  tag.textContent = "MODUS OPERANDI " + (CAT_ORDER.indexOf(catKey) + 1) + "/4";
  row.appendChild(headingIcon);
  row.appendChild(h2);
  row.appendChild(tag);
  const desc = document.createElement("p");
  desc.className = "cat-desc";
  desc.textContent = cat.desc;
  head.appendChild(row);
  head.appendChild(desc);
  section.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "cards";

  const items = FALLACIES.filter(function(f){ return f.cat === catKey; });
  items.forEach(function(f){
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--cat-color", catColor(catKey));
    card.style.setProperty("--cat-soft-color", catSoftBg(catKey));

    const tabEl = document.createElement("span");
    tabEl.className = "card-tab";
    tabEl.textContent = "EXPEDIENTE " + (FALLACIES.indexOf(f)+1).toString().padStart(2,"0");
    card.appendChild(tabEl);

    const detailId = "detail-" + f.id;
    const top = document.createElement("button");
    top.type = "button";
    top.className = "card-top";
    top.setAttribute("aria-expanded", "false");
    top.setAttribute("aria-controls", detailId);
    // Un <button> solo admite contenido "de frase" (spans, texto): nada de
    // <div>/<h3>/<p> dentro. El encabezado envuelve al botón en vez de
    // vivir adentro, así se sigue pudiendo navegar por encabezados con
    // lector de pantalla sin violar el modelo de contenido de <button>.
    const textWrap = document.createElement("span");
    textWrap.className = "card-top-text";
    const titleSpan = document.createElement("span");
    titleSpan.className = "card-top-title";
    titleSpan.textContent = f.name;
    // Kicker "MODUS OPERANDI": convierte el gancho (antes solo cursiva sin
    // etiqueta) en un campo más del expediente, igual que DEFINICIÓN, POR
    // QUÉ FALLA y EVIDENCIA más abajo — refuerza la narrativa de "ficha de
    // caso" sin cambiar el contenido, solo nombrando qué es ese texto.
    const hookLabel = document.createElement("span");
    hookLabel.className = "hook-label";
    hookLabel.textContent = "Modus operandi";
    const hookSpan = document.createElement("span");
    hookSpan.className = "hook";
    hookSpan.textContent = f.hook;
    textWrap.appendChild(titleSpan);
    textWrap.appendChild(hookLabel);
    textWrap.appendChild(hookSpan);
    const icon = document.createElement("span");
    icon.className = "expand-icon";
    // Antes era el carácter "+" (que giraba 45° hasta parecer una "×" al
    // expandir). Un chevron dibujado gira de forma más legible y encaja con
    // el resto de trazos finos (stroke=currentColor) que ya usa la app.
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<polyline points="6 9 12 15 18 9"/></svg>';
    icon.setAttribute("aria-hidden", "true");
    top.appendChild(textWrap);
    top.appendChild(icon);

    const heading = document.createElement("h3");
    heading.className = "card-top-heading";
    heading.appendChild(top);
    card.appendChild(heading);

    const detail = document.createElement("div");
    detail.className = "card-detail";
    detail.id = detailId;
    detail.innerHTML =
      '<div class="label">DEFINICIÓN</div><div>' + escapeHtml(f.def) + '</div>' +
      '<div class="label">POR QUÉ FALLA</div><div>' + escapeHtml(f.why) + '</div>' +
      '<div class="label">EVIDENCIA</div><div class="example-clip">“' + escapeHtml(f.example) + '”</div>';
    card.appendChild(detail);

    top.addEventListener("click", function(){
      const open = top.getAttribute("aria-expanded") === "true";
      top.setAttribute("aria-expanded", open ? "false" : "true");
      card.classList.toggle("open", !open);
    });

    grid.appendChild(card);
  });

  section.appendChild(grid);

  // Mini-práctica de esta familia: reutiliza el mismo "vidrio" que la
  // Práctica general (.practice-frame), así el cambio de leer expedientes
  // a resolver casos se siente como parte de la misma app, no como una
  // pantalla aparte.
  const quizContainer = document.createElement("div");
  quizContainer.className = "practice-frame family-quiz";
  section.appendChild(quizContainer);
  setupFamilyQuiz(catKey, quizContainer);

  catalogRoot.appendChild(section);
});

// ---------- Selector de familias ----------
const familySelectorRoot = document.getElementById("familySelectorRoot");
const familyBackRow = document.getElementById("familyBackRow");
const familyBackBtn = document.getElementById("familyBackBtn");
const catalogSections = catalogRoot.querySelectorAll("section.category");
let lastFamilyDoor = null;

CAT_ORDER.forEach(function(catKey){
  const cat = CATS[catKey];
  const heading = document.createElement("h2");
  heading.className = "family-card-heading";

  const door = document.createElement("button");
  door.type = "button";
  door.className = "family-card";
  door.dataset.cat = catKey;
  door.style.setProperty("--cat-color", catColor(catKey));
  door.style.setProperty("--cat-soft-color", catSoftBg(catKey));

  const head = document.createElement("span");
  head.className = "family-card-head";
  const tag = document.createElement("span");
  tag.className = "family-card-tag";
  tag.textContent = "MODUS OPERANDI " + (CAT_ORDER.indexOf(catKey) + 1) + "/4";
  const icon = catIconEl(catKey, "family-icon");
  head.appendChild(tag);
  head.appendChild(icon);

  const title = document.createElement("span");
  title.className = "family-card-title";
  title.textContent = cat.label;

  const desc = document.createElement("span");
  desc.className = "family-card-desc";
  desc.textContent = cat.desc;

  const n = FALLACIES.filter(function(f){ return f.cat === catKey; }).length;
  const count = document.createElement("span");
  count.className = "family-card-count";
  count.textContent = n + (n === 1 ? " falacia →" : " falacias →");

  door.appendChild(head);
  door.appendChild(title);
  door.appendChild(desc);
  door.appendChild(count);
  heading.appendChild(door);
  familySelectorRoot.appendChild(heading);

  door.addEventListener("click", function(){ showFamily(catKey, door); });
});

function showFamily(catKey, triggerEl){
  lastFamilyDoor = triggerEl || familySelectorRoot.querySelector('.family-card[data-cat="' + catKey + '"]');
  familySelectorRoot.hidden = true;
  familyBackRow.hidden = false;
  Array.prototype.forEach.call(catalogSections, function(section){
    section.hidden = section.dataset.cat !== catKey;
  });
  familyBackBtn.focus();
  // Cada vez que se entra a una familia se arma su mini-práctica con 3
  // casos nuevos (ver "Mini-práctica por familia" más arriba) — sin
  // guardar nada entre visitas, igual que el resto del Catálogo.
  if(familyQuizControllers[catKey]){ familyQuizControllers[catKey].start(); }
}
function showFamilySelector(){
  familySelectorRoot.hidden = false;
  familyBackRow.hidden = true;
  Array.prototype.forEach.call(catalogSections, function(section){ section.hidden = true; });
  if(lastFamilyDoor && typeof lastFamilyDoor.focus === "function"){ lastFamilyDoor.focus(); }
}
familyBackBtn.addEventListener("click", showFamilySelector);

// ---------- Tabs ----------
const tabCatalogo = document.getElementById("tab-catalogo");
const tabPractica = document.getElementById("tab-practica");
const viewCatalogo = document.getElementById("view-catalogo");
const viewPractica = document.getElementById("view-practica");
const tabButtons = [tabCatalogo, tabPractica];
// Roving tabindex: solo la pestaña seleccionada es una parada de Tab: las
// flechas mueven el foco entre pestañas sin añadir paradas extra al orden
// normal de tabulación (patrón WAI-ARIA APG para "tabs").
tabCatalogo.tabIndex = 0;
tabPractica.tabIndex = -1;

function selectTab(which, opts){
  const moveFocus = opts && opts.moveFocus;
  const catalogo = which === "catalogo";
  tabCatalogo.setAttribute("aria-selected", catalogo ? "true" : "false");
  tabPractica.setAttribute("aria-selected", catalogo ? "false" : "true");
  tabCatalogo.tabIndex = catalogo ? 0 : -1;
  tabPractica.tabIndex = catalogo ? -1 : 0;
  viewCatalogo.classList.toggle("active", catalogo);
  viewPractica.classList.toggle("active", !catalogo);
  // Cada pestaña tiene su propio modo de proyección: al cambiar de pestaña
  // se limpian los dos, para que el botón nunca quede diciendo "apagado"
  // mientras algún efecto visual del otro modo sigue activo.
  closePresent();
  document.body.classList.remove("projection");
  updateProjButton();
  if(moveFocus){ (catalogo ? tabCatalogo : tabPractica).focus(); }
  // El primer caso (qIndex 0) ya está renderizado en el HTML desde antes de
  // que onboardingReady exista, así que renderQuestion() nunca llegó a
  // avisarle a la Fase 2 sobre él. Se lo avisamos acá, la primera vez que
  // la persona entra a Práctica.
  if(!catalogo && onboardingReady){ maybeShowTip("render", qIndex); }
}
tabCatalogo.addEventListener("click", function(){ selectTab("catalogo"); });
tabPractica.addEventListener("click", function(){ selectTab("practica"); });

// Flechas ←/→ y Home/End dentro del tablist: mueven el foco y activan la
// pestaña de una vez (activación automática, como espera quien usa teclado
// o lector de pantalla en un patrón de "tabs" estándar).
document.querySelector("nav.tabs").addEventListener("keydown", function(e){
  const key = e.key;
  if(key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
  const currentIndex = tabButtons.indexOf(document.activeElement);
  if(currentIndex === -1) return;
  e.preventDefault();
  let nextIndex;
  if(key === "Home"){ nextIndex = 0; }
  else if(key === "End"){ nextIndex = tabButtons.length - 1; }
  else {
    const dir = key === "ArrowRight" ? 1 : -1;
    nextIndex = (currentIndex + dir + tabButtons.length) % tabButtons.length;
  }
  const nextTab = tabButtons[nextIndex];
  selectTab(nextTab === tabCatalogo ? "catalogo" : "practica", { moveFocus:true });
});

// ---------- Presentation overlay (Catálogo, one expediente at a time) ----------
const presentOverlay = document.getElementById("presentOverlay");
const presentBody = document.getElementById("presentBody");
const presentProgress = document.getElementById("presentProgress");
const presentPrev = document.getElementById("presentPrev");
const presentNext = document.getElementById("presentNext");
const presentClose = document.getElementById("presentClose");
let presentIndex = 0;
const wrapEl = document.querySelector(".wrap");
let lastFocused = null;

function renderPresent(){
  const f = FALLACIES[presentIndex];
  const cat = CATS[f.cat];
  presentProgress.textContent = "Expediente " + (presentIndex+1) + " de " + FALLACIES.length + " · " + cat.label;
  presentBody.innerHTML =
    '<span class="present-tag" style="background:' + catSoftBg(f.cat) + ';color:' + catColor(f.cat) + '">' +
      '<span class="family-icon present-tag-icon">' + catIconSvg(f.cat) + '</span>' + cat.label.toUpperCase() +
    '</span>' +
    '<h2 class="present-name">' + escapeHtml(f.name) + '</h2>' +
    '<div class="present-label present-label-hook">MODUS OPERANDI</div>' +
    '<p class="present-hook">' + escapeHtml(f.hook) + '</p>' +
    '<div class="present-label">DEFINICIÓN</div>' +
    '<p class="present-text">' + escapeHtml(f.def) + '</p>' +
    '<div class="present-label">POR QUÉ FALLA</div>' +
    '<p class="present-text">' + escapeHtml(f.why) + '</p>' +
    '<div class="present-label">EVIDENCIA</div>' +
    '<p class="present-example" style="background:' + catSoftBg(f.cat) + '">“' + escapeHtml(f.example) + '”</p>';
  presentPrev.disabled = presentIndex === 0;
  presentNext.disabled = presentIndex === FALLACIES.length - 1;
}

function openPresent(){
  lastFocused = document.activeElement;
  presentIndex = 0;
  renderPresent();
  presentOverlay.hidden = false;
  if(wrapEl) wrapEl.inert = true;
  presentClose.focus();
  updateProjButton();
}
function closePresent(){
  if(!presentOverlay.hidden){
    presentOverlay.hidden = true;
    if(wrapEl) wrapEl.inert = false;
    if(lastFocused && typeof lastFocused.focus === "function"){ lastFocused.focus(); }
    updateProjButton();
  }
}
presentPrev.addEventListener("click", function(){
  if(presentIndex > 0){ presentIndex--; renderPresent(); }
});
presentNext.addEventListener("click", function(){
  if(presentIndex < FALLACIES.length - 1){ presentIndex++; renderPresent(); }
});
presentClose.addEventListener("click", closePresent);
document.addEventListener("keydown", function(e){
  if(presentOverlay.hidden) return;
  if(e.key === "Escape") closePresent();
  if(e.key === "ArrowRight" && !presentNext.disabled){ presentIndex++; renderPresent(); }
  if(e.key === "ArrowLeft" && !presentPrev.disabled){ presentIndex--; renderPresent(); }
});

// ---------- Projection / presentation toggle button ----------
const projBtn = document.getElementById("projBtn");
function updateProjButton(){
  const catalogoActive = tabCatalogo.getAttribute("aria-selected") === "true";
  const on = catalogoActive ? !presentOverlay.hidden : document.body.classList.contains("projection");
  projBtn.setAttribute("aria-pressed", on ? "true" : "false");
  // Mismo botón, dos trabajos distintos según la pestaña activa: en el
  // Catálogo abre el carrusel de expedientes a pantalla completa; en
  // Práctica solo agranda el texto. Antes decía "Modo proyección" en los
  // dos casos, así que quien lo aprendía en un lado esperaba lo mismo del
  // otro. La etiqueta ahora cambia con la pestaña para que cada
  // comportamiento se entienda por separado (ver Auditoría de
  // Cazafalacias, hallazgo de UX).
  projBtn.textContent = catalogoActive ? "Modo proyección" : "Texto grande";
}
projBtn.addEventListener("click", function(){
  if(tabCatalogo.getAttribute("aria-selected") === "true"){
    if(presentOverlay.hidden){ openPresent(); } else { closePresent(); }
  } else {
    document.body.classList.toggle("projection");
    updateProjButton();
  }
});

// ---------- Practice ----------
let queue = [];
let qIndex = 0;
// "Gramática de la Cuantificación": dos contadores con roles distintos, no
// una sola fracción de aciertos/errores.
// - criticalAnalysisPoints solo suma (nunca se muestra como fracción ni
//   resta por un error): cada caso resuelto correctamente —al primer
//   intento o al segundo— aporta un punto de análisis crítico.
// - totalAttempts es el "marcador de persistencia": cuenta cada clic sobre
//   una opción a lo largo de TODA la sesión de práctica (se reinicia solo
//   al recargar la página, nunca entre un caso y el siguiente), para
//   enmarcar el esfuerzo —incluido el de equivocarse y volver a intentar—
//   como algo que se acumula, no como una tasa de error.
let criticalAnalysisPoints = 0;
let totalAttempts = 0;
// Sistema de dos intentos con andamiaje conceptual: currentAttempts cuenta
// los clics fallidos del caso actual (se reinicia en cada pregunta nueva);
// caseResolved es true solo cuando el caso queda cerrado de verdad —al
// acertar, o al fallar por segunda vez— y es lo único que bloquea nuevos
// clics y habilita "Siguiente caso".
let currentAttempts = 0;
let caseResolved = false;
// Diario de Caza: estadísticas por familia y cronómetro de ESTA ronda de 36
// casos. Se reinician en cada buildQueue() (ronda nueva), a diferencia de
// criticalAnalysisPoints/totalAttempts, que persisten entre rondas mientras
// la pestaña siga abierta.
let categoryStats = {};
let roundStartTime = 0;

function freshCategoryStats(){
  const stats = {};
  CAT_ORDER.forEach(function(catKey){ stats[catKey] = { correct: 0, total: 0 }; });
  return stats;
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    const tmp=a[i]; a[i]=a[j]; a[j]=tmp;
  }
  return a;
}

function buildQueue(){
  queue = shuffle(PRACTICE.map(function(_,i){return i;}));
  qIndex = 0;
  categoryStats = freshCategoryStats();
  roundStartTime = Date.now();
}

const progressLabel = document.getElementById("progressLabel");
// scoreLabel/attemptsLabel ahora envuelven un ícono decorativo además del
// texto (ver index.html): el texto que cambia con cada respuesta vive en
// estos spans internos, para no borrar el ícono cada vez que se actualiza.
// Los contenedores en sí (no solo el texto) llevan aria-live="polite" en el
// HTML — se guardan también aquí porque bumpPill() (más abajo) anima el
// contenedor completo, no el texto suelto.
const scoreLabel = document.getElementById("scoreLabel");
const scoreLabelText = document.getElementById("scoreLabelText");
const attemptsLabel = document.getElementById("attemptsLabel");
const attemptsLabelText = document.getElementById("attemptsLabelText");
// Pequeño refuerzo visual (además del auditivo y del aria-live) cada vez
// que un contador cambia: un "bump" de escala breve. classList.remove +
// reflow forzado (offsetWidth) + classList.add es el truco estándar para
// poder volver a disparar la MISMA animación CSS en el mismo elemento en
// clics consecutivos — sin el reflow de por medio, el navegador ve la
// clase "ya puesta" y no vuelve a animar.
function bumpPill(el){
  el.classList.remove("pill-bump");
  void el.offsetWidth;
  el.classList.add("pill-bump");
}
const statementText = document.getElementById("statementText");
// tabindex="-1" inyectado en tiempo de ejecución: permite enfocar el
// enunciado por script (para que el lector de pantalla lo anuncie al
// avanzar de caso) sin añadirlo como parada nueva al orden normal de Tab.
statementText.tabIndex = -1;
// El texto del caso ya no vive directamente en #statementText: ese
// elemento pasó a ser un wrapper (para poder alojar el sello "CASO
// RESUELTO" como hijo aparte) y el texto en sí vive en este span interno.
const statementTextInner = document.getElementById("statementTextInner");
const caseStamp = document.getElementById("caseStamp");
const optionsRoot = document.getElementById("optionsRoot");
const feedbackBox = document.getElementById("feedbackBox");
const feedbackVerdict = document.getElementById("feedbackVerdict");
const feedbackBody = document.getElementById("feedbackBody");
const nextBtn = document.getElementById("nextBtn");
const practiceFrame = document.getElementById("practiceFrame");
const journalPanel = document.getElementById("journalPanel");
const journalTitle = document.getElementById("journalTitle");
const journalSkills = document.getElementById("journalSkills");
const journalTime = document.getElementById("journalTime");
const journalRestartBtn = document.getElementById("journalRestartBtn");

// ---------- Sonido de retroalimentación ----------
// Tonos sintetizados en el momento con la Web Audio API (osciladores
// simples): nada de archivos de audio que descargar, alojar o versionar —
// el sitio sigue siendo exactamente estos 4 archivos estáticos. Los tres
// eventos de validación de un caso (pista tras un primer intento fallido,
// cierre sin acierto, acierto) usan tonos breves y distintos entre sí, para
// que se reconozcan de oído sin depender de mirar la pantalla: un refuerzo
// EN PARALELO al texto y a las animaciones, nunca su reemplazo.
//
// Calibración emocional a propósito: el sonido de un intento fallido NUNCA
// es un timbre de alarma ni un "buzz" áspero. La pista (primer fallo) es
// una sola nota breve y suave — "todavía no", el caso sigue abierto para un
// segundo intento. El cierre sin acierto (segundo fallo) es apenas un poco
// más definido pero sigue siendo dos notas suaves y descendentes, sin
// disonancia: informa que el caso se cerró, no castiga por haberlo fallado.
// El acierto, en cambio, usa una onda triangular más luminosa y dos notas
// ascendentes — la única señal que se permite sonar francamente positiva.
const SOUND_KEY = "cazafalacias-sound";
let soundsEnabled = true;
try {
  const storedSound = window.localStorage.getItem(SOUND_KEY);
  if(storedSound !== null) soundsEnabled = storedSound === "1";
} catch(e) { /* sin localStorage: sonido activado por defecto, sin romper nada */ }

let audioCtx = null;
function getAudioCtx(){
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if(!Ctor) return null;
  if(!audioCtx){ audioCtx = new Ctor(); }
  // Los navegadores arrancan el contexto "suspended" hasta el primer gesto
  // del usuario. Cada clic sobre una opción de respuesta YA es ese gesto,
  // así que basta con reanudarlo aquí — no hace falta un paso previo solo
  // para "desbloquear" el audio.
  if(audioCtx.state === "suspended"){ audioCtx.resume(); }
  return audioCtx;
}

// Un tono con envolvente de ataque/caída corta (evita el "clic" de
// prender/apagar una onda de golpe), reutilizado por las tres señales.
function playTone(ctx, freq, startOffset, duration, peakGain, wave){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + startOffset;
  const t1 = t0 + duration;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.015, duration / 3));
  gain.gain.linearRampToValueAtTime(0, t1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

// kind: "hint" (primer intento fallido, el caso sigue abierto), "final"
// (segundo intento fallido, caso cerrado sin acierto) o "correct".
function playSfx(kind){
  if(!soundsEnabled) return;
  try {
    const ctx = getAudioCtx();
    if(!ctx) return;
    if(kind === "correct"){
      playTone(ctx, 523.25, 0,    0.11, 0.05,  "triangle"); // Do5
      playTone(ctx, 659.25, 0.09, 0.16, 0.055, "triangle"); // Mi5
    } else if(kind === "hint"){
      playTone(ctx, 349.23, 0, 0.10, 0.035, "sine"); // Fa4, único y breve
    } else {
      playTone(ctx, 392.00, 0,    0.14, 0.045, "sine"); // Sol4
      playTone(ctx, 329.63, 0.11, 0.18, 0.045, "sine"); // Mi4
    }
  } catch(e) { /* Web Audio no disponible o bloqueada: sin sonido, sin romper nada */ }
}

const soundBtn = document.getElementById("soundBtn");
const soundIcon = document.getElementById("soundIcon");
function updateSoundButton(){
  soundBtn.setAttribute("aria-pressed", soundsEnabled ? "true" : "false");
  soundIcon.textContent = soundsEnabled ? "🔊" : "🔇";
}
updateSoundButton();
soundBtn.addEventListener("click", function(){
  soundsEnabled = !soundsEnabled;
  updateSoundButton();
  try { window.localStorage.setItem(SOUND_KEY, soundsEnabled ? "1" : "0"); } catch(e) { /* no persiste, pero no rompe nada */ }
});

function pickOptions(correctFallacy){
  const pool = FALLACIES.filter(function(f){ return f.id !== correctFallacy.id; });
  const sameCat = pool.filter(function(f){ return f.cat === correctFallacy.cat; });
  const otherCat = pool.filter(function(f){ return f.cat !== correctFallacy.cat; });
  const chosenSameCat = shuffle(sameCat).slice(0,1);
  const restPool = otherCat.concat(sameCat.filter(function(f){ return chosenSameCat.indexOf(f) === -1; }));
  const chosenRest = shuffle(restPool).slice(0,2);
  return shuffle([correctFallacy].concat(chosenSameCat, chosenRest));
}

function renderQuestion(moveFocusToFirstOption){
  // Si el foco está en "Siguiente caso" (o en cualquier opción de la
  // pregunta anterior) y lo deshabilitamos como parte de este refresco,
  // el navegador lo manda a <body> y quien navega con teclado pierde su
  // posición. Lo movemos nosotros mismos a un lugar sensato ANTES de
  // deshabilitar nada.
  const focusWasInPractice = document.activeElement &&
    (document.activeElement === nextBtn || optionsRoot.contains(document.activeElement));

  const practiceIdx = queue[qIndex];
  const entry = PRACTICE[practiceIdx];
  const correctId = entry[0];
  const text = entry[1];
  const correctFallacy = byId[correctId];

  statementTextInner.textContent = text;
  // El sello es del caso ANTERIOR (si lo hubo): un caso nuevo empieza
  // siempre sin sello, incluso si el anterior se cerró con acierto.
  caseStamp.hidden = true;
  progressLabel.textContent = "Caso " + (qIndex+1) + " de " + PRACTICE.length;

  const options = pickOptions(correctFallacy);
  const letters = ["A","B","C","D"];

  optionsRoot.innerHTML = "";
  options.forEach(function(opt, i){
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.type = "button";
    btn.dataset.fid = opt.id;
    const letter = document.createElement("span");
    letter.className = "opt-letter";
    letter.textContent = letters[i];
    const label = document.createElement("span");
    label.textContent = opt.name;
    btn.appendChild(letter);
    btn.appendChild(label);
    btn.addEventListener("click", function(){ handleAnswer(opt, correctFallacy, btn); });
    optionsRoot.appendChild(btn);
  });

  feedbackBox.classList.remove("show","good","bad","hint");
  // El contenedor aria-live ya no se oculta con display:none (ver
  // .feedback en styles.css), así que sigue presente en el árbol de
  // accesibilidad entre un caso y otro. Si no vaciamos su texto aquí,
  // alguien navegando con lector de pantalla en modo de exploración
  // podría toparse con la retroalimentación del caso ANTERIOR todavía
  // "leíble" aunque esté oculta visualmente.
  feedbackVerdict.textContent = "";
  feedbackBody.innerHTML = "";
  nextBtn.disabled = true;
  caseResolved = false;
  currentAttempts = 0;

  // Antes el foco pasaba a la primera opción de respuesta al avanzar de
  // caso: un lector de pantalla saltaba directo a las alternativas y
  // nunca llegaba a anunciar el enunciado nuevo. Ahora aterriza en el
  // propio enunciado (statementText, con tabindex="-1" asignado arriba),
  // así se lee el caso nuevo antes de que la persona llegue a las opciones.
  if(moveFocusToFirstOption && focusWasInPractice){
    statementText.focus();
  }

  if(onboardingReady) maybeShowTip("render", qIndex);
}

// Anuncia una pista de andamiaje tras un primer intento fallido: nombra la
// falacia elegida (incorrecta) y recuerda su definición, sin revelar la
// respuesta correcta. El caso queda abierto para un segundo intento.
function showHint(chosen){
  feedbackBox.classList.remove("good","bad");
  feedbackBox.classList.add("show","hint");
  // Texto compartido con la mini-práctica de familia (ver hintFeedback,
  // definida junto al resto de "Mini-práctica por familia" más arriba):
  // una sola fuente de verdad para esta redacción.
  const fb = hintFeedback(chosen);
  feedbackVerdict.textContent = fb.verdict;
  feedbackBody.innerHTML = fb.body;
  scrollIntoViewPolite(feedbackBox);

  if(onboardingReady) maybeShowTip("feedback", qIndex);
}

// Cierra el caso de forma definitiva: al acertar (en el primer o segundo
// intento) o al fallar por segunda vez. Deshabilita todas las opciones,
// revela cuál era la correcta y habilita "Siguiente caso". Reutiliza
// exactamente la lógica de revelación que ya existía cuando el sistema
// era de un solo intento.
function closeCase(chosen, correctFallacy, isCorrect){
  caseResolved = true;
  // Diario de Caza: cada caso cerrado (con o sin acierto) cuenta para la
  // familia de LA FALACIA CORRECTA de este enunciado, no para la que eligió
  // el estudiante — así el panel final mide qué familias reconoce bien,
  // no qué opciones tocó.
  categoryStats[correctFallacy.cat].total++;
  if(isCorrect){ categoryStats[correctFallacy.cat].correct++; }
  // Puntos de Análisis Crítico: solo suman, nunca se expresan como
  // fracción de intentos fallidos — un acierto al segundo intento vale lo
  // mismo que uno al primero, porque lo que se está reconociendo es haber
  // resuelto el caso, no la ausencia de error en el camino.
  if(isCorrect){ criticalAnalysisPoints++; }
  scoreLabelText.textContent = "Puntos de Análisis Crítico: " + criticalAnalysisPoints;
  if(isCorrect){ bumpPill(scoreLabel); }

  Array.prototype.forEach.call(optionsRoot.children, function(b){
    b.disabled = true;
    if(b.dataset.fid === correctFallacy.id){ b.classList.add("correct"); }
  });

  feedbackBox.classList.remove("hint");
  feedbackBox.classList.add("show", isCorrect ? "good" : "bad");

  // Texto compartido con la mini-práctica de familia (ver closeFeedback,
  // definida junto al resto de "Mini-práctica por familia" más arriba).
  const fb = closeFeedback(chosen, correctFallacy, isCorrect);
  feedbackVerdict.textContent = fb.verdict;
  feedbackBody.innerHTML = fb.body;
  if(isCorrect){
    // Sello "CASO RESUELTO": solo en el cierre CORRECTO (da igual si fue al
    // primer o al segundo intento — un acierto vale lo mismo en toda esta
    // app, ver criticalAnalysisPoints más arriba). Puramente decorativo: el
    // acierto ya lo anuncia el texto de arriba en el aria-live.
    caseStamp.hidden = false;
  }

  nextBtn.disabled = false;
  // El botón que se acaba de responder queda deshabilitado; quien navega
  // con teclado necesita que el foco aterrice en algún lugar visible en
  // vez de perderse. "Siguiente caso" es la acción que sigue de todas
  // formas, así que lo enfocamos nosotros.
  nextBtn.focus();
  scrollIntoViewPolite(nextBtn);

  if(onboardingReady) maybeShowTip("feedback", qIndex);
}

// En pantallas bajas, la retroalimentación (sobre todo cuando trae dos
// párrafos) puede empujar el elemento objetivo fuera de la vista. Lo
// traemos a la vista sin saltos bruscos para quien no pidió menos
// movimiento. Compartida entre la pista de andamiaje (apunta a
// feedbackBox) y el cierre del caso (apunta a nextBtn).
function scrollIntoViewPolite(el){
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(function(){
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  });
}

function handleAnswer(chosen, correctFallacy, btn){
  if(caseResolved || btn.disabled) return;
  currentAttempts++;
  // Marcador de Persistencia: suma en CADA clic válido, sea o no acertado,
  // y nunca se reinicia entre casos (solo currentAttempts se reinicia por
  // pregunta). Enmarca el esfuerzo invertido en la sesión completa como
  // algo que se acumula de forma positiva, no como una tasa de error.
  totalAttempts++;
  attemptsLabelText.textContent = "Persistencia: " + totalAttempts + (totalAttempts === 1 ? " intento" : " intentos");
  bumpPill(attemptsLabel);
  const isCorrect = chosen.id === correctFallacy.id;

  if(isCorrect){
    playSfx("correct");
    closeCase(chosen, correctFallacy, true);
    return;
  }

  // Incorrecto: se marca SOLO el botón elegido, sin tocar los demás ni
  // revelar la respuesta correcta todavía. El propio CSS de .opt-btn.wrong
  // ya trae su sacudida breve (optWrongShake) y .opt-btn.correct su pulso
  // (optCorrectPulse, ver closeCase) — el sonido de abajo es su contraparte
  // auditiva, no un reemplazo.
  btn.classList.add("wrong");
  btn.disabled = true;

  if(currentAttempts < 2){
    // Primer intento fallido: pista de andamiaje, el caso sigue abierto.
    playSfx("hint");
    showHint(chosen);
    // El botón recién marcado queda deshabilitado; sin intervención el
    // navegador manda el foco a <body> (el mismo problema ya resuelto
    // antes en este archivo para otros casos de deshabilitar el control
    // enfocado). Lo llevamos nosotros a la siguiente opción disponible
    // para que el segundo intento quede a un solo paso.
    const nextOption = Array.prototype.find.call(optionsRoot.children, function(b){ return !b.disabled; });
    if(nextOption) nextOption.focus();
  } else {
    // Segundo intento fallido: se cierra el caso sin acierto.
    playSfx("final");
    closeCase(chosen, correctFallacy, false);
  }
}

// Aviso antes de perder el progreso de la sesión: recargar o cerrar la
// pestaña no guarda nada (es intencional, ver footer y comentarios de
// criticalAnalysisPoints/totalAttempts más arriba), pero hacerlo SIN darse
// cuenta a mitad de una ronda es una frustración evitable. totalAttempts
// nunca se reinicia solo (solo al recargar), así que ">0" es una señal
// simple y confiable de "hay algo que se perdería". El texto del diálogo
// lo pone el navegador — los navegadores actuales ignoran el mensaje
// personalizado por seguridad — así que basta con dispararlo.
window.addEventListener("beforeunload", function(e){
  if(totalAttempts > 0){
    e.preventDefault();
    e.returnValue = "";
  }
});

// Formatea milisegundos como "Ns" o "M min Ns" para el Diario de Caza. Solo
// se usa una vez por ronda (al mostrar el panel final), así que no necesita
// actualizarse en vivo ni manejar horas.
function formatElapsed(ms){
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if(minutes === 0){ return seconds + " s"; }
  return minutes + " min " + seconds + " s";
}

// Describe qué tan visible fue el patrón de esa familia en esta ronda, no
// qué tan "bien" le fue al estudiante: son los mismos tres tramos que una
// nota (alto/medio/bajo), pero la palabra elegida describe la dificultad de
// seguirle el rastro a la falacia, no el desempeño de la persona — a
// propósito, para no reintroducir el lenguaje de aprobado/reprobado que el
// resto de esta app evita deliberadamente (ver criticalAnalysisPoints más
// arriba).
function trailLabel(pct){
  if(pct >= 75) return "Rastro claro";
  if(pct >= 40) return "Rastro parcial";
  return "Rastro difícil de seguir";
}

// Construye el gráfico de barras (una fila por familia) y el tiempo total
// de la ronda a partir de categoryStats/roundStartTime. Se llama justo
// antes de revelar el panel, así que siempre refleja los 36 casos recién
// terminados.
function renderJournal(){
  journalSkills.innerHTML = "";
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fillsToAnimate = [];

  CAT_ORDER.forEach(function(catKey){
    const cat = CATS[catKey];
    const stats = categoryStats[catKey];
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

    const row = document.createElement("div");
    row.className = "skill-row";

    const head = document.createElement("div");
    head.className = "skill-row-head";
    const labelWrap = document.createElement("span");
    labelWrap.className = "skill-row-label-wrap";
    const icon = catIconEl(catKey, "family-icon skill-row-icon");
    icon.style.color = catColor(catKey);
    const label = document.createElement("span");
    label.className = "skill-row-label";
    label.textContent = cat.label;
    labelWrap.appendChild(icon);
    labelWrap.appendChild(label);
    const pctSpan = document.createElement("span");
    pctSpan.className = "skill-row-pct";
    pctSpan.textContent = stats.total > 0
      ? stats.correct + " de " + stats.total + " · " + pct + "%"
      : "Sin casos esta ronda";
    head.appendChild(labelWrap);
    head.appendChild(pctSpan);

    const track = document.createElement("div");
    track.className = "skill-bar-track";
    const fill = document.createElement("div");
    fill.className = "skill-bar-fill";
    fill.style.setProperty("--cat-color", catColor(catKey));
    if(reduceMotion){
      fill.style.width = pct + "%";
    } else {
      fill.style.width = "0%";
      fillsToAnimate.push({ el: fill, pct: pct });
    }
    track.appendChild(fill);

    // Etiqueta cualitativa (ver trailLabel arriba): acompaña al dato
    // numérico, no lo reemplaza. Solo tiene sentido cuando hubo casos de
    // esa familia en esta ronda.
    const trailText = stats.total > 0 ? trailLabel(pct) : "";
    if(trailText){
      const trail = document.createElement("div");
      trail.className = "skill-row-trail";
      trail.textContent = trailText;
      row.appendChild(head);
      row.appendChild(track);
      row.appendChild(trail);
    } else {
      row.appendChild(head);
      row.appendChild(track);
    }
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", cat.label + ": " + pctSpan.textContent + (trailText ? " — " + trailText : ""));

    journalSkills.appendChild(row);
  });

  if(fillsToAnimate.length){
    requestAnimationFrame(function(){
      fillsToAnimate.forEach(function(item){ item.el.style.width = item.pct + "%"; });
    });
  }

  journalTime.textContent = "Tiempo de esta ronda: " + formatElapsed(Date.now() - roundStartTime);
}

// Reemplaza el contenedor de la pregunta por el Diario de Caza al terminar
// los 36 casos de la ronda (nunca coexisten visibles). El foco pasa al
// título del panel, con el mismo patrón tabindex="-1" + focus() usado ya
// para statementText: quien navega con lector de pantalla necesita que se
// anuncie el cambio de pantalla, no quedarse "colgado" en el botón que
// acaba de desaparecer.
function showJournal(){
  renderJournal();
  practiceFrame.hidden = true;
  journalPanel.hidden = false;
  journalTitle.focus();
  scrollIntoViewPolite(journalTitle);
}
function hideJournal(){
  journalPanel.hidden = true;
  practiceFrame.hidden = false;
}

nextBtn.addEventListener("click", function(){
  qIndex++;
  if(qIndex >= queue.length){
    showJournal();
  } else {
    renderQuestion(true);
  }
});

// "Practicar de nuevo": arma una ronda nueva (nuevo orden, categoryStats y
// cronómetro en cero) sin tocar criticalAnalysisPoints ni totalAttempts,
// que son marcadores de TODA la sesión, no de una ronda. El foco previo
// (journalRestartBtn) no cuenta como "dentro de la práctica" para
// renderQuestion, así que aquí se lleva el foco al enunciado explícitamente,
// igual que al avanzar de un caso a otro.
journalRestartBtn.addEventListener("click", function(){
  buildQueue();
  hideJournal();
  renderQuestion(false);
  statementText.focus();
});

buildQueue();
renderQuestion();
updateProjButton();

// ---------- Referencia rápida ("¿Qué es una falacia?") ----------
// Ya no se abre sola: la inducción progresiva de abajo reemplaza ese rol.
// Esto queda como una tarjeta corta y opcional (2 definiciones, no 4
// párrafos) disponible en cualquier momento, más un atajo para volver a
// ver el recorrido guiado.
const welcomeOverlay = document.getElementById("welcomeOverlay");
const welcomeClose = document.getElementById("welcomeClose");
const welcomeStart = document.getElementById("welcomeStart");
const welcomeReplayTour = document.getElementById("welcomeReplayTour");
const aboutBtn = document.getElementById("aboutBtn");
let welcomeLastFocused = null;

function openWelcome(){
  welcomeLastFocused = document.activeElement;
  // Evita dos overlays de pantalla completa abiertos a la vez.
  closePresent();
  document.body.classList.remove("projection");
  welcomeOverlay.hidden = false;
  if(wrapEl) wrapEl.inert = true;
  welcomeClose.focus();
}
function closeWelcome(){
  if(!welcomeOverlay.hidden){
    welcomeOverlay.hidden = true;
    if(wrapEl) wrapEl.inert = false;
    if(welcomeLastFocused && welcomeLastFocused !== document.body && typeof welcomeLastFocused.focus === "function"){
      welcomeLastFocused.focus();
    } else {
      aboutBtn.focus();
    }
  }
}
welcomeClose.addEventListener("click", closeWelcome);
welcomeStart.addEventListener("click", closeWelcome);
welcomeReplayTour.addEventListener("click", function(){
  closeWelcome();
  openCoach();
});
aboutBtn.addEventListener("click", openWelcome);
document.addEventListener("keydown", function(e){
  if(welcomeOverlay.hidden) return;
  if(e.key === "Escape") closeWelcome();
});

// ---------- Inducción progresiva ----------
// Reemplaza el modal único de "Antes de empezar": en vez de soltar toda la
// teoría de una vez antes de que la persona haya tocado nada, la carga se
// reparte en dos fases que aparecen en momentos distintos:
// - Fase 1 (recorrido guiado, abajo): solo mecánica de la interfaz —dónde
//   están los expedientes, qué hace cada botón—, la única carga que hace
//   falta para poder empezar a moverse por el sitio ("carga extrínseca").
// - Fase 2 (pistas contextuales, más abajo en Práctica): las definiciones
//   conceptuales (qué es un argumento, qué es una falacia, que esto no
//   califica) aparecen una por una, ancladas al elemento real de la
//   interfaz, justo cuando el primer caso las hace relevantes — no antes
//   ("carga intrínseca" dosificada en vez de un bloque de texto).
// Todo el estado de qué ya se mostró vive en localStorage bajo una sola
// clave, para que nada se repita al recargar. Si el almacenamiento no está
// disponible (modo privado, política del navegador), onboardState queda en
// null: ni el recorrido ni las pistas se abren solos, pero el botón
// "¿Qué es una falacia?" y "Ver el recorrido guiado" los siguen ofreciendo
// a mano, y esa apertura manual simplemente no se recuerda entre recargas.
const ONBOARD_KEY = "cazafalacias-onboarding-v2";
let onboardState;
try {
  onboardState = JSON.parse(window.localStorage.getItem(ONBOARD_KEY)) || {};
} catch(e) {
  onboardState = null;
}
function onboardDone(key){ return !!(onboardState && onboardState[key]); }
function markOnboard(key){
  if(!onboardState) return;
  onboardState[key] = true;
  try { window.localStorage.setItem(ONBOARD_KEY, JSON.stringify(onboardState)); } catch(e) { /* no persiste, pero no rompe nada */ }
}

// Coloca una caja flotante (la burbuja del recorrido o una pista de
// Práctica) cerca de un elemento objetivo, sin salirse de la pantalla.
// Compartida entre las dos fases porque el problema geométrico es el
// mismo: solo cambia qué contiene la caja.
function positionFloatingBox(boxEl, targetEl, preferredSide){
  const r = targetEl.getBoundingClientRect();
  const margin = 12;
  const maxWidth = Math.min(320, window.innerWidth - margin*2);
  boxEl.style.width = maxWidth + "px";
  const boxHeight = boxEl.getBoundingClientRect().height;
  let top;
  if(preferredSide === "top" && r.top - boxHeight - margin > 0){
    top = r.top - boxHeight - margin;
  } else if(r.bottom + boxHeight + margin < window.innerHeight){
    top = r.bottom + margin;
  } else {
    top = Math.max(margin, window.innerHeight - boxHeight - margin);
  }
  let left = r.left;
  left = Math.min(left, window.innerWidth - maxWidth - margin);
  left = Math.max(margin, left);
  boxEl.style.top = top + "px";
  boxEl.style.left = left + "px";
}
function reducedMotion(){
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---- Fase 1: recorrido guiado de la interfaz ----
const coachOverlay = document.getElementById("coachOverlay");
const coachHighlight = document.getElementById("coachHighlight");
const coachBubble = document.getElementById("coachBubble");
const coachStepLabel = document.getElementById("coachStep");
const coachTitleEl = document.getElementById("coachTitle");
const coachTextEl = document.getElementById("coachText");
const coachPrev = document.getElementById("coachPrev");
const coachNext = document.getElementById("coachNext");
const coachSkip = document.getElementById("coachSkip");

const COACH_STEPS = [
  {
    selector: "nav.tabs",
    title: "Dos maneras de usar Cazafalacias",
    text: "Catálogo: expedientes para estudiar cada falacia con calma. Práctica: 36 casos para poner a prueba lo que sabes."
  },
  {
    selector: ".family-card",
    title: "Los expedientes viven aquí",
    text: "Cada tarjeta agrupa 3 falacias que engañan de forma parecida. Haz clic en una para abrirla y leer las fichas completas."
  },
  {
    selector: "#projBtn",
    title: "Un botón, dos trabajos",
    text: "Aquí, en el Catálogo, abre un carrusel a pantalla completa para proyectar en clase. Dentro de Práctica cambia de nombre a \"Texto grande\": ahí solo agranda la letra."
  }
];
let coachIndex = 0;
let coachLastFocused = null;

function positionCoachHighlight(target){
  const r = target.getBoundingClientRect();
  const pad = 8;
  coachHighlight.style.top = (r.top - pad) + "px";
  coachHighlight.style.left = (r.left - pad) + "px";
  coachHighlight.style.width = (r.width + pad*2) + "px";
  coachHighlight.style.height = (r.height + pad*2) + "px";
}
function positionCoachStep(){
  const step = COACH_STEPS[coachIndex];
  const target = document.querySelector(step.selector);
  if(!target){
    // Defensivo: si el elemento no está (p. ej. una versión futura cambia
    // de estructura), no se deja a nadie mirando un recorrido roto.
    closeCoach(true);
    return;
  }
  positionCoachHighlight(target);
  positionFloatingBox(coachBubble, target, "bottom");
  target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
}
function renderCoachStep(){
  const step = COACH_STEPS[coachIndex];
  coachStepLabel.textContent = "Paso " + (coachIndex+1) + " de " + COACH_STEPS.length;
  coachTitleEl.textContent = step.title;
  coachTextEl.textContent = step.text;
  coachPrev.hidden = coachIndex === 0;
  coachNext.textContent = coachIndex === COACH_STEPS.length - 1 ? "Entendido" : "Siguiente →";
  requestAnimationFrame(positionCoachStep);
}
function openCoach(){
  coachIndex = 0;
  coachLastFocused = document.activeElement;
  // El recorrido siempre empieza en el selector de familias del Catálogo
  // (donde viven sus 3 pasos): si alguien lo reabre a mano desde dentro de
  // una familia ya abierta, o desde Práctica, lo llevamos ahí primero.
  closePresent();
  closeWelcome();
  document.body.classList.remove("projection");
  selectTab("catalogo");
  showFamilySelector();
  coachOverlay.hidden = false;
  if(wrapEl) wrapEl.inert = true;
  renderCoachStep();
  coachNext.focus();
}
function closeCoach(markDone){
  if(coachOverlay.hidden) return;
  coachOverlay.hidden = true;
  if(wrapEl) wrapEl.inert = false;
  if(markDone){ markOnboard("phase1Done"); }
  if(coachLastFocused && typeof coachLastFocused.focus === "function" && coachLastFocused !== document.body){
    coachLastFocused.focus();
  } else {
    aboutBtn.focus();
  }
}
coachNext.addEventListener("click", function(){
  if(coachIndex < COACH_STEPS.length - 1){ coachIndex++; renderCoachStep(); }
  else { closeCoach(true); }
});
coachPrev.addEventListener("click", function(){
  if(coachIndex > 0){ coachIndex--; renderCoachStep(); }
});
coachSkip.addEventListener("click", function(){ closeCoach(true); });
document.addEventListener("keydown", function(e){
  if(coachOverlay.hidden) return;
  if(e.key === "Escape") closeCoach(true);
});
window.addEventListener("resize", function(){
  if(!coachOverlay.hidden) positionCoachStep();
});
window.addEventListener("scroll", function(){
  if(!coachOverlay.hidden) positionCoachStep();
}, true);

// ---- Fase 2: pistas contextuales durante los primeros casos ----
// qIndex identifica la posición DENTRO de esta ronda (0 = primer caso de
// la ronda), no una falacia fija — como estas tres pistas hablan de ideas
// generales (qué es un argumento, qué es una falacia, que esto no
// califica) y no del contenido de un caso puntual, no importa cuál de los
// 36 enunciados le toque a cada una. "when" marca el momento exacto:
// "render" apenas se muestra el caso, "feedback" apenas aparece la
// primera retroalimentación (acierto, pista de primer intento o cierre).
const PRACTICE_TIPS = [
  {
    id: "tip-argumento", qIndex: 0, when: "render",
    anchor: "#statementText", side: "bottom",
    title: "Un mini-argumento",
    text: "Cada caso es un argumento corto: unas razones que intentan sostener una conclusión. Busca dónde falla el razonamiento, no si la frase \"suena\" a verdad o a mentira."
  },
  {
    id: "tip-falacia", qIndex: 0, when: "feedback",
    anchor: "#feedbackBox", side: "top",
    title: "¿Qué es una falacia?",
    text: "Es un argumento que parece válido pero no logra apoyar su conclusión con razones reales. Por eso siempre te explicamos el porqué, no solo si acertaste."
  },
  {
    id: "tip-no-nota", qIndex: 2, when: "render",
    anchor: ".score-group", side: "bottom",
    title: "Esto no califica",
    text: "No hay nota ni tabla de posiciones. Falla las veces que necesites: lo que importa es que entiendas el porqué."
  }
];
let activeTip = null;
function dismissActiveTip(){
  if(!activeTip) return;
  window.removeEventListener("resize", activeTip.reposition);
  window.removeEventListener("scroll", activeTip.reposition, true);
  activeTip.el.remove();
  activeTip = null;
}
function showTip(tip){
  const anchor = document.querySelector(tip.anchor);
  if(!anchor) return;
  dismissActiveTip();
  const callout = document.createElement("div");
  callout.className = "tip-callout";
  callout.setAttribute("role", "status");
  const title = document.createElement("div");
  title.className = "tip-title";
  title.textContent = tip.title;
  const text = document.createElement("p");
  text.className = "tip-text";
  text.textContent = tip.text;
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = "ghost-btn tip-dismiss";
  dismissBtn.textContent = "Entendido";
  callout.appendChild(title);
  callout.appendChild(text);
  callout.appendChild(dismissBtn);
  document.body.appendChild(callout);

  function reposition(){ positionFloatingBox(callout, anchor, tip.side); }
  reposition();
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  activeTip = { el: callout, reposition: reposition };

  dismissBtn.addEventListener("click", function(){
    markOnboard(tip.id);
    dismissActiveTip();
  });
}
function maybeShowTip(when, roundIndex){
  if(coachOverlay && !coachOverlay.hidden) return; // no pisar el recorrido guiado
  const tip = PRACTICE_TIPS.filter(function(t){
    return t.when === when && t.qIndex === roundIndex && !onboardDone(t.id);
  })[0];
  if(tip) showTip(tip);
}

// Se abre solo en la primera visita (nunca si ya se completó o se saltó
// antes). Un pequeño respiro deja que la fuente y el layout terminen de
// asentarse antes de medir posiciones para el primer paso.
if(onboardState && !onboardState.phase1Done){
  window.setTimeout(openCoach, 400);
}

// A partir de aquí ya existen PRACTICE_TIPS, coachOverlay y onboardState:
// renderQuestion()/showHint()/closeCase()/selectTab() pueden llamar a
// maybeShowTip() con seguridad.
onboardingReady = true;
// El primer caso ya se renderizó (en caliente, al cargar el módulo) antes
// de que esta bandera existiera, así que su propio renderQuestion() nunca
// pudo avisarle a la Fase 2. Si la persona ya está parada en Práctica al
// llegar a este punto (poco común, pero posible si recarga con el hash o
// el estado de la pestaña ya en "practica"), se lo avisamos ahora mismo.
if(viewPractica.classList.contains("active")){
  maybeShowTip("render", qIndex);
}
