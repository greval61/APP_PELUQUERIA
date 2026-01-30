---
# Manual de Usuario — Génesis (Agenda de Peluquería)

Última actualización: 24 de enero de 2026

![Portada de Génesis](manual_cover.png)

Resumen: este manual guía a los responsables de la peluquería para instalar, configurar y operar la aplicación **Génesis**. Está redactado de forma clara, con procedimientos paso a paso y enlaces directos para navegación rápida.

**Índice**

- [Introducción](#introduccion)
- [Requisitos y arranque](#requisitos-y-arranque)
- [Acceso a la aplicación](#acceso-a-la-aplicacion)
- [Vista principal (Agenda / Calendario)](#vista-principal-agenda--calendario)
- [Crear una nueva cita](#crear-una-nueva-cita)
- [Editar / Eliminar una cita](#editar--eliminar-una-cita)
- [Buscar clientes](#buscar-clientes)
- [Informe económico y exportación a PDF](#informe-economico-y-exportacion-a-pdf)
- [Top servicios (visualización y exportación)](#top-servicios-visualizacion-y-exportacion)
- [Ajustes y filtros](#ajustes-y-filtros)
- [Buenas prácticas](#buenas-practicas)
- [Resolución de problemas comunes](#resolucion-de-problemas-comunes)
- [Contacto y soporte](#contacto-y-soporte)

---
---


## Introducción

Génesis es una aplicación web local desarrollada para gestionar de forma eficiente las citas, cobros y la facturación básica de una peluquería. Este manual proporciona instrucciones claras para su instalación, puesta en marcha y operación diaria.

### Objetivos del documento

- Guiar a administradores y personal en la instalación y uso de la aplicación.
- Facilitar la resolución de incidencias comunes.
- Documentar flujos clave: creación/edición de citas, búsqueda de clientes, informes y exportaciones.

## Requisitos y arranque

### Requisitos mínimos

- Node.js v14 o superior
- Navegador moderno con capacidades JavaScript (Chrome/Edge/Firefox)

### Instrucciones de instalación y ejecución (entorno local)

1. Abre una terminal y sitúate en la carpeta raíz del proyecto.

2. Inicia el backend:

```bash
cd backend
npm install
npm start
```

El backend ejecutará un servidor HTTP en `http://localhost:5000`.

3. En otra terminal, inicia el frontend:

```bash
cd frontend
npm install
npm start
```

Si el puerto `3000` está ocupado, el frontend propondrá otro puerto (por ejemplo `3001`).

## Acceso a la aplicación

Al abrir la URL del frontend aparece la pantalla de bienvenida. Introduce la contraseña y pulsa **Entrar**. No existe un sistema de usuarios avanzado en esta versión: la sesión es local.

## Vista principal (Agenda / Calendario)

La pantalla principal muestra el calendario con vistas día/semana/mes. Elementos relevantes:

- Barra superior: filtros por empleado, acceso a informes y botón de salida.
- Métricas rápidas: `Citas hoy` y `Próxima cita`.
- Calendario interactivo: crear citas mediante selección y editar con un clic sobre la cita.

## Crear una nueva cita

1. Selecciona un tramo horario en el calendario o pulsa para crear una nueva cita.
2. Rellena el formulario con los datos del cliente y la información del servicio.
3. Marca la casilla `CONTADO` o `TARJETA` si corresponde.
4. Pulsa **GUARDAR** para confirmar.

Campos principales:

- `Cliente` (texto) — obligatorio
- `Teléfono` (texto)
- `Fecha` — selector de fecha
- `Hora inicio` / `Hora fin` — select con tramos de 30 minutos
- `Empleado` — asignación de oficial
- `Categoría` — tipo de servicio
- `Precio` — numérico

## Editar / Eliminar una cita

- Haz clic en la cita; se abrirá el modal con los datos.
- Modifica lo necesario y pulsa **GUARDAR**.
- Para eliminar, pulsa **ELIMINAR** y confirma.

## Buscar clientes

- Usa el buscador superior para localizar clientes por nombre o teléfono.
- Define un rango de fechas para acotar resultados.
- Pulsa **Buscar**; los resultados aparecen en una tabla y permiten abrir la cita directamente.
- Pulsa **Cancelar** para limpiar los filtros y volver al estado inicial.

## Informe económico y exportación a PDF

- Accede desde **INFORME ECONÓMICO** en la barra superior.
- Filtra por empleado y forma de pago.
- Configura el periodo (mes/trimestre/año) y pulsa **EXPORTAR PDF** para generar el documento.

Exportación técnica: la generación del PDF utiliza una captura del contenido renderizado y la librería `jsPDF`/`html2canvas` para conseguir un resultado visual fiel.

## Top servicios (visualización y exportación)

- Botón **Ver Top servicios** abre una ventana independiente con listado de servicios ordenados por volumen e ingresos.
- Desde esa ventana puedes exportar el listado a PDF; los controles se ocultan antes de la captura para una presentación limpia.

## Ajustes y filtros

- Filtro por empleado: Útil para ver la agenda de cada oficial por separado.
- Filtro por forma de pago en informes: selecciona `Contado`, `Tarjeta` o `No pagados`.

## Buenas prácticas

- Mantener precios con dos decimales (p. ej. `25.00`).
- Registrar correctamente la forma de pago para que los informes reflejen ingresos reales.
- Revisar permisos de navegador (popups) si se usan exportaciones a ventana independiente.

## Resolución de problemas comunes

- Calendario vacío: verifica que el backend esté en `http://localhost:5000` y respondiendo.
- Error al exportar PDF: revisar bloqueador de popups o la conectividad a CDN si la máquina es offline.

## Contacto y soporte

Para soporte o personalizaciones, contactar con el desarrollador responsable.

---

Fin del manual.
