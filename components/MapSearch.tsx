'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  geometry: { location: { lat: number; lng: number } };
  types: string[];
  distance?: number;
}

type SearchType = 'vegetarian' | 'convenience';

const SEARCH_CONFIGS: Record<SearchType, { label: string; keyword: string; icon: string }> = {
  vegetarian: { label: '素食餐廳', keyword: '素食', icon: '🥦' },
  convenience: { label: '便利商店', keyword: 'convenience_store', icon: '🏪' },
};

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export default function MapSearch() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchType, setSearchType] = useState<SearchType>('vegetarian');
  const [loading, setLoading] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [radius, setRadius] = useState(1000); // meters

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  }, []);

  const addMarkers = useCallback((results: Place[], map: google.maps.Map) => {
    clearMarkers();
    results.forEach((place, idx) => {
      const marker = new window.google.maps.Marker({
        position: place.geometry.location,
        map,
        title: place.name,
        label: {
          text: String(idx + 1),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: searchType === 'vegetarian' ? '#16a34a' : '#2563eb',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => setSelectedPlace(place));
      markersRef.current.push(marker);
    });
  }, [clearMarkers, searchType]);

  const searchNearby = useCallback(async (pos: { lat: number; lng: number }, map: google.maps.Map) => {
    setLoading(true);
    setError('');
    setSelectedPlace(null);

    const service = new window.google.maps.places.PlacesService(map);
    const config = SEARCH_CONFIGS[searchType];

    const request: google.maps.places.PlaceSearchRequest = {
      location: pos,
      radius,
      ...(searchType === 'convenience'
        ? { type: 'convenience_store' }
        : { keyword: config.keyword }),
    };

    service.nearbySearch(request, (results, status) => {
      setLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const withDist = results.map((r): Place => {
          const p = r as unknown as Place;
          const latFn = p.geometry.location.lat;
          const lngFn = p.geometry.location.lng;
          const lat = typeof latFn === 'function' ? (latFn as () => number)() : latFn as number;
          const lng = typeof lngFn === 'function' ? (lngFn as () => number)() : lngFn as number;
          const dlat = lat - pos.lat;
          const dlng = lng - pos.lng;
          p.distance = Math.round(Math.sqrt(dlat * dlat + dlng * dlng) * 111000);
          return p;
        });
        withDist.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setPlaces(withDist.slice(0, 15));
        addMarkers(withDist.slice(0, 15), map);
      } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        setPlaces([]);
        setError(`附近 ${radius / 1000} 公里內沒有找到${config.label}`);
        clearMarkers();
      } else {
        setError('搜尋失敗，請確認 Google Maps API Key 已正確設定');
      }
    });
  }, [searchType, radius, addMarkers, clearMarkers]);

  const initMap = useCallback((pos: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: pos,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      styles: [
        { featureType: 'poi.business', stylers: [{ visibility: 'simplified' }] },
      ],
    });

    // User location marker
    new window.google.maps.Marker({
      position: pos,
      map,
      title: '我的位置',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 3,
      },
    });

    // Radius circle
    new window.google.maps.Circle({
      map,
      center: pos,
      radius,
      fillColor: '#16a34a',
      fillOpacity: 0.05,
      strokeColor: '#16a34a',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });

    mapInstance.current = map;
    searchNearby(pos, map);
  }, [radius, searchNearby]);

  const loadGoogleMaps = useCallback(() => {
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      setError('請在 .env.local 設定 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
      return;
    }

    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;

    window.initMap = () => setMapLoaded(true);
    document.head.appendChild(script);
    script.onerror = () => setError('Google Maps 載入失敗，請確認 API Key');
  }, [apiKey]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('瀏覽器不支援定位功能');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
        setLoading(false);
        if (mapLoaded) initMap(coords);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) setError('請允許瀏覽器取得您的位置');
        else setError('無法取得位置，請稍後再試');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [mapLoaded, initMap]);

  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  useEffect(() => {
    if (mapLoaded && !userPos) locate();
    if (mapLoaded && userPos) initMap(userPos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  // Re-search when type changes
  useEffect(() => {
    if (userPos && mapInstance.current && mapLoaded) {
      searchNearby(userPos, mapInstance.current);
    }
  }, [searchType, radius, userPos, mapLoaded, searchNearby]);

  const openInMaps = (place: Place) => {
    const lat = typeof place.geometry.location.lat === 'function'
      ? (place.geometry.location.lat as unknown as () => number)()
      : place.geometry.location.lat;
    const lng = typeof place.geometry.location.lng === 'function'
      ? (place.geometry.location.lng as unknown as () => number)()
      : place.geometry.location.lng;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${place.place_id}`, '_blank');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex rounded-lg overflow-hidden border border-green-300">
          {(Object.keys(SEARCH_CONFIGS) as SearchType[]).map(type => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors',
                searchType === type
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-green-700 hover:bg-green-50',
              ].join(' ')}
            >
              {SEARCH_CONFIGS[type].icon} {SEARCH_CONFIGS[type].label}
            </button>
          ))}
        </div>

        <select
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          className="text-sm border border-green-300 rounded-lg px-3 py-2 text-green-700 bg-white"
        >
          <option value={500}>500 公尺內</option>
          <option value={1000}>1 公里內</option>
          <option value={2000}>2 公里內</option>
          <option value={5000}>5 公里內</option>
        </select>

        <button
          onClick={() => userPos ? (mapInstance.current ? searchNearby(userPos, mapInstance.current) : initMap(userPos)) : locate()}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '搜尋中...' : userPos ? '重新搜尋' : '取得位置並搜尋'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-72 rounded-xl border border-green-200 bg-gray-100 mb-4 overflow-hidden"
        style={{ minHeight: '280px' }}
      >
        {!mapLoaded && !error && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm">載入地圖中...</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected place detail */}
      {selectedPlace && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-green-800 text-base">{selectedPlace.name}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{selectedPlace.vicinity}</p>
              {selectedPlace.rating && (
                <p className="text-sm text-amber-600 mt-0.5">
                  ★ {selectedPlace.rating} ({selectedPlace.user_ratings_total} 則評論)
                </p>
              )}
              {selectedPlace.opening_hours?.open_now !== undefined && (
                <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${selectedPlace.opening_hours.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {selectedPlace.opening_hours.open_now ? '營業中' : '休息中'}
                </span>
              )}
            </div>
            <button
              onClick={() => openInMaps(selectedPlace)}
              className="ml-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 whitespace-nowrap"
            >
              導航
            </button>
          </div>
        </div>
      )}

      {/* Place list */}
      {places.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {places.map((place, idx) => (
            <button
              key={place.place_id}
              onClick={() => setSelectedPlace(place)}
              className={[
                'w-full text-left p-3 rounded-xl border transition-all',
                selectedPlace?.place_id === place.place_id
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${searchType === 'vegetarian' ? 'bg-green-600' : 'bg-blue-600'}`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">{place.name}</p>
                  <p className="text-xs text-gray-500 truncate">{place.vicinity}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {place.rating && (
                    <p className="text-xs text-amber-500 font-medium">★ {place.rating}</p>
                  )}
                  {place.distance && (
                    <p className="text-xs text-gray-400">
                      {place.distance >= 1000 ? `${(place.distance / 1000).toFixed(1)}km` : `${place.distance}m`}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
