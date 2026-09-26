/* ============================================================
   PANEL DOCENTE — PROYECTO LEARNING
   Módulo común a todos los juegos. Agrega un botón «Panel docente»
   y una ventana protegida con contraseña que muestra el material
   del juego: soluciones, guía de clase, preguntas, rúbrica y una
   ficha imprimible para estudiantes.

   El contenido NO está en este archivo ni en texto legible: vive
   cifrado (AES-GCM, clave derivada de la contraseña con PBKDF2) en
   panel-docente-datos.js. Sin la contraseña, quien abra el código
   fuente solo ve texto ilegible.

   Uso: solo en la pantalla de inicio del juego, antes de </body>:
     <script src="panel-docente-datos.js"></script>
     <script src="panel-docente.js"></script>

   Si el juego tiene todas sus pantallas en una sola página, se indica
   cuál es la de inicio y el botón solo se ve mientras esté visible:
     <script src="panel-docente.js" data-solo-en="#pantalla-inicio"></script>
   Sirve cualquier selector CSS, también uno que solo exista en la
   pantalla de inicio (p. ej. "#btn-start, #btn-continue") en juegos
   que dibujan cada pantalla de nuevo. Agregando #docente al final de
   la dirección del juego, el botón se ve en cualquier pantalla.

   Para editar el contenido, ver herramientas/panel-docente en el
   repositorio PROYECTO-LEARNING.
   ============================================================ */
