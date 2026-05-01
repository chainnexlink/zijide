import { useState, useEffect, useCallback, useRef } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface GeolocationState {
  location: Location | null;
  error: string | null;
  loading: boolean;
  permission: PermissionState | null;
}

export function useGeolocation(options?: PositionOptions) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
    permission: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const permissionRef = useRef<PermissionStatus | null>(null);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'locationNotSupported', loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          error: null,
          loading: false,
          permission: 'granted' as PermissionState,
        });
      },
      (error) => {
        let errorMessage = 'locationError';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'locationPermissionDenied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'locationUnavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'locationTimeout';
            break;
        }
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options,
      }
    );
  }, [options]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          error: null,
          loading: false,
          permission: 'granted' as PermissionState,
        });
      },
      (error) => {
        let errorMessage = 'locationError';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'locationPermissionDenied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'locationUnavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'locationTimeout';
            break;
        }
        setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        ...options,
      }
    );
  }, [options]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      getCurrentPosition();
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      permissionRef.current = result;
      setState(prev => ({ ...prev, permission: result.state }));

      if (result.state === 'granted') {
        getCurrentPosition();
      } else if (result.state === 'prompt') {
        getCurrentPosition();
      }

      result.addEventListener('change', () => {
        setState(prev => ({ ...prev, permission: result.state }));
        if (result.state === 'granted') {
          getCurrentPosition();
        }
      });
    } catch {
      getCurrentPosition();
    }
  }, [getCurrentPosition]);

  useEffect(() => {
    requestPermission();
    return () => stopWatching();
  }, [requestPermission, stopWatching]);

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const getDirection = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((brng + 360) % 360) / 45) % 8;
    return directions[index];
  }, []);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission,
    calculateDistance,
    getDirection,
  };
}
