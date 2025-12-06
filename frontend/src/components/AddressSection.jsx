import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox Token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3RlaW4xMjMiLCJhIjoiY21ocTVwam9xMGE4aTJrczd4MW9yNTYzbyJ9.d2rHs6GWcZRkgdD6FAQaMA';

const MapSection = ({ coordinates }) => {
  const mapContainer = React.useRef(null);
  const map = React.useRef(null);

  React.useEffect(() => {
    if (map.current) return; // initialize map only once
    if (!coordinates || coordinates.length === 0) return;

    const center = coordinates[0]; // Default to first coordinate

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom: 11
    });

    // Add markers
    coordinates.forEach(coord => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(
        `${coord.source}: ${coord.description || 'Location'}`
      );

      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([coord.lng, coord.lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Fit bounds if multiple points
    if (coordinates.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend([coord.lng, coord.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
    }

  }, [coordinates]);

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

const InfoRow = ({ label, value, sensitive = false }) => {
  const [showSensitive, setShowSensitive] = React.useState(false);

  if (!value || value === 'N/A' || value === 'null' || value === '') return null;

  const displayValue = sensitive && !showSensitive ? '••••••••' : value;

  return (
    <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground text-right max-w-xs break-words">{displayValue}</span>
        {sensitive && (
          <button
            onClick={() => setShowSensitive(!showSensitive)}
            className="text-xs text-primary hover:underline"
          >
            {showSensitive ? '隐藏' : '显示'}
          </button>
        )}
      </div>
    </div>
  );
};

const AddressSection = ({ address, location, data }) => {
  if (!address.full_address && !address.city && !address.state && (!location.coordinates || location.coordinates.length === 0)) {
    return null;
  }

  return (
    <div className="border-b border-border pb-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        地址信息
      </h2>

      {/* Map Display */}
      {location.coordinates && location.coordinates.length > 0 && (
          <div className="mb-6">
              <MapSection coordinates={location.coordinates} />
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {address.full_address && address.full_address !== 'N/A' && (
          <div className="md:col-span-2">
            <InfoRow label="完整地址" value={address.full_address} />
          </div>
        )}
        <InfoRow label="城市" value={address.city} />
        <InfoRow label="州" value={address.state} />
        <InfoRow label="邮编" value={address.postcode} />
        <InfoRow label="行政区" value={address.district} />
        <InfoRow label="国家" value={address.country} />
        {/* Display coordinates from data.user_profile */}
        {(() => {
          const userProfile = data?.user_profile || {};
          const lat = userProfile.latitude;
          const lon = userProfile.longitude;

          if (lat || lon) {
            return (
              <div className="md:col-span-2">
                <InfoRow
                  label="坐标经纬度"
                  value={
                    <span className="flex items-center gap-2">
                      <span>纬度: {lat}, 经度: {lon}</span>
                      {lat && lon && (
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lon}&t=k`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                          title="在 Google 卫星地图中查看"
                        >
                          (🛰️ 卫星地图查看)
                        </a>
                      )}
                    </span>
                  }
                />
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

export default AddressSection;
