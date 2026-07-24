# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El proyecto sigue el estándar de [SemVer](https://semver.org/spec/v2.0.0.html) y la guía de [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [1.0.1] - 2026-07-25

### Corregido
- **Renderizado de la Ficha Modal (Android):** Corregido el sangrado visual inferior de la pantalla del mapa en dispositivos Android. Se forzó el modo `presentationStyle="fullScreen"` y se habilitó la propiedad `statusBarTranslucent={true}` en el modal para dibujar el color de fondo uniforme bajo las barras translúcidas de navegación del sistema.
- **Geolocalización Reactiva:** Solventados los tiempos de espera y bloqueos prolongados en interiores al pulsar el botón `🎯`. Se adoptó un flujo híbrido:
  1. Obtención instantánea del posicionamiento en caché del sistema mediante `getLastKnownPositionAsync()`.
  2. Refresco de alta precisión mediante GPS en segundo plano con `getCurrentPositionAsync()`.

### Cambios de compilación
- Incrementado el campo `version` a `1.0.1`.
- Incrementado el entero `versionCode` a `2` en Android para posibilitar la actualización incremental de archivos APK.

---

## [1.0.0] - 2026-07-25

### Añadido (MVP Refactorizado)
- **Arquitectura de Componentes Limpia:** Refactorizado el código de `App.tsx` en componentes independientes y reutilizables dentro de la carpeta `src/components/`:
  - `Header`: Barra de búsqueda y selectores de radio/combustible rápidos.
  - `PreviewCard`: Tarjeta de previsualización flotante para gasolineras seleccionadas en el mapa.
  - `StationModal`: Modal de comparación de precios e inicio de rutas.
- **Módulo de Utilidades y Tipados:** Creados los archivos `src/utils/helpers.ts` (Haversine, estilos del mapa oscuro y niveles de precios) y `src/types/index.ts` (interfaces estructuradas del dominio).
- **Control de Memoria en Almacenamiento Local (Android):** Solventado el crash de lectura de SQLite `CursorWindow requiredPos=0, totalRows=1` en Android. Se desarrolló un algoritmo de fragmentación dinámica que trocea los 5MB de base de datos de gasolineras del Ministerio en sub-bloques pequeños de 500 registros para `AsyncStorage`.
- **Integración de Búsqueda de Direcciones:** Corregidos los fallos de parseo de JSON en el buscador de Nominatim inyectando una cabecera `User-Agent` móvil identificable para evitar bloqueos 403 HTTP de OpenStreetMap.
- **Experiencia Premium Nativa:** Implementación de gestos táctiles físicos en panel inferior deslizante (*Snapping Bottom Sheet*), respuesta háptica por hardware (`expo-haptics`) y mapa oscuro premium de Google Maps.
