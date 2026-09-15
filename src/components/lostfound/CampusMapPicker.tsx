/**
 * CampusMapPicker — Uber-style center-fixed pin map picker for IIITDM campus.
 *
 * Interactive mode: The pin is a fixed CSS element at the screen center.
 * The MAP moves under it. On `moveend`, map.getCenter() gives the pin location.
 * This is identical to how Uber, Google Maps, and Swiggy implement drag-to-pin.
 *
 * ReadOnly mode: Renders a compact static mini-map at a given lat/lng for
 * displaying the pinned location to other users (viewers of a post).
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Typography, Shadows, Spacing } from '@/constants/theme';
import { hapticLight, hapticMedium, hapticSuccess } from '@/utils/haptics';

// ─── Campus Constants ─────────────────────────────────────────────

export const CAMPUS_CENTER = {
  latitude: 12.8373375,
  longitude: 80.1369635,
  name: 'IIITDM Kancheepuram',
};

export const MAX_RADIUS_METERS = 1000;

export interface CampusBuilding {
  id: string;
  name: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: 'lib',      name: 'Central Library',    shortName: 'Library',      latitude: 12.8384, longitude: 80.1387 },
  { id: 'ab1',      name: 'Academic Block 1',   shortName: 'Acad Block 1', latitude: 12.8379, longitude: 80.1378 },
  { id: 'ab2',      name: 'Academic Block 2',   shortName: 'Acad Block 2', latitude: 12.8391, longitude: 80.1382 },
  { id: 'mess',     name: 'Central Mess',        shortName: 'Mess',         latitude: 12.8367, longitude: 80.1373 },
  { id: 'ashwatha', name: 'Ashwatha Hostel',     shortName: 'Ashwatha',     latitude: 12.8359, longitude: 80.1352 },
  { id: 'jasmine',  name: 'Jasmine Hostel',      shortName: 'Jasmine',      latitude: 12.8364, longitude: 80.1365 },
  { id: 'ashoka',   name: 'Ashoka Hostel',       shortName: 'Ashoka',       latitude: 12.8352, longitude: 80.1360 },
  { id: 'sports',   name: 'Sports Complex',      shortName: 'Sports',       latitude: 12.8380, longitude: 80.1345 },
  { id: 'gate',     name: 'Main Gate',           shortName: 'Main Gate',    latitude: 12.8397, longitude: 80.1356 },
];

// ─── Utility Functions ───────────────────────────────────────────

export function calculateHaversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getClosestBuilding(lat: number, lng: number): CampusBuilding | null {
  let closest: CampusBuilding | null = null;
  let minDist = 80;
  for (const b of CAMPUS_BUILDINGS) {
    const d = calculateHaversineDistance(lat, lng, b.latitude, b.longitude);
    if (d < minDist) { minDist = d; closest = b; }
  }
  return closest;
}

export function calculateWalkingTime(distanceMeters: number): {
  minutes: number;
  formattedTime: string;
  formattedDistance: string;
} {
  // Walking pace on campus: ~80 meters per minute (~4.8 km/h), with 1.15 winding factor
  const walkingMeters = Math.round(distanceMeters * 1.15);
  const minutes = Math.max(1, Math.round(walkingMeters / 80));

  let formattedTime = `~${minutes} min walk`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    formattedTime = rem > 0 ? `~${hours}h ${rem}m walk` : `~${hours}h walk`;
  }

  const formattedDistance =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)}km`
      : `${Math.round(distanceMeters)}m`;

  return { minutes, formattedTime, formattedDistance };
}

// In-memory cache for user's GPS coordinates across map previews
export let globalCachedUserLocation: { latitude: number; longitude: number } | null = null;
export function setCachedUserLocation(loc: { latitude: number; longitude: number } | null) {
  globalCachedUserLocation = loc;
}

// ─── HTML Generators ─────────────────────────────────────────────

/**
 * Generates the Leaflet HTML for INTERACTIVE mode.
 * Uses a fixed CSS pin at the viewport center — the MAP moves under it.
 * Listens to map.on('moveend') to emit PIN_MOVED with map.getCenter().
 */