(function(){
  "use strict";

  var DATA = window.PANEL_DOCENTE;
  var SOLO_EN = document.currentScript && document.currentScript.getAttribute("data-solo-en");
  if(!DATA || !window.crypto || !window.crypto.subtle) return;

  // La contraseña se recuerda solo mientras la pestaña siga abierta,
  // para no pedirla cada vez que se vuelve a abrir el panel.
  var SESSION_KEY = "panel-docente-clave";

  // A quién escribir para pedir la contraseña (se muestra a quien abre
  // el panel sin tenerla).
  var CONTACTO = "fabianbaut@gmail.com";

  function b64ToBytes(b64){
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function decrypt(password){
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function(base){
        return crypto.subtle.deriveKey(
          { name:"PBKDF2", salt:b64ToBytes(DATA.salt), iterations:DATA.iter, hash:"SHA-256" },
          base, { name:"AES-GCM", length:256 }, false, ["decrypt"]);
      })
      .then(function(key){
        return crypto.subtle.decrypt({ name:"AES-GCM", iv:b64ToBytes(DATA.iv) }, key, b64ToBytes(DATA.data));
      })
      .then(function(buf){ return JSON.parse(new TextDecoder().decode(buf)); });
  }

  var CSS = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".pd-open{position:fixed;left:12px;bottom:12px;z-index:2147483000;font:600 12px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;letter-spacing:.04em;color:#e8e8ee;background:rgba(20,20,28,.82);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:8px 13px;cursor:pointer;backdrop-filter:blur(4px);opacity:.75;transition:opacity .2s}",
    ".pd-open:hover,.pd-open:focus-visible{opacity:1}",
    ".pd-open[hidden]{display:none}",
    ".pd-open:focus-visible,.pd-btn:focus-visible,.pd-tab:focus-visible,.pd-x:focus-visible,input:focus-visible{outline:2px solid #ffc93f;outline-offset:2px}",
    ".pd-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(5,5,10,.72);display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto}",
    ".pd-ov[hidden]{display:none}",
    ".pd-box{position:relative;width:100%;max-width:860px;background:#fbfaf7;color:#1d1d24;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.45);font:15px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;margin:auto 0}",
    ".pd-head{padding:22px 56px 14px 24px;border-bottom:1px solid #e4e1d8}",
    ".pd-kicker{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8a6d1f}",
    ".pd-title{margin:4px 0 0;font-size:22px;line-height:1.25}",
    ".pd-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:1px solid #d6d2c6;background:#fff;color:#1d1d24;font-size:16px;cursor:pointer}",
    ".pd-login{padding:22px 24px 26px}",
    ".pd-login form{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}",
    ".pd-login input{flex:1 1 180px;min-width:0;font:inherit;padding:10px 12px;border:1px solid #c9c4b6;border-radius:8px;background:#fff;color:#1d1d24}",
    ".pd-btn{font:600 14px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:11px 16px;border-radius:8px;border:1px solid #1d1d24;background:#1d1d24;color:#fff;cursor:pointer}",
    ".pd-btn.alt{background:#fff;color:#1d1d24}",
    ".pd-err{color:#b3261e;min-height:1.6em;margin:8px 0 0;font-size:14px}",
    ".pd-contact{margin:14px 0 0;padding-top:14px;border-top:1px solid #e4e1d8;font-size:14px;color:#5b5a63}",
    ".pd-contact a{color:#1d1d24;font-weight:600;overflow-wrap:anywhere}",
    ".pd-contact a:focus-visible{outline:2px solid #ffc93f;outline-offset:2px}",
    ".pd-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:12px 24px 0;border-bottom:1px solid #e4e1d8}",
    ".pd-tab{font:600 13px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:10px 12px;border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;background:none;color:#5b5a63;cursor:pointer;margin-bottom:-1px}",
    ".pd-tab[aria-selected=true]{background:#fff;color:#1d1d24;border-color:#e4e1d8}",
    ".pd-body{padding:20px 24px 26px;background:#fff;border-radius:0 0 14px 14px}",
    ".pd-body h3{font-size:17px;margin:22px 0 6px;line-height:1.3}",
    ".pd-body h3:first-child{margin-top:0}",
    ".pd-body h4{font-size:15px;margin:14px 0 4px}",
    ".pd-body p{margin:0 0 10px}",
    ".pd-body ul,.pd-body ol{margin:0 0 12px;padding-left:22px}",
    ".pd-body li{margin:3px 0}",
    ".pd-body table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:14px}",
    ".pd-body th,.pd-body td{border:1px solid #e0ddd4;padding:7px 9px;text-align:left;vertical-align:top}",
    ".pd-body th{background:#f5f3ee}",
    ".pd-scroll{overflow-x:auto}",
    ".pd-body code,.pd-body .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#f3f1ea;padding:1px 5px;border-radius:4px}",
    ".pd-note{border-left:4px solid #ffc93f;background:#fff8e1;padding:10px 12px;border-radius:0 8px 8px 0;margin:10px 0 14px}",
    ".pd-ok{color:#1d7a3a;font-weight:600}",
    ".pd-no{color:#b3261e;font-weight:600}",
    ".pd-actions{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px}",
    ".pd-foot{display:flex;justify-content:flex-end;padding:0 24px 18px;background:#fff;border-radius:0 0 14px 14px}",
    ".pd-link{font:inherit;font-size:13px;background:none;border:none;color:#5b5a63;text-decoration:underline;cursor:pointer}",
    ".pd-preview{border:1px dashed #c9c4b6;border-radius:10px;padding:18px;font-family:Georgia,'Times New Roman',serif}",
    ".pd-preview h1{font-size:22px;margin:0 0 4px}.pd-preview h2{font-size:17px;margin:18px 0 6px}",
    ".pd-preview .caja{border:1px solid #555;min-height:70px;margin:4px 0 12px}",
    ".pd-preview .linea{border-bottom:1px solid #555;height:26px}",
    ".pd-preview .datos{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0 12px}.pd-preview .datos div{flex:1 1 120px;border-bottom:1px solid #555;padding-top:18px;font-size:13px}",
    ".pd-preview th,.pd-preview td{border-color:#555}",
    "@media (max-width:560px){.pd-ov{padding:0}.pd-box{border-radius:0;min-height:100%}.pd-head{padding:18px 54px 12px 16px}.pd-login,.pd-body{padding-left:16px;padding-right:16px}.pd-tabs{padding:10px 12px 0}.pd-body{border-radius:0}}"
  ].join("\n");

  // Estilos de la ficha al imprimir: se imprime en un iframe aparte,
  // así nada del juego (fondos oscuros, animaciones) aparece en el papel.
  var PRINT_CSS = [
    "@page{size:A4;margin:16mm 15mm}",
    "*{box-sizing:border-box}",
    "body{font:12pt/1.5 Georgia,'Times New Roman',serif;color:#000;margin:0}",
    "h1{font-size:18pt;margin:0 0 4pt}h2{font-size:13pt;margin:14pt 0 4pt}h3{font-size:12pt;margin:10pt 0 3pt}",
    "p{margin:0 0 6pt}ul,ol{margin:0 0 8pt;padding-left:18pt}",
    "table{width:100%;border-collapse:collapse;margin:4pt 0 10pt}th,td{border:1px solid #000;padding:5pt 6pt;text-align:left;vertical-align:top}",
    ".linea{border-bottom:1px solid #000;height:22pt}",
    ".caja{border:1px solid #000;min-height:60pt;margin:4pt 0 10pt}",
    ".datos{display:flex;gap:12pt;margin:6pt 0 10pt}.datos div{flex:1;border-bottom:1px solid #000;padding-top:14pt;font-size:10pt}",
    "h2,h3{break-after:avoid}table,.caja{break-inside:avoid}"
  ].join("\n");

  var host = document.createElement("div");
  host.id = "panel-docente";
  var root = host.attachShadow({ mode:"open" });
  root.innerHTML =
    "<style>" + CSS + "</style>" +
    "<button class='pd-open' type='button' aria-haspopup='dialog'>Panel docente</button>" +
    "<div class='pd-ov' hidden>" +
      "<div class='pd-box' role='dialog' aria-modal='true' aria-labelledby='pd-title'>" +
        "<button class='pd-x' type='button' aria-label='Cerrar panel docente'>✕</button>" +
        "<div class='pd-head'><div class='pd-kicker'>Panel docente</div><h2 class='pd-title' id='pd-title'>Acceso restringido</h2></div>" +
        "<div class='pd-login'>" +
          "<p style='margin:0'>Este panel es para el docente. Escribe la contraseña para ver el material.</p>" +
          "<form><input type='password' inputmode='numeric' autocomplete='off' aria-label='Contraseña del panel docente' placeholder='Contraseña'>" +
          "<button class='pd-btn' type='submit'>Entrar</button></form>" +
          "<p class='pd-err' role='alert'></p>" +
          "<p class='pd-contact'>¿Eres profesor o profesora y quieres acceder al Panel docente? Escribe a <a class='pd-mail'></a>.</p>" +
        "</div>" +
        "<div class='pd-content' hidden>" +
          "<div class='pd-tabs' role='tablist'></div>" +
          "<div class='pd-body' role='tabpanel' tabindex='-1'></div>" +
          "<div class='pd-foot'><button class='pd-link pd-logout' type='button'>Cerrar sesión del panel</button></div>" +
        "</div>" +
      "</div>" +
    "</div>";

  var openBtn = root.querySelector(".pd-open");
  var overlay = root.querySelector(".pd-ov");
  var closeBtn = root.querySelector(".pd-x");
  var titleEl = root.querySelector(".pd-title");
  var loginEl = root.querySelector(".pd-login");
  var form = root.querySelector("form");
  var input = root.querySelector("input");
  var errEl = root.querySelector(".pd-err");
  var contentEl = root.querySelector(".pd-content");
  var tabsEl = root.querySelector(".pd-tabs");
  var bodyEl = root.querySelector(".pd-body");
  var logoutBtn = root.querySelector(".pd-logout");

  var mail = root.querySelector(".pd-mail");
  mail.textContent = CONTACTO;
  mail.href = "mailto:" + CONTACTO + "?subject=" +
    encodeURIComponent("Acceso al Panel docente: " + (document.title || location.href));

  var material = null;
  var lastFocus = null;

  // Los juegos escuchan el teclado en todo el documento (teclados
  // numéricos, Enter para confirmar...). Lo que se escribe dentro del
  // panel no debe llegar al juego.
  ["keydown","keyup","keypress"].forEach(function(t){
    host.addEventListener(t, function(e){
      if(t === "keydown") handleKeys(e);
      e.stopPropagation();
    });
  });

  function handleKeys(e){
    if(overlay.hidden) return;
    if(e.key === "Escape"){ e.preventDefault(); closePanel(); return; }
    if(e.key === "Tab"){
      var f = Array.prototype.filter.call(
        overlay.querySelectorAll("button, input, a[href], [tabindex='0']"),
        function(el){ return !el.closest("[hidden]") && !el.disabled; });
      if(!f.length) return;
      var i = f.indexOf(root.activeElement);
      if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length-1].focus(); }
      else if(!e.shiftKey && i === f.length-1){ e.preventDefault(); f[0].focus(); }
    }
  }

  function openPanel(){
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.style.overflow = "hidden";
    if(material){ showContent(); return; }
    var saved = null;
    try { saved = sessionStorage.getItem(SESSION_KEY); } catch(e) {}
    if(saved){
      decrypt(saved).then(function(m){ material = m; showContent(); }, showLogin);
    } else {
      showLogin();
    }
  }
  function closePanel(){
    overlay.hidden = true;
    document.documentElement.style.overflow = "";
    if(lastFocus && lastFocus.focus) lastFocus.focus(); else openBtn.focus();
  }
  function showLogin(){
    titleEl.textContent = "Acceso restringido";
    loginEl.hidden = false;
    contentEl.hidden = true;
    input.value = "";
    errEl.textContent = "";
    input.focus();
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    var pass = input.value.trim();
    if(!pass){ errEl.textContent = "Escribe la contraseña."; return; }
    errEl.textContent = "Comprobando…";
    decrypt(pass).then(function(m){
      material = m;
      try { sessionStorage.setItem(SESSION_KEY, pass); } catch(err) {}
      showContent();
    }, function(){
      errEl.textContent = "Contraseña incorrecta.";
      input.select();
    });
  });

  logoutBtn.addEventListener("click", function(){
    material = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
    showLogin();
  });

  function showContent(){
    titleEl.textContent = material.titulo;
    loginEl.hidden = true;
    contentEl.hidden = false;
    tabsEl.innerHTML = "";
    material.secciones.forEach(function(s, i){
      var t = document.createElement("button");
      t.type = "button";
      t.className = "pd-tab";
      t.setAttribute("role", "tab");
      t.textContent = s.titulo;
      t.addEventListener("click", function(){ selectTab(i, true); });
      t.addEventListener("keydown", function(e){
        var n = material.secciones.length;
        if(e.key === "ArrowRight"){ e.preventDefault(); selectTab((i+1)%n, false, true); }
        if(e.key === "ArrowLeft"){ e.preventDefault(); selectTab((i-1+n)%n, false, true); }
      });
      tabsEl.appendChild(t);
    });
    selectTab(0, false, true);
  }

  function selectTab(i, focusBody, focusTab){
    var s = material.secciones[i];
    Array.prototype.forEach.call(tabsEl.children, function(t, j){
      t.setAttribute("aria-selected", j === i ? "true" : "false");
      t.tabIndex = j === i ? 0 : -1;
    });
    if(s.ficha){
      bodyEl.innerHTML =
        "<div class='pd-actions'><button class='pd-btn pd-print' type='button'>🖨 Imprimir ficha</button></div>" +
        "<p style='font-size:13px;color:#5b5a63'>Vista previa de la ficha. Al imprimir sale en hoja blanca, sin el fondo del juego. También puedes guardarla como PDF desde la ventana de impresión.</p>" +
        "<div class='pd-preview'>" + s.html + "</div>";
      bodyEl.querySelector(".pd-print").addEventListener("click", function(){ printFicha(s.html); });
    } else {
      bodyEl.innerHTML = s.html;
    }
    Array.prototype.forEach.call(bodyEl.querySelectorAll("table"), function(tb){
      var w = document.createElement("div");
      w.className = "pd-scroll";
      tb.parentNode.insertBefore(w, tb);
      w.appendChild(tb);
    });
    if(focusBody) bodyEl.focus();
    if(focusTab) tabsEl.children[i].focus();
  }

  function printFicha(html){
    var frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    var doc = frame.contentDocument;
    doc.open();
    doc.write("<!doctype html><html lang='es'><head><meta charset='utf-8'><title>" +
      (material.titulo || "Ficha") + "</title><style>" + PRINT_CSS + "</style></head><body>" + html + "</body></html>");
    doc.close();
    setTimeout(function(){
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(function(){ frame.remove(); }, 1000);
    }, 150);
  }

  openBtn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  overlay.addEventListener("click", function(e){ if(e.target === overlay) closePanel(); });

  // Al imprimir el propio juego (p. ej. el certificado), el botón no sale.
  var printStyle = document.createElement("style");
  printStyle.textContent = "@media print{#panel-docente{display:none!important}}";
  document.head.appendChild(printStyle);

  // Con data-solo-en, el botón se oculta cuando la pantalla de inicio
  // deja de verse (el panel abierto no se cierra).
  // Cuenta como oculta si no ocupa espacio, o si ella o un contenedor
  // tiene visibility:hidden u opacity 0 (pantallas que se desvanecen).
  function isShown(el){
    if(!el || !el.getClientRects().length) return false;
    for(var n = el; n && n.nodeType === 1; n = n.parentElement){
      var cs = getComputedStyle(n);
      if(cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
    }
    return true;
  }
  // Con #docente al final de la dirección el botón se ve en cualquier
  // pantalla: útil en juegos que retoman la partida guardada y no
  // vuelven a mostrar la pantalla de inicio.
  function forced(){ return /^#docente$/i.test(location.hash); }
  function syncVisibility(){
    openBtn.hidden = !forced() && !isShown(document.querySelector(SOLO_EN));
  }

  function mount(){
    document.body.appendChild(host);
    if(SOLO_EN){
      syncVisibility();
      new MutationObserver(syncVisibility).observe(document.body,
        { attributes:true, attributeFilter:["class","style","hidden"], childList:true, subtree:true });
      // Las animaciones de entrada y salida cambian la opacidad sin tocar
      // atributos: se vuelve a comprobar cuando terminan.
      document.addEventListener("animationend", syncVisibility, true);
      document.addEventListener("transitionend", syncVisibility, true);
      window.addEventListener("hashchange", syncVisibility);
    }
  }
  if(document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
