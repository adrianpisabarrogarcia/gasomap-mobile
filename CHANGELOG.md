# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El proyecto sigue el estándar de [SemVer](https://semver.org/spec/v2.0.0.html) y la guía de [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [1.1.0] - 2026-08-28

### Añadido
- **Persistencia de Preferencias de Usuario:** Creado el hook personalizado [`src/hooks/useAppSettings.ts`](file:///Users/apisabarro/dev/gasomap-mobile/src/hooks/useAppSettings.ts) para persistir las configuraciones del usuario en `AsyncStorage`. Se guardan y restauran de forma transparente entre sesiones: el combustible seleccionado, el radio de búsqueda (km), el criterio de ordenación (precio/distancia) y el modo claro/oscuro del mapa, previniendo parpadeos iniciales de carga.
- **Ajuste Dinámico del Radio de Búsqueda según Zoom:** Implementado un puente de comunicación bidireccional en el componente [`src/components/Map.tsx`](file:///Users/apisabarro/dev/gasomap-mobile/src/components/Map.tsx) para capturar el evento `zoomend` de Leaflet y ajustar el radio de búsqueda reactivamente (de 2 km a 20 km) a medida que el usuario hace zoom in o zoom out en el mapa.
- **Sincronización con el Tema del Sistema:** Integrado `useColorScheme` en el hook de ajustes para heredar automáticamente el tema del sistema operativo (claro u oscuro) en el primer arranque de la app si el usuario no ha guardado una preferencia manual.
- **Componente de Tarjeta StationCard:** Creado el componente [`src/components/StationCard.tsx`](file:///Users/apisabarro/dev/gasomap-mobile/src/components/StationCard.tsx) y encapsulados los estilos de la tarjeta de gasolinera en él, eliminando más de 120 líneas de diseño inline y CSS monolítico de App.tsx.
- **Hook useFilteredStations:** Creado el hook [`src/hooks/useFilteredStations.ts`](file:///Users/apisabarro/dev/gasomap-mobile/src/hooks/useFilteredStations.ts) para centralizar y optimizar la lógica de filtrado por radio, cálculo Haversine de distancias, normalización de niveles de precio y criterios de ordenación usando `useMemo`.

### Corregido
- **Cierre inesperado del mapa (Crash del WebView):** Corregido el cuelgue por desbordamiento de memoria del WebView al hacer zoom out nacional (donde se intentaban renderizar más de 12.000 marcadores HTML en Leaflet). Se ha implementado un límite máximo de **250 marcadores** en [`src/hooks/useFilteredStations.ts`](file:///Users/apisabarro/dev/gasomap-mobile/src/hooks/useFilteredStations.ts), priorizando siempre las gasolineras más baratas de la zona visible para el usuario. Esto mantiene el rendimiento fluido a cualquier nivel de zoom.
- **API Key obligatoria en CARTO Basemaps:** Integrada la API key requerida por CARTO en el componente de mapa [`src/components/Map.tsx`](file:///Users/apisabarro/dev/gasomap-mobile/src/components/Map.tsx) mediante variables de entorno de Expo (`EXPO_PUBLIC_CARTO_API_KEY`) para eliminar el mensaje de "api key required" y restaurar la correcta visualización de las teselas (tiles) en modos claro y oscuro.
- **Desplazamiento fluido de Botones Flotantes y PreviewCard:** Resuelto el conflicto visual donde los botones flotantes se solapaban al arrastrar el panel inferior deslizante. Ahora, tanto los botones (Tema, GPS, Refrescar) como la [`PreviewCard`](file:///Users/apisabarro/dev/gasomap-mobile/src/components/PreviewCard.tsx) están envueltos en componentes animados (`Animated.View`) enlazados a la altura del panel (`animatedHeight`) mediante sumas vectoriales reactivas (`Animated.add`), logrando que floten y se desplacen de forma totalmente sincronizada en tiempo real. Se ha limitado la altura máxima del bottom sheet a `SCREEN_HEIGHT - 280` para evitar que tape el buscador, eliminando la necesidad de desvanecer los botones, los cuales mantienen su opacidad al 100% de forma permanente.

### Cambiado
- **Recarga desde la API al arrancar la app:** Modificada la inicialización en [`App.tsx`](file:///Users/apisabarro/dev/gasomap-mobile/App.tsx) para limpiar la caché persistida de gasolineras en `AsyncStorage` en cada inicio frío. Esto fuerza a la app a consultar y descargar siempre los precios frescos directamente de la API del Ministerio en cada sesión, a la vez que conserva la caché en memoria durante la navegación activa para no penalizar el rendimiento.

### Cambios de compilación
- Incrementado el campo `version` a `1.1.0` en `package.json` y `app.json`.
- Incrementado el entero `versionCode` a `5` en Android (`app.json`).
- Modificado `userInterfaceStyle` a `automatic` en `app.json` para permitir la detección y sincronización nativa del tema del sistema operativo.

---

## [1.0.3] - 2026-07-25

### Añadido
- **Botón flotante de actualización manual (🔄):** Incorporado un botón flotante con respuesta háptica en el mapa que permite forzar una petición HTTP limpia (omitiendo la caché de disco y red gracias a la cabecera `cache: 'no-store'` y parámetros dinámicos) y refrescar los precios en caliente.
- **Geolocalización dinámica por provincia:** Implementada una consulta a la API de geocodificación inversa de Nominatim para identificar dinámicamente en qué provincia se encuentra el usuario (con normalización bilingüe como "Araba / Álava"). Esto reduce drásticamente el peso del JSON descargado de 12 MB (toda España) a unos pocos kilobytes (solo la provincia activa) en función de su geolocalización o búsquedas.

### Cambios de compilación
- Incrementado el campo `version` a `1.0.3` en `package.json` y `app.json`.
- Incrementado el entero `versionCode` a `4` en Android (`app.json`).

---

## [1.0.2] - 2026-07-25

### Añadido
- **Selector de modo de mapa (Oscuro/Claro):** Incorporado un botón flotante (`☀️` / `🌙`) que permite conmutar en caliente entre los estilos oscuros y claros del mapa de OpenStreetMap en tiempo real de forma suave.
- **Motor de Mapas OpenStreetMap:** Reemplazado el motor nativo de Google Maps (`react-native-maps`) por un contenedor `WebView` impulsado por Leaflet.js para eliminar la dependencia de claves de API de Google Maps y evitar crasheos de arranque en la APK sin asociar tarjetas bancarias en Google Cloud.

### Corregido
- **Carga de recursos del WebView (Android):** Se inyectó una propiedad `baseUrl` para saltar las restricciones CORS de Android que bloqueaban la descarga de las librerías Leaflet externas, permitiendo que el mapa cargue correctamente en cualquier dispositivo.
- **Doble escucha de eventos en el Bridge:** Se añadió compatibilidad para interceptar eventos de mensajería nativos en `document` y `window` simultáneamente, garantizando que el marcado de gasolineras en el mapa siempre se sincronice al refrescar.

### Cambios de compilación
- Incrementado el campo `version` a `1.0.2`.
- Incrementado el entero `versionCode` a `3` en Android.

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