function buildInteractiveHtml(initLat: number, initLng: number): string {
  const cLat = CAMPUS_CENTER.latitude;
  const cLng = CAMPUS_CENTER.longitude;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=10.0,user-scalable=yes"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#0A0A0C;overflow:hidden;}

    /* ─── Dark mode: invert OSM tiles (same technique as horsini ColorMatrix) ─── */
    .leaflet-tile-pane{
      filter:invert(100%) hue-rotate(180deg) brightness(85%) contrast(78%);
    }

    /* ─── Fixed center pin (Uber-style) ─── */
    #pin{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-100%);
      z-index:9999;pointer-events:none;
      transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
      will-change:transform;
    }
    #pin.lifted{
      transform:translate(-50%,calc(-100% - 16px));
    }
    .pin-needle{
      width:32px;height:32px;
      background:#E5E5E7;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2.5px solid rgba(255,255,255,0.5);
      box-shadow:0 4px 18px rgba(0,0,0,0.5),0 1px 4px rgba(0,0,0,0.4);
    }
    .pin-dot{
      width:10px;height:10px;background:#fff;border-radius:50%;
      position:absolute;top:11px;left:11px;
    }
    #pin-shadow{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,2px);
      width:14px;height:6px;
      background:rgba(0,0,0,0.38);
      border-radius:50%;z-index:9998;pointer-events:none;
      transition:all 0.2s ease;
    }
    #pin-shadow.shrunk{width:7px;height:3px;opacity:0.25;}

    .leaflet-control-attribution{
      font-size:9px!important;
      background:rgba(0,0,0,0.75)!important;
      color:#777!important;padding:2px 6px!important;
    }
    .leaflet-control-attribution a{color:#007AFF!important;}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="pin"><div class="pin-needle"><div class="pin-dot"></div></div></div>
  <div id="pin-shadow"></div>
  <script>
    var pin=document.getElementById('pin');
    var shadow=document.getElementById('pin-shadow');

    var map=L.map('map',{
      zoomControl:false,
      attributionControl:true,
      tap:true,
    }).setView([${initLat},${initLng}],17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // 1km guardrail circle
    L.circle([${cLat},${cLng}],{
      color:'rgba(200,200,200,0.5)',
      fillColor:'rgba(200,200,200,0.05)',
      fillOpacity:1,
      radius:${MAX_RADIUS_METERS},
      weight:1.5,
      dashArray:'7,5'
    }).addTo(map);

    function post(obj){
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    function notifyCenter(){
      var c=map.getCenter();
      post({type:'PIN_MOVED',lat:c.lat,lng:c.lng});
    }

    // Pin lifts on map move, drops on moveend
    map.on('movestart',function(){
      pin.classList.add('lifted');
      shadow.classList.add('shrunk');
    });
    map.on('moveend',function(){
      pin.classList.remove('lifted');
      shadow.classList.remove('shrunk');
      notifyCenter();
    });

    // Notify initial center after tiles load
    setTimeout(function(){map.invalidateSize();notifyCenter();},400);

    // Programmatic fly-to (from landmark chips)
    window.setPinLocation=function(lat,lng,anim){
      if(anim){map.flyTo([lat,lng],17,{animate:true,duration:0.9});}
      else{map.setView([lat,lng],17,{animate:false});}
    };

    // GPS locate — reads device position and flies the map there
    window.getCurrentLocation=function(){
      post({type:'GPS_LOCATING'});
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
          function(pos){
            map.flyTo([pos.coords.latitude,pos.coords.longitude],18,{animate:true,duration:1.4});
            post({type:'GPS_SUCCESS'});
          },
          function(err){
            post({type:'GPS_ERROR',message:err.message});
          },
          {enableHighAccuracy:true,timeout:10000,maximumAge:0}
        );
      }else{
        post({type:'GPS_ERROR',message:'Geolocation not available'});
      }
    };
  </script>
</body>
</html>`;
}

/**
 * Generates Leaflet HTML for READ-ONLY mini-map (static, no interaction).
 * Shows a pin marker at the given coordinates on a dark CartoDB map
 * and queries device geolocation to report back to React Native.
 */
function buildReadOnlyHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#0A0A0C;overflow:hidden;}
    /* Dark mode via OSM tile inversion */
    .leaflet-tile-pane{filter:invert(100%) hue-rotate(180deg) brightness(85%) contrast(78%);}
    .leaflet-control-attribution{display:none!important;}
    .leaflet-container{cursor:default!important;}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map=L.map('map',{
      zoomControl:false,attributionControl:false,
      dragging:false,touchZoom:false,doubleClickZoom:false,
      scrollWheelZoom:false,boxZoom:false,keyboard:false,tap:false,
    }).setView([${lat},${lng}],16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,attribution:''
    }).addTo(map);

    // Accuracy halo
    L.circle([${lat},${lng}],{
      color:'rgba(229,229,231,0.4)',
      fillColor:'rgba(229,229,231,0.12)',fillOpacity:1,
      radius:28,weight:1.5,
    }).addTo(map);

    // Pin marker
    L.marker([${lat},${lng}],{
      icon:L.divIcon({
        className:'',
        html:'<div style="width:16px;height:16px;background:#E5E5E7;border-radius:50%;border:2.5px solid #1C1C1E;box-shadow:0 2px 10px rgba(0,0,0,0.6);"></div>',
        iconSize:[16,16],iconAnchor:[8,8]
      })
    }).addTo(map);

    function post(obj){
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        function(pos){
          post({type:'USER_LOCATION',lat:pos.coords.latitude,lng:pos.coords.longitude});
        },
        function(err){
          post({type:'USER_LOCATION_ERROR',message:err.message});
        },
        {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
      );
    }

    setTimeout(function(){map.invalidateSize();},250);
  </script>
</body>
</html>`;
}

