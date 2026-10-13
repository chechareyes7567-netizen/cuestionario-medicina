(function () {
  "use strict";
  var app = document.getElementById("app");
  var estado = { token: null, titulo: "", preguntas: [], actual: 0, respuestas: {} };
  var LETRAS = ["A", "B", "C", "D"];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pedir(url, opciones) {
    return fetch(url, opciones).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || "Error del servidor");
        return d;
      });
    });
  }

  function mostrarError(msg) {
    app.innerHTML =
      '<div class="card"><div class="err">' + esc(msg) + "</div>" +
      '<p></p><button class="btn" id="reint">Volver al inicio</button></div>';
    document.getElementById("reint").onclick = inicio;
  }

  function inicio() {
    app.innerHTML = '<div class="card"><p class="muted">Cargando…</p></div>';
    pedir("/api/temas").then(function (d) {
      var h = '<div class="card"><h2>¿Qué quieres practicar?</h2>' +
        '<p class="muted small">Banco de ' + d.total + " preguntas. Cada intento baraja el orden de preguntas y opciones.</p>" +
        '<button class="btn" id="mixto">🎲 Examen mixto · ' + d.tamano_mixto + " preguntas al azar</button></div>" +
        '<div class="card"><h2>O elige un tema</h2><div class="temas">';
      d.temas.forEach(function (t) {
        h += '<button class="tema" data-t="' + esc(t.id) + '"><span class="ico">' + t.icono +
          '</span><span><span class="t">' + esc(t.nombre) + '</span><br><span class="d">' +
          esc(t.detalle) + " · " + t.total + " preguntas</span></span></button>";
      });
      h += "</div></div>";
      app.innerHTML = h;
      document.getElementById("mixto").onclick = function () { comenzar("mixto"); };
      Array.prototype.forEach.call(app.querySelectorAll(".tema"), function (b) {
        b.onclick = function () { comenzar(b.getAttribute("data-t")); };
      });
    }).catch(function (e) { mostrarError(e.message); });
  }

  function comenzar(tema) {
    app.innerHTML = '<div class="card"><p class="muted">Preparando preguntas…</p></div>';
    pedir("/api/quiz?tema=" + encodeURIComponent(tema)).then(function (d) {
      estado = { token: d.token, titulo: d.titulo, preguntas: d.preguntas, actual: 0, respuestas: {}, tema: tema };
      pregunta();
    }).catch(function (e) { mostrarError(e.message); });
  }

  function pregunta() {
    var total = estado.preguntas.length;
    var q = estado.preguntas[estado.actual];
    var elegida = estado.respuestas[q.id];
    var contestadas = Object.keys(estado.respuestas).length;
    var h = '<div class="prog-wrap"><div class="prog-top"><span>Pregunta ' + (estado.actual + 1) +
      " de " + total + "</span><span>" + contestadas + " contestadas</span></div>" +
      '<div class="bar"><i style="width:' + ((estado.actual + 1) / total * 100) + '%"></i></div></div>' +
      '<div class="card"><span class="chip">' + esc(q.tema) + '</span><p class="preg">' + esc(q.pregunta) +
      '</p><div class="opts">';
    q.opciones.forEach(function (o, i) {
      h += '<button class="opt' + (elegida === i ? " sel" : "") + '" data-i="' + i + '"><span class="L">' +
        LETRAS[i] + "</span><span>" + esc(o) + "</span></button>";
    });
    h += "</div></div><div class=\"row\">";
    h += '<button class="btn sec" id="ant"' + (estado.actual === 0 ? " disabled" : "") + ">← Anterior</button>";
    if (estado.actual < total - 1) {
      h += '<button class="btn" id="sig">Siguiente →</button>';
    } else {
      h += '<button class="btn" id="fin">Terminar</button>';
    }
    h += "</div>";
    app.innerHTML = h;
    window.scrollTo(0, 0);

    Array.prototype.forEach.call(app.querySelectorAll(".opt"), function (b) {
      b.onclick = function () {
        estado.respuestas[q.id] = parseInt(b.getAttribute("data-i"), 10);
        pregunta();
      };
    });
    document.getElementById("ant").onclick = function () { estado.actual--; pregunta(); };
    var sig = document.getElementById("sig");
    if (sig) sig.onclick = function () { estado.actual++; pregunta(); };
    var fin = document.getElementById("fin");
    if (fin) fin.onclick = terminar;
  }

  function terminar() {
    var total = estado.preguntas.length;
    var sin = total - Object.keys(estado.respuestas).length;
    if (sin > 0 && !window.confirm("Te faltan " + sin + " pregunta(s) sin contestar. ¿Terminar de todos modos?")) {
      return;
    }
    app.innerHTML = '<div class="card"><p class="muted">Calculando resultado…</p></div>';
    pedir("/api/resultado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: estado.token, respuestas: estado.respuestas })
    }).then(resultado).catch(function (e) { mostrarError(e.message); });
  }

  function resultado(r) {
    var pct = Math.round(r.aciertos / r.total * 100);
    var msg = pct >= 80 ? "¡Excelente!" : pct >= 60 ? "¡Buen trabajo!" : "Sigue practicando, ¡tú puedes!";
    var h = '<div class="card score"><div class="muted">' + esc(estado.titulo) + '</div><div class="big">' +
      r.aciertos + " / " + r.total + '</div><div class="pct">' + pct + "% · " + msg + "</div></div>" +
      '<button class="btn" id="otro">🔁 Comenzar otro intento</button><p></p>' +
      '<h2>Revisión de respuestas</h2>';
    var porId = {};
    estado.preguntas.forEach(function (q) { porId[q.id] = q; });
    r.detalle.forEach(function (d, n) {
      var q = porId[d.id];
      h += '<div class="card rev ' + (d.acierto ? "ok" : "bad") + '"><div class="n">Pregunta ' + (n + 1) +
        " · " + esc(q.tema) + " · " + (d.acierto ? "Correcta ✓" : "Incorrecta ✗") + '</div><p class="p">' +
        esc(q.pregunta) + "</p>";
      if (d.elegida === null) {
        h += '<div class="ans none">No contestaste esta pregunta.</div>';
      } else if (!d.acierto) {
        h += '<div class="ans wrong">Tu respuesta: ' + LETRAS[d.elegida] + ". " + esc(q.opciones[d.elegida]) + "</div>";
      }
      h += '<div class="ans good">Respuesta correcta: ' + LETRAS[d.correcta] + ". " + esc(q.opciones[d.correcta]) + "</div>" +
        '<div class="exp">' + esc(d.explicacion) + '</div><div class="ref">📖 ' + esc(d.referencia) + "</div></div>";
    });
    h += '<button class="btn" id="otro2">🔁 Comenzar otro intento</button>';
    app.innerHTML = h;
    window.scrollTo(0, 0);
    document.getElementById("otro").onclick = inicio;
    document.getElementById("otro2").onclick = inicio;
  }

  inicio();
})();
