# Cuestionario de Medicina — Módulo 1

Aplicación web de estudio (Flask + HTML/CSS/JavaScript) con 100 preguntas de opción múltiple
basadas en cuatro documentos: Harper caps. 7 y 12, Harper cap. 13, Harper cap. 17 y el documento docente “Citocromos”.

## Contenido del banco (20 preguntas por tema)

| Tema | Fuente | Páginas citadas |
|---|---|---|
| Enzimas: mecanismo de acción | HarperCap7y12 Enzimas.pdf, Cap. 7 | pp. 61-71 |
| Oxidación biológica | HarperCap7y12 Enzimas.pdf, Cap. 12 (el PDF solo incluye las pp. 123-125) | pp. 123-125 |
| Cadena respiratoria y fosforilación oxidativa | HarperCap 13.pdf | pp. 127-135 |
| Glucólisis y oxidación de piruvato | HARPERCap 17 GUCOLISIS.pdf | pp. 168-174 |
| Citocromos P450 | Citocromos 2026.pdf | pp. 1-5 del PDF (no tiene numeración impresa) |

Las páginas de Harper son las impresas en el libro. Cada explicación indica documento y página.

## Estructura

```
cuestionario/
├── app.py                  # servidor Flask (rutas y lógica del examen)
├── requirements.txt        # dependencias: Flask y gunicorn
├── Procfile                # comando de arranque (Render, Railway, Heroku…)
├── render.yaml             # configuración opcional para Render
├── runtime.txt             # versión de Python
├── data/                   # banco de preguntas (un JSON por tema)
├── templates/index.html    # página principal
└── static/                 # style.css y app.js (interfaz)
```

## Probarlo en tu computadora (opcional)

```
pip install -r requirements.txt
python app.py
```
Abre http://localhost:5000

## Cómo agregar o corregir preguntas

Edita el archivo del tema en `data/`. Cada pregunta tiene: `pregunta`, `opciones` (exactamente 4),
`correcta` (0 a 3, posición de la opción correcta), `explicacion` y `referencia`.
La aplicación baraja las opciones en cada intento.

## Publicación

Mira la guía paso a paso que acompaña a este proyecto (Render + GitHub).