/**
 * Generates Leaflet HTML for FULL-SCREEN item location viewer.
 * Displays:
 *  - The item's location marker (with title badge)
 *  - The user's live current location marker (pulsing blue dot + "You are here" label)
 *  - Dashed route polyline between user and item
 *  - Auto-fit bounds so both markers are cleanly framed
 */
function buildViewerHtml(
  itemLat: number,
  itemLng: number,
  itemLabel: string,
  userLat?: number | null,
  userLng?: number | null,
): string {
  const safeLabel = (itemLabel || 'Item Location').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const initUserLat = userLat != null ? userLat : 'null';
  const initUserLng = userLng != null ? userLng : 'null';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=10.0,user-scalable=yes"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#0A0A0C;overflow:hidden;}
    .leaflet-tile-pane{filter:invert(100%) hue-rotate(180deg) brightness(85%) contrast(78%);}
    .leaflet-control-attribution{font-size:9px!important;background:rgba(0,0,0,0.75)!important;color:#777!important;padding:2px 6px!important;}
    .leaflet-control-attribution a{color:#007AFF!important;}

    @keyframes pulse {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(1.8); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var itemLat = ${itemLat};
    var itemLng = ${itemLng};
    var currentItemLabel = "${safeLabel}";

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      tap: true,
    }).setView([itemLat, itemLng], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Campus 1km boundary guide
    L.circle([${CAMPUS_CENTER.latitude}, ${CAMPUS_CENTER.longitude}], {
      color: 'rgba(200,200,200,0.35)',
      fillColor: 'rgba(200,200,200,0.04)',
      fillOpacity: 1,
      radius: ${MAX_RADIUS_METERS},
      weight: 1,
      dashArray: '6,6'
    }).addTo(map);

    // Item marker (custom dark pill badge + pin)
    var itemIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">' +
              '<div style="background:#1C1C1E;color:#E5E5E7;border:1.5px solid rgba(255,255,255,0.45);border-radius:12px;padding:4px 9px;font-size:11px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.65);margin-bottom:4px;display:flex;align-items:center;gap:4px;">' +
                '<span>📍</span> ' + currentItemLabel +
              '</div>' +
              '<div style="width:28px;height:28px;background:#E5E5E7;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #121212;box-shadow:0 3px 12px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">' +
                '<div style="width:8px;height:8px;background:#121212;border-radius:50%;transform:rotate(45deg);"></div>' +
              '</div>' +
            '</div>',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    var itemMarker = L.marker([itemLat, itemLng], { icon: itemIcon, zIndexOffset: 500 }).addTo(map);

    var userMarker = null;
    var userHalo = null;
    var routeLine = null;
    var userLat = ${initUserLat};
    var userLng = ${initUserLng};

    function post(obj){
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    function renderUserLocation(lat, lng, fitView){
      userLat = lat;
      userLng = lng;

      if(!userMarker){
        var userIcon = L.divIcon({
          className: '',
          html: '<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">' +
                  '<div style="background:#007AFF;color:#FFFFFF;border-radius:10px;padding:2px 7px;font-size:10px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;box-shadow:0 2px 8px rgba(0,122,255,0.6);margin-bottom:3px;">' +
                    'You are here' +
                  '</div>' +
                  '<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">' +
                    '<div style="position:absolute;width:38px;height:38px;border-radius:50%;background:rgba(0,122,255,0.3);animation:pulse 2s infinite ease-out;"></div>' +
                    '<div style="width:15px;height:15px;background:#007AFF;border:2.5px solid #FFFFFF;border-radius:50%;box-shadow:0 2px 8px rgba(0,122,255,0.9);z-index:2;"></div>' +
                  '</div>' +
                '</div>',
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });
        userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        userHalo = L.circle([lat, lng], {
          radius: 22,
          color: 'rgba(0,122,255,0.45)',
          fillColor: 'rgba(0,122,255,0.12)',
          fillOpacity: 1,
          weight: 1
        }).addTo(map);
      } else {
        userMarker.setLatLng([lat, lng]);
        userHalo.setLatLng([lat, lng]);
      }

      if(routeLine){
        routeLine.setLatLngs([[lat, lng], [itemLat, itemLng]]);
      } else {
        routeLine = L.polyline([[lat, lng], [itemLat, itemLng]], {
          color: '#007AFF',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '8, 8'
        }).addTo(map);
      }

      if(fitView){
        map.fitBounds([
          [lat, lng],
          [itemLat, itemLng]
        ], { padding: [80, 80], maxZoom: 18, animate: true });
      }

      post({ type: 'USER_LOCATION', lat: lat, lng: lng });
    }

    if(userLat !== null && userLng !== null){
      renderUserLocation(userLat, userLng, true);
    }

    window.requestGps = function(){
      post({ type: 'GPS_LOCATING' });
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
          function(pos){
            renderUserLocation(pos.coords.latitude, pos.coords.longitude, true);
            post({ type: 'GPS_SUCCESS', lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          function(err){
            post({ type: 'GPS_ERROR', message: err.message });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      } else {
        post({ type: 'GPS_ERROR', message: 'Geolocation not supported' });
      }
    };

    window.fitBoth = function(){
      if(userLat !== null && userLng !== null){
        map.fitBounds([[userLat, userLng], [itemLat, itemLng]], { padding: [80, 80], maxZoom: 18 });
      } else {
        map.setView([itemLat, itemLng], 17);
      }
    };

    window.recenterItem = function(){
      map.flyTo([itemLat, itemLng], 18, { animate: true, duration: 1.2 });
    };

    window.recenterUser = function(){
      if(userLat !== null && userLng !== null){
        map.flyTo([userLat, userLng], 18, { animate: true, duration: 1.2 });
      } else {
        window.requestGps();
      }
    };

    setTimeout(function(){
      map.invalidateSize();
      window.requestGps();
    }, 400);
  </script>
</body>
</html>`;
}

// ─── Props ───────────────────────────────────────────────────────

export interface CampusMapPickerProps {
  /** Interactive mode — for post/edit forms */
  initialLat?: number | null;
  initialLng?: number | null;
  initialBuilding?: string;
  onLocationSelect?: (data: {
    latitude: number;
    longitude: number;
    address: string;
    building: string;
    distanceMeters: number;
    isOutOfBounds: boolean;
  }) => void;
  /** ReadOnly mode — for viewing a pinned location in a post detail */
  readOnly?: boolean;
  readOnlyLat?: number | null;
  readOnlyLng?: number | null;
  readOnlyLabel?: string;
  onPressPreview?: () => void;
  isViewerVisible?: boolean;
  onCloseViewer?: () => void;
}

// ─── Component ────────────────────────────────────────────────────

export function CampusMapPicker({
  initialLat,
  initialLng,
  initialBuilding,
  onLocationSelect,
  readOnly = false,
  readOnlyLat,
  readOnlyLng,
  readOnlyLabel,
  onPressPreview,
  isViewerVisible,
  onCloseViewer,
}: CampusMapPickerProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const viewerWebViewRef = useRef<WebView>(null);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Read-only viewer modal state
  const [internalViewerVisible, setInternalViewerVisible] = useState(false);
  const isViewerOpen = isViewerVisible ?? internalViewerVisible;
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    globalCachedUserLocation,
  );
  const [isViewerLocating, setIsViewerLocating] = useState(false);

  const handleOpenViewer = () => {
    hapticMedium();
    if (onPressPreview) {
      onPressPreview();
    } else {
      setInternalViewerVisible(true);
    }
  };

  const handleCloseViewer = () => {
    hapticLight();
    if (onCloseViewer) {
      onCloseViewer();
    }
    setInternalViewerVisible(false);
  };

  const handleReadOnlyMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'USER_LOCATION' && data.lat && data.lng) {
        const loc = { latitude: data.lat, longitude: data.lng };
        globalCachedUserLocation = loc;
        setUserLocation(loc);
      }
    } catch {}
  }, []);

  const handleViewerMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if ((data.type === 'USER_LOCATION' || data.type === 'GPS_SUCCESS') && data.lat && data.lng) {
        const loc = { latitude: data.lat, longitude: data.lng };
        globalCachedUserLocation = loc;
        setUserLocation(loc);
        setIsViewerLocating(false);
      } else if (data.type === 'GPS_LOCATING') {
        setIsViewerLocating(true);
      } else if (data.type === 'GPS_ERROR') {
        setIsViewerLocating(false);
      }
    } catch {}
  }, []);

  const effectiveUserCoords = userLocation ?? globalCachedUserLocation;

  // Calculate walking time & distance to destination
  const previewDistance = useMemo(() => {
    if (!readOnlyLat || !readOnlyLng) return 0;
    if (effectiveUserCoords) {
      return calculateHaversineDistance(
        effectiveUserCoords.latitude,
        effectiveUserCoords.longitude,
        readOnlyLat,
        readOnlyLng,
      );
    }
    return calculateHaversineDistance(
      CAMPUS_CENTER.latitude,
      CAMPUS_CENTER.longitude,
      readOnlyLat,
      readOnlyLng,
    );
  }, [readOnlyLat, readOnlyLng, effectiveUserCoords]);

  const previewWalk = useMemo(() => calculateWalkingTime(previewDistance), [previewDistance]);

  const viewerHtml = useMemo(() => {
    if (!readOnlyLat || !readOnlyLng) return '';
    return buildViewerHtml(
      readOnlyLat,
      readOnlyLng,
      readOnlyLabel || 'Campus Location',
      effectiveUserCoords?.latitude,
      effectiveUserCoords?.longitude,
    );
  }, [readOnlyLat, readOnlyLng, readOnlyLabel, effectiveUserCoords, isViewerOpen]);

  const handleOpenGoogleMaps = () => {
    if (!readOnlyLat || !readOnlyLng) return;
    hapticMedium();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${readOnlyLat},${readOnlyLng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Navigation Error', 'Could not open maps application.');
    });
  };

  // Confirmed (saved) coordinates
  const [currentLat, setCurrentLat] = useState<number>(initialLat ?? CAMPUS_CENTER.latitude);
  const [currentLng, setCurrentLng] = useState<number>(initialLng ?? CAMPUS_CENTER.longitude);
  const [selectedBuilding, setSelectedBuilding] = useState<string>(initialBuilding ?? '');

  // Staging (in-map-modal) coordinates — committed on Done
  const [tempLat, setTempLat] = useState<number>(initialLat ?? CAMPUS_CENTER.latitude);
  const [tempLng, setTempLng] = useState<number>(initialLng ?? CAMPUS_CENTER.longitude);
  const [tempBuilding, setTempBuilding] = useState<string>(initialBuilding ?? '');

  const distance = calculateHaversineDistance(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude, currentLat, currentLng);
  const isOutOfBounds = distance > MAX_RADIUS_METERS;

  const tempDistance = calculateHaversineDistance(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude, tempLat, tempLng);
  const isTempOutOfBounds = tempDistance > MAX_RADIUS_METERS;

  const notifyParent = useCallback(
    (lat: number, lng: number, buildingName: string) => {
      const dist = calculateHaversineDistance(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude, lat, lng);
      const detected = buildingName || getClosestBuilding(lat, lng)?.name || '';
      const address = detected ? `${detected}, IIITDM Campus` : `Pinned at (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      onLocationSelect?.({
        latitude: lat, longitude: lng, address,
        building: detected, distanceMeters: dist, isOutOfBounds: dist > MAX_RADIUS_METERS,
      });
    },
    [onLocationSelect],
  );

  const handleOpenFullScreen = () => {
    hapticMedium();
    setTempLat(currentLat);
    setTempLng(currentLng);
    setTempBuilding(selectedBuilding);
    setIsFullScreen(true);
  };

  const handleConfirmLocation = () => {
    hapticSuccess();
    setCurrentLat(tempLat);
    setCurrentLng(tempLng);
    setSelectedBuilding(tempBuilding);
    notifyParent(tempLat, tempLng, tempBuilding);
    setIsFullScreen(false);
  };

  const handleCancelFullScreen = () => {
    hapticLight();
    setIsFullScreen(false);
  };

  // Inject JS to trigger GPS in the WebView
  const handleLocateMe = () => {
    hapticLight();
    webViewRef.current?.injectJavaScript(`if(window.getCurrentLocation)window.getCurrentLocation();true;`);
  };

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PIN_MOVED') {
        const { lat, lng } = data;
        setTempLat(lat);
        setTempLng(lng);
        const closest = getClosestBuilding(lat, lng);
        setTempBuilding(closest?.name ?? '');
      } else if (data.type === 'GPS_LOCATING') {
        setIsLocating(true);
      } else if (data.type === 'GPS_SUCCESS') {
        setIsLocating(false);
        hapticSuccess();
      } else if (data.type === 'GPS_ERROR') {
        setIsLocating(false);
        Alert.alert('Location Error', 'Could not get your GPS position. Ensure location services are enabled.');
      }
    } catch {}
  }, []);

  const selectQuickBuilding = (b: CampusBuilding) => {
    hapticLight();
    setTempLat(b.latitude);
    setTempLng(b.longitude);
    setTempBuilding(b.name);
    webViewRef.current?.injectJavaScript(
      `if(window.setPinLocation)window.setPinLocation(${b.latitude},${b.longitude},true);true;`,
    );
  };

  /**
   * IMPORTANT: memo depends on [isFullScreen] only.
   * When the modal opens, tempLat/tempLng are already updated (React batches state).
   * The HTML is generated once per open, then the map is controlled via JS injection.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const interactiveHtml = useMemo(() => buildInteractiveHtml(tempLat, tempLng), [isFullScreen]);

  const readOnlyHtml = useMemo(
    () => (readOnly && readOnlyLat != null && readOnlyLng != null ? buildReadOnlyHtml(readOnlyLat, readOnlyLng) : ''),
    [readOnly, readOnlyLat, readOnlyLng],
  );

  // ─── ReadOnly mini-map & Full-screen viewer ──────────────────
  if (readOnly) {
    if (!readOnlyLat || !readOnlyLng || !readOnlyHtml) return null;
    return (
      <>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleOpenViewer}
          style={styles.readOnlyContainer}
        >
          {/* pointerEvents="none" prevents the static WebView from consuming scroll gestures */}
          <View pointerEvents="none" style={styles.readOnlyMapView}>
            <WebView
              originWhitelist={['*']}
              source={{ html: readOnlyHtml }}
              onMessage={handleReadOnlyMessage}
              style={styles.readOnlyWebView}
              scrollEnabled={false}
              javaScriptEnabled
              domStorageEnabled
              geolocationEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.readOnlyLoading}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                </View>
              )}
            />
          </View>

          {/* Bottom preview bar with time needed to reach point */}
          <View style={styles.readOnlyFooter}>
            <View style={styles.previewWalkRow}>
              <View style={styles.previewWalkBadge}>
                <Ionicons name="walk" size={13} color="#121212" />
                <Text style={styles.previewWalkText}>
                  {previewWalk.formattedTime} · {previewWalk.formattedDistance}
                  {!effectiveUserCoords ? ' from center' : ''}
                </Text>
              </View>
              <View style={styles.previewTapHint}>
                <Text style={styles.previewTapHintText}>Full screen</Text>
                <Ionicons name="expand-outline" size={12} color={Colors.textSecondary} />
              </View>
            </View>

            <View style={styles.previewMetaRow}>
              <Ionicons name="location-outline" size={12} color={Colors.systemBlue} />
              <Text style={styles.readOnlyLabelText} numberOfLines={1}>
                {readOnlyLabel || 'Campus Location'}
              </Text>
              <Text style={styles.readOnlyCoords}>
                {Number(readOnlyLat).toFixed(4)}, {Number(readOnlyLng).toFixed(4)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Full-Screen Location Viewer Modal */}
        <Modal
          visible={isViewerOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={handleCloseViewer}
          statusBarTranslucent
        >
          <View style={[styles.fullScreen, { paddingTop: Math.max(insets.top, 24) }]}>
            {/* Header */}
            <View style={styles.viewerHeader}>
              <TouchableOpacity onPress={handleCloseViewer} hitSlop={12} style={styles.headerBtn}>
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {readOnlyLabel || 'Campus Location'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {previewWalk.formattedTime} · {previewWalk.formattedDistance} away
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleOpenGoogleMaps}
                style={styles.viewerDirectBtn}
                activeOpacity={0.8}
                hitSlop={8}
              >
                <Ionicons name="navigate-outline" size={18} color="#121212" />
              </TouchableOpacity>
            </View>

            {/* Map Area */}
            <View style={styles.mapWrap}>
              <WebView
                ref={viewerWebViewRef}
                originWhitelist={['*']}
                source={{ html: viewerHtml }}
                onMessage={handleViewerMessage}
                style={styles.webView}
                javaScriptEnabled
                domStorageEnabled
                geolocationEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loading}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Opening campus map...</Text>
                  </View>
                )}
              />

              {/* Floating Map Controls (top-right) */}
              <View style={styles.viewerFloatingControls}>
                {/* GPS Locate button */}
                <TouchableOpacity
                  style={styles.viewerControlBtn}
                  onPress={() => {
                    hapticLight();
                    viewerWebViewRef.current?.injectJavaScript(
                      `if(window.recenterUser)window.recenterUser();true;`,
                    );
                  }}
                  activeOpacity={0.8}
                >
                  {isViewerLocating ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons name="navigate" size={18} color={Colors.white} />
                  )}
                </TouchableOpacity>

                {/* Fit Both button */}
                <TouchableOpacity
                  style={styles.viewerControlBtn}
                  onPress={() => {
                    hapticLight();
                    viewerWebViewRef.current?.injectJavaScript(
                      `if(window.fitBoth)window.fitBoth();true;`,
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="scan-outline" size={18} color={Colors.white} />
                </TouchableOpacity>

                {/* Recenter on Item button */}
                <TouchableOpacity
                  style={styles.viewerControlBtn}
                  onPress={() => {
                    hapticLight();
                    viewerWebViewRef.current?.injectJavaScript(
                      `if(window.recenterItem)window.recenterItem();true;`,
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>

              {/* Floating Legend / Live indicator (top-left) */}
              <View style={styles.viewerLiveBadge}>
                <View style={styles.viewerLiveDot} />
                <Text style={styles.viewerLiveText}>Live Campus View</Text>
              </View>
            </View>

            {/* Bottom sheet card */}
            <View style={[styles.viewerBottomCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.viewerBottomTop}>
                <View style={styles.viewerWalkPill}>
                  <Ionicons name="walk" size={16} color="#121212" />
                  <Text style={styles.viewerWalkPillText}>{previewWalk.formattedTime}</Text>
                </View>
                <View style={styles.viewerDistPill}>
                  <Text style={styles.viewerDistPillText}>
                    {previewWalk.formattedDistance} from {effectiveUserCoords ? 'your position' : 'campus center'}
                  </Text>
                </View>
              </View>

              <View style={styles.viewerDestInfo}>
                <Ionicons name="business" size={16} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.viewerDestName} numberOfLines={1}>
                    {readOnlyLabel || 'Campus Landmark'}
                  </Text>
                  <Text style={styles.viewerDestSub}>
                    {Number(readOnlyLat).toFixed(5)}, {Number(readOnlyLng).toFixed(5)} · IIITDM Campus
                  </Text>
                </View>
              </View>

              <Text style={styles.viewerPaceNote}>
                Estimated walking pace ~4.8 km/h along pedestrian campus pathways
              </Text>

              <View style={styles.viewerActionRow}>
                <TouchableOpacity
                  style={styles.viewerMapsBtn}
                  onPress={handleOpenGoogleMaps}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={16} color="#121212" />
                  <Text style={styles.viewerMapsBtnText}>Directions in Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewerDismissBtn}
                  onPress={handleCloseViewer}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewerDismissBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ─── Interactive trigger card + full-screen modal ──────────────
  return (
    <View style={styles.container}>
      {/* Trigger Card */}
      <View style={styles.triggerCard}>
        <View style={styles.triggerTop}>
          <View
            style={[
              styles.pinCircle,
              { backgroundColor: isOutOfBounds ? 'rgba(255,59,48,0.12)' : 'rgba(0,122,255,0.12)' },
            ]}
          >
            <Ionicons
              name="location"
              size={18}
              color={isOutOfBounds ? Colors.systemRed : Colors.systemBlue}
            />
          </View>
          <View style={styles.triggerTextWrap}>
            <Text style={styles.triggerBuildingTitle} numberOfLines={1}>
              {selectedBuilding || 'IIITDM Campus'}
            </Text>
            <Text style={styles.triggerCoordsText} numberOfLines={1}>
              {currentLat.toFixed(5)}, {currentLng.toFixed(5)} · {distance}m
            </Text>
          </View>
          <View style={[styles.guardrailTag, isOutOfBounds ? styles.tagOut : styles.tagIn]}>
            <Ionicons
              name={isOutOfBounds ? 'alert-circle' : 'shield-checkmark'}
              size={11}
              color={isOutOfBounds ? Colors.systemRed : Colors.systemGreen}
            />
            <Text style={[styles.guardrailTagText, { color: isOutOfBounds ? Colors.systemRed : Colors.systemGreen }]}>
              {isOutOfBounds ? 'Out of 1km' : '1km OK'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.pointOnMapBtn}
          onPress={handleOpenFullScreen}
          activeOpacity={0.8}
        >
          <View style={styles.btnLeft}>
            <Ionicons name="map" size={16} color="#121212" />
            <Text style={styles.btnText}>Point on Map</Text>
          </View>
          <View style={styles.btnRight}>
            <Text style={styles.btnSubText}>
              {selectedBuilding ? 'Adjust pin' : 'Full screen'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#121212" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Full-Screen Map Modal */}
      <Modal
        visible={isFullScreen}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancelFullScreen}
        statusBarTranslucent
      >
        <View style={[styles.fullScreen, { paddingTop: Math.max(insets.top, 24) }]}>
          {/* Header */}
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={handleCancelFullScreen} hitSlop={12} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Point on Map</Text>
              <Text
                style={[styles.headerSubtitle, isTempOutOfBounds && { color: Colors.systemRed }]}
                numberOfLines={1}
              >
                {tempBuilding ? `${tempBuilding} · ${tempDistance}m` : `${tempDistance}m from campus${isTempOutOfBounds ? ' (> 1km!)' : ''}`}
              </Text>
            </View>

            <TouchableOpacity onPress={handleConfirmLocation} style={styles.doneBtn} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Out-of-bounds warning */}
          {isTempOutOfBounds && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={14} color={Colors.systemRed} />
              <Text style={styles.warningText}>
                {(tempDistance / 1000).toFixed(2)}km away — must be within 1km of college.
              </Text>
            </View>
          )}

          {/* Map + Overlay controls */}
          <View style={styles.mapWrap}>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: interactiveHtml }}
              onMessage={handleMessage}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              geolocationEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color={Colors.systemBlue} />
                  <Text style={styles.loadingText}>Loading Map...</Text>
                </View>
              )}
            />

            {/* GPS Locate button (top-right) */}
            <TouchableOpacity
              style={styles.locateBtn}
              onPress={handleLocateMe}
              activeOpacity={0.8}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="navigate" size={20} color={Colors.white} />
              )}
            </TouchableOpacity>

            {/* Touch hint badge (top-left) */}
            <View style={styles.touchHint}>
              <Ionicons name="hand-left-outline" size={13} color={Colors.white} />
              <Text style={styles.touchHintText}>Drag map · pin stays centered</Text>
            </View>
          </View>

          {/* Landmarks bar */}
          <View style={[styles.landmarksBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.landmarksLabel}>CAMPUS LANDMARKS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.landmarksScroll}>
              {CAMPUS_BUILDINGS.map((b) => {
                const active = tempBuilding === b.name;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => selectQuickBuilding(b)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={active ? 'location' : 'location-outline'}
                      size={12}
                      color={active ? Colors.white : Colors.textMuted}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{b.shortName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { marginVertical: 4 },

  // Trigger card in form
  triggerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing[3.5],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[3],
  },
  triggerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2.5],
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTextWrap: { flex: 1 },
  triggerBuildingTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  triggerCoordsText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  guardrailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tagIn: { backgroundColor: 'rgba(52,199,89,0.14)' },
  tagOut: { backgroundColor: 'rgba(255,59,48,0.14)' },
  guardrailTagText: { fontSize: 10, fontWeight: Typography.weight.bold },

    pointOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    ...Shadows.sm,
  },
  btnLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: '#121212' },
  btnRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnSubText: { fontSize: Typography.size.xs, color: '#333333' },

  // Full-screen map modal
  fullScreen: { flex: 1, backgroundColor: '#0A0A0C' },

  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0A0A0C',
  },
  headerBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing[2] },
  headerTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.white,
  },
  headerSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  doneBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
  },
  doneBtnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: '#121212' },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,59,48,0.15)',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,59,48,0.35)',
  },
  warningText: { fontSize: 12, color: '#FF6961', fontWeight: Typography.weight.medium, flex: 1 },

  mapWrap: { flex: 1, position: 'relative', backgroundColor: '#0A0A0C' },
  webView: { flex: 1, backgroundColor: 'transparent' },

  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0A0A0C',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: Typography.size.sm, color: Colors.textMuted },

  // GPS locate button (top-right overlay)
  locateBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,10,12,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.md,
  },

  // Touch hint (top-left overlay)
  touchHint: {
    position: 'absolute',
    top: 14, left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,10,12,0.82)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  touchHintText: { fontSize: 11, color: Colors.white, fontWeight: Typography.weight.medium },

  // Landmarks bottom bar
  landmarksBar: {
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  landmarksLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing[2],
  },
  landmarksScroll: { gap: 8, paddingBottom: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: { fontSize: 12, color: Colors.textMuted, fontWeight: Typography.weight.medium },
  chipTextActive: { color: '#121212', fontWeight: Typography.weight.bold },

  // Read-only mini-map
  readOnlyContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#0A0A0C',
  },
  readOnlyMapView: {
    height: 160,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  readOnlyWebView: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  readOnlyLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0A0A0C',
    alignItems: 'center', justifyContent: 'center',
  },
  readOnlyFooter: {
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[2.5],
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 6,
  },
  previewWalkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewWalkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  previewWalkText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#121212',
  },
  previewTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  previewTapHintText: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    color: Colors.textSecondary,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readOnlyLabelText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  readOnlyCoords: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Full-screen viewer styles
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0A0A0C',
  },
  viewerDirectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerFloatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 10,
  },
  viewerControlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10,10,12,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  viewerLiveBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,10,12,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  viewerLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  viewerLiveText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: Typography.weight.semibold,
  },
  viewerBottomCard: {
    backgroundColor: '#111114',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing[3.5],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  viewerBottomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerWalkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  viewerWalkPillText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#121212',
  },
  viewerDistPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewerDistPillText: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
  viewerDestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  viewerDestName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  viewerDestSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  viewerPaceNote: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  viewerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewerMapsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing[3],
    ...Shadows.sm,
  },
  viewerMapsBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#121212',
  },
  viewerDismissBtn: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewerDismissBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
});
