"""Cuestionario de Medicina — Módulo 1.

Aplicación Flask sin base de datos: las preguntas viven en data/*.json.
El servidor elige las preguntas de cada intento y baraja las opciones. La clave
de respuestas viaja en un token firmado (sin estado en el servidor), de modo que
funciona igual con varios procesos o tras reiniciar el servicio.
"""
import json
import os
import random
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"

TEMAS = [
    {"id": "enzimas", "nombre": "Enzimas: mecanismo de acción", "detalle": "Harper, Cap. 7", "icono": "🧬"},
    {"id": "oxidacion", "nombre": "Oxidación biológica", "detalle": "Harper, Cap. 12", "icono": "⚡"},
    {"id": "cadena_respiratoria", "nombre": "Cadena respiratoria y fosforilación oxidativa", "detalle": "Harper, Cap. 13", "icono": "🔋"},
    {"id": "glucolisis", "nombre": "Glucólisis y oxidación de piruvato", "detalle": "Harper, Cap. 17", "icono": "🍬"},
    {"id": "citocromos", "nombre": "Citocromos P450", "detalle": "Material docente USAC", "icono": "💊"},
]
TEMA_POR_ID = {t["id"]: t for t in TEMAS}
TAMANO_MIXTO = 20
VIGENCIA_SEG = 6 * 3600


def cargar_banco():
    banco = []
    for tema in TEMAS:
        with open(DATA / f"{tema['id']}.json", encoding="utf-8") as f:
            for i, q in enumerate(json.load(f), start=1):
                assert len(q["opciones"]) == 4 and 0 <= q["correcta"] < 4
                banco.append({**q, "id": f"{tema['id']}-{i:02d}", "tema": tema["id"]})
    ids = [q["id"] for q in banco]
    assert len(ids) == len(set(ids))
    return banco


BANCO = cargar_banco()
POR_ID = {q["id"]: q for q in BANCO}

app = Flask(__name__)
FIRMA = URLSafeTimedSerializer(os.environ.get("SECRET_KEY", "cambia-esta-clave-en-produccion"), salt="intento")


@app.route("/")
def inicio():
    return render_template("index.html")


@app.route("/salud")
def salud():
    return jsonify(ok=True, preguntas=len(BANCO))


@app.route("/api/temas")
def api_temas():
    conteo = {t["id"]: 0 for t in TEMAS}
    for q in BANCO:
        conteo[q["tema"]] += 1
    return jsonify(
        temas=[{**t, "total": conteo[t["id"]]} for t in TEMAS],
        total=len(BANCO),
        tamano_mixto=TAMANO_MIXTO,
    )


@app.route("/api/quiz")
def api_quiz():
    tema = request.args.get("tema", "mixto")
    if tema == "mixto":
        elegidas = random.sample(BANCO, TAMANO_MIXTO)
        titulo = f"Examen mixto ({TAMANO_MIXTO} preguntas)"
    elif tema in TEMA_POR_ID:
        elegidas = [q for q in BANCO if q["tema"] == tema]
        random.shuffle(elegidas)
        titulo = TEMA_POR_ID[tema]["nombre"]
    else:
        return jsonify(error="Tema no válido"), 400

    claves, salida = {}, []
    for q in elegidas:
        orden = list(range(4))
        random.shuffle(orden)
        claves[q["id"]] = orden.index(q["correcta"])
        salida.append({
            "id": q["id"],
            "tema": TEMA_POR_ID[q["tema"]]["nombre"],
            "pregunta": q["pregunta"],
            "opciones": [q["opciones"][i] for i in orden],
        })
    token = FIRMA.dumps(claves)
    return jsonify(token=token, titulo=titulo, preguntas=salida)


@app.route("/api/resultado", methods=["POST"])
def api_resultado():
    datos = request.get_json(silent=True) or {}
    respuestas = datos.get("respuestas")
    try:
        claves = FIRMA.loads(datos.get("token", ""), max_age=VIGENCIA_SEG)
    except (BadSignature, SignatureExpired):
        claves = None
    if not isinstance(claves, dict) or not isinstance(respuestas, dict):
        return jsonify(error="El intento expiró o no es válido. Comienza uno nuevo."), 400

    detalle, aciertos = [], 0
    for qid, correcta_idx in claves.items():
        if qid not in POR_ID:
            continue
        elegida = respuestas.get(qid)
        if not isinstance(elegida, int) or not 0 <= elegida < 4:
            elegida = None
        acierto = elegida == correcta_idx
        aciertos += acierto
        q = POR_ID[qid]
        detalle.append({
            "id": qid,
            "elegida": elegida,
            "correcta": correcta_idx,
            "acierto": acierto,
            "explicacion": q["explicacion"],
            "referencia": q["referencia"],
        })
    return jsonify(aciertos=aciertos, total=len(detalle), detalle=detalle)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
