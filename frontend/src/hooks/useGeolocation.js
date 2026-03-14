import { useState } from 'react';

export default function useGeolocation() {
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const mapGeolocationError = (err) => {
    if (!err) return 'Unable to fetch your location.';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location permission denied. Allow location in browser settings, or set the pin manually.';
      case err.POSITION_UNAVAILABLE:
        return 'Location is unavailable right now. Please move the pin manually.';
      case err.TIMEOUT:
        return 'Location request timed out. Try again, or set the pin manually.';
      default:
        return err.message || 'Unable to fetch your location.';
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!window.isSecureContext && !isLocalhost) {
      setError('Current location works only on HTTPS. Open the site with https:// or set the pin manually.');
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(mapGeolocationError(err));
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  return { coords, error, loading, getLocation };
}
