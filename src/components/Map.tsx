import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { GasStation } from '../types';

interface MapProps {
  currentCoords: { latitude: number; longitude: number };
  filteredStations: GasStation[];
  onMarkerPress: (station: GasStation) => void;
  mapRef: React.RefObject<any>;
  isDarkMode: boolean;
  onZoomChange?: (zoom: number) => void;
}

export default function Map({
  currentCoords,
  filteredStations,
  onMarkerPress,
  mapRef,
  isDarkMode,
  onZoomChange,
}: MapProps) {
  const webViewRef = useRef<WebView>(null);
  const apiKey = process.env.EXPO_PUBLIC_CARTO_API_KEY || '';

  // Expose centerMap control via ref redirection
  useEffect(() => {
    if (mapRef) {
      (mapRef as any).current = {
        animateToRegion: (region: { latitude: number; longitude: number; latitudeDelta?: number }, duration?: number) => {
          const js = `
            if (typeof map !== 'undefined') {
              map.setView([${region.latitude}, ${region.longitude}], 16);
            }
          `;
          webViewRef.current?.injectJavaScript(js);
        }
      };
    }
  }, [mapRef]);

  // Sync coords, theme, and station changes to Leaflet WebView
  useEffect(() => {
    const data = {
      type: 'SET_COORDS',
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      center: true,
      zoom: 14,
    };
    webViewRef.current?.postMessage(JSON.stringify(data));
  }, [currentCoords]);

  useEffect(() => {
    const data = {
      type: 'SET_STATIONS',
      stations: filteredStations,
    };
    webViewRef.current?.postMessage(JSON.stringify(data));
  }, [filteredStations]);

  useEffect(() => {
    const data = {
      type: 'SET_THEME',
      isDarkMode,
    };
    webViewRef.current?.postMessage(JSON.stringify(data));
  }, [isDarkMode]);

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MARKER_PRESS') {
        onMarkerPress(msg.station);
      } else if (msg.type === 'ZOOM_CHANGED') {
        onZoomChange?.(msg.zoom);
      } else if (msg.type === 'MAP_READY') {
        // Init sync
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'SET_COORDS',
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          center: true,
          zoom: 14,
        }));
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'SET_STATIONS',
          stations: filteredStations,
        }));
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'SET_THEME',
          isDarkMode,
        }));
      }
    } catch (e) {
      console.warn('Map webview bridge error:', e);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map {
          margin: 0; padding: 0; width: 100%; height: 100%;
          background: #020617;
        }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${currentCoords.latitude}, ${currentCoords.longitude}], 14);
        
        // CartoDB Tile Themes
        var darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${apiKey}', { maxZoom: 20 });
        var lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${apiKey}', { maxZoom: 20 });

        var activeTiles = ${isDarkMode ? 'darkTiles' : 'lightTiles'};
        activeTiles.addTo(map);

        var userMarker = null;
        var markersGroup = L.layerGroup().addTo(map);

        function sendToRN(data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        }

        function handleMessage(event) {
          try {
            var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (msg.type === 'SET_COORDS') {
              var lat = msg.latitude;
              var lng = msg.longitude;
              if (!userMarker) {
                var userIcon = L.divIcon({
                  html: '<div style="width:14px;height:14px;border-radius:7px;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 0 10px rgba(59,130,246,0.8)"></div>',
                  className: 'user-marker-icon',
                  iconSize: [14, 14],
                  iconAnchor: [7, 7]
                });
                userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
              } else {
                userMarker.setLatLng([lat, lng]);
              }
              if (msg.center) {
                map.setView([lat, lng], msg.zoom || 14);
              }
            } else if (msg.type === 'SET_STATIONS') {
              markersGroup.clearLayers();
              var stations = msg.stations;
              stations.forEach(function(station) {
                var priceColor = '#94a3b8';
                var borderColor = 'rgba(148,163,184,0.3)';
                if (station.priceLevel === 'cheapest') { priceColor = '#10b981'; borderColor = '#10b981'; }
                else if (station.priceLevel === 'economy') { priceColor = '#14b8a6'; borderColor = '#14b8a6'; }
                else if (station.priceLevel === 'moderate') { priceColor = '#f59e0b'; borderColor = '#f59e0b'; }
                else if (station.priceLevel === 'expensive') { priceColor = '#f97316'; borderColor = '#f97316'; }
                else if (station.priceLevel === 'most-expensive') { priceColor = '#f43f5e'; borderColor = '#f43f5e'; }

                var labelIcon = L.divIcon({
                  html: '<div style="background:#020617; border: 1.5px solid ' + borderColor + '; border-radius: 6px; color: ' + priceColor + '; font-family: system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 900; padding: 3px 6px; white-space: nowrap; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">' + (station.price ? station.price.toFixed(3) : '') + '</div>',
                  className: 'price-marker-icon',
                  iconSize: [46, 20],
                  iconAnchor: [23, 10]
                });

                var m = L.marker([station.latitude, station.longitude], { icon: labelIcon });
                m.on('click', function() {
                  sendToRN({ type: 'MARKER_PRESS', station: station });
                });
                markersGroup.addLayer(m);
              });
            } else if (msg.type === 'CENTER_MAP') {
              map.setView([msg.latitude, msg.longitude], msg.zoom || 16);
            } else if (msg.type === 'SET_THEME') {
              map.removeLayer(darkTiles);
              map.removeLayer(lightTiles);
              if (msg.isDarkMode) {
                darkTiles.addTo(map);
              } else {
                lightTiles.addTo(map);
              }
            }
          } catch(e) {
            // Error parser fallback
          }
        }

        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage);

        map.on('zoomend', function() {
          sendToRN({ type: 'ZOOM_CHANGED', zoom: map.getZoom() });
        });

        // Notify ready
        setTimeout(function() {
          sendToRN({ type: 'MAP_READY' });
        }, 100);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://localhost' }}
        style={styles.webView}
        onMessage={onMessage}
        scrollEnabled={false}
        overScrollMode="never"
        domStorageEnabled={true}
        javaScriptEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  webView: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
