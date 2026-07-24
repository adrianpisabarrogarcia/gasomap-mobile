# GasoMap Mobile 📱⛽

**GasoMap Mobile** es una aplicación nativa para dispositivos móviles (optimizada para Android/iOS) construida con **React Native** y **Expo (TypeScript)**. 

Reutiliza la lógica de negocio y consumo de la API oficial del Ministerio del proyecto web, pero rediseña por completo la experiencia de usuario (UI/UX) para que se sienta como una aplicación nativa premium.

---

## 🌟 Características de Diseño UI/UX Mobile Premium

- 🗺️ **Mapas Nativos de Google Maps:** En Android (como tu Google Pixel), el mapa se ejecuta utilizando el SDK nativo de Google Maps renderizado por hardware (a 120Hz) con un estilo visual oscuro y minimalista personalizado.
- 🛏️ **Bottom Sheet Deslizable (Física de Gestos):** Implementación a medida de un panel inferior persistente utilizando las APIs nativas de React Native `PanResponder` y `Animated`. Permite deslizar hacia arriba para ver el listado a pantalla completa o hacia abajo para colapsar y centrarse en el mapa.
- 📱 **FlatList Optimizado:** Renderizado de la lista con reciclado de memoria para un scroll ultra fluido sin importar la cantidad de gasolineras encontradas.
- 📳 **Respuesta Háptica (Vibración de Feedback):** La aplicación interactúa físicamente contigo mediante pequeñas vibraciones táctiles al presionar marcadores, cambiar filtros o buscar ubicaciones usando `expo-haptics`.
- 💾 **AsyncStorage Caché:** Guarda de forma permanente la base de datos en el almacenamiento local del dispositivo Android para evitar la descarga de 5MB en cada inicio frío de la app.
- 🗺️ **Ruta Directa:** El botón "Ir" abre la navegación por satélite y en coche directamente en la aplicación nativa de **Google Maps** en tu Pixel.
- 📱 **Safe Area:** Respeta los márgenes del notch, barras del sistema y el agujero de cámara (*camera punch hole*) característico de los terminales Google Pixel.

---

## 🏗️ Requisitos previos

- Tener instalado [Node.js](https://nodejs.org/) (v22 o superior).
- Tener instalada la app **Expo Go** en tu móvil (gratuita en Google Play Store).
- Asegurarte de que tu ordenador y tu Google Pixel estén conectados a la **misma red WiFi**.

---

## 🚀 Cómo correr el proyecto y probarlo en tu Google Pixel

1. **Instala las dependencias del proyecto:**
   ```bash
   npm install
   ```
2. **Arranca el servidor de desarrollo de Expo:**
   ```bash
   npm run start
   ```
3. **Escanea el código QR:**
   - Abre la app **Expo Go** en tu Pixel.
   - Presiona en "Scan QR Code" y enfoca la pantalla de tu ordenador.
   - ¡La aplicación se compilará en segundos y correrá de forma nativa en tu móvil!

---

## 📦 Cómo generar tu propia App instalable (.apk) gratis

Cuando quieras tener la app instalada en tu Pixel de forma permanente con su icono propio sin depender del ordenador:

1. Instala el CLI de Expo Application Services:
   ```bash
   npm install -g eas-cli
   ```
2. Inicia sesión en tu cuenta gratuita de Expo:
   ```bash
   eas login
   ```
3. Configura el proyecto de compilación:
   ```bash
   eas build:configure
   ```
4. Lanza la compilación de la App para Android (genera un APK):
   ```bash
   eas build --platform android --profile preview
   ```
   *Nota: El perfil `preview` está preconfigurado por Expo para generar un archivo `.apk` descargable directamente a tu móvil.*
5. Descarga el archivo `.apk` resultante al final del proceso e instálalo en tu Google Pixel.
