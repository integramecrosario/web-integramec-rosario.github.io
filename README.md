# Catálogo Digital — Integramec Rosario

Catálogo de productos en formato de hojas tipo A4, con un editor visual para armarlo (sin backend, todo corre en el navegador) y un visor público para mostrarlo a los clientes con contacto directo por WhatsApp.

## Estructura del repositorio

```
.
├── index.html          # Visor público del catálogo (lo que ve el cliente)
├── editor.html          # Editor visual para armar/modificar el catálogo
├── css/
│   ├── styles.css       # Estilos base compartidos (layout de página A4, tipografía)
│   ├── editor.css       # Estilos específicos del editor (panel lateral, tabs, modal)
│   └── viewer.css        # Estilos específicos del visor público
├── js/
│   ├── catalog-model.js  # Modelo de datos y helpers compartidos (artículos, precios, link de WhatsApp)
│   ├── editor.js         # Lógica del editor: tabs, páginas, artículos, exportación/importación
│   └── viewer.js         # Lógica del visor: carga catalogo.json y renderiza las páginas
└── images/                # Imágenes de productos y logo referenciadas desde el catálogo
```

## Flujo de trabajo

1. **Editar** ([editor.html](editor.html)): se configura el header (WhatsApp, logo, título), se agregan/editan artículos (foto, descripción, precio, posición en la página) y los colores de fondo de cada página.
2. **Exportar**: el editor genera un `catalogo.json` con toda la configuración (header, páginas, artículos).
3. **Publicar**: el `catalogo.json` exportado se coloca en la raíz del sitio para que [index.html](index.html) lo cargue.
4. **Ver** ([index.html](index.html)): el visor público lee `catalogo.json` y renderiza las páginas; cada artículo tiene un botón que abre WhatsApp con un mensaje pre-armado con la descripción y el precio.

## Límites del modelo

- Hasta 15 páginas por catálogo.
- Hasta 40 artículos en total.

## Despliegue

El sitio se publica vía GitHub Pages desde este repositorio (`integramecrosario/web-integramec-rosario.github.io.git`).
