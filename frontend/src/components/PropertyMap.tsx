import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression } from "leaflet";

import "leaflet/dist/leaflet.css";

interface Property {
  _id: string;
  propertyName: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  status: "Completed" | "Under Construction" | "Pending";
  valuation: {
    currentValue: number;
    previousValue?: number;
    valuationDate: string;
  };
  notes?: string;
}

type MapType = "street" | "satellite";
type StatusFilter = "All" | Property["status"];

const DEFAULT_POSITION: [number, number] = [19.455, 72.798];
const DEFAULT_ZOOM = 13;

const STATUS_MARKER_COLORS: Record<Property["status"], string> = {
  Completed: "#16a34a",
  "Under Construction": "#f59e0b",
  Pending: "#dc2626",
};

const statusIcons: Record<Property["status"], L.DivIcon> = {
  Completed: L.divIcon({
    className: "valuemap-status-marker",
    html: `<span class="valuemap-marker-pin" style="--marker-color:${STATUS_MARKER_COLORS.Completed}"><span></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  }),
  "Under Construction": L.divIcon({
    className: "valuemap-status-marker",
    html: `<span class="valuemap-marker-pin" style="--marker-color:${STATUS_MARKER_COLORS["Under Construction"]}"><span></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  }),
  Pending: L.divIcon({
    className: "valuemap-status-marker",
    html: `<span class="valuemap-marker-pin" style="--marker-color:${STATUS_MARKER_COLORS.Pending}"><span></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38],
  }),
};

function hasValidCoordinates(property: Property): boolean {
  const coordinates = property?.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return false;
  }

  const [longitude, latitude] = coordinates;

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

interface MapControllerProps {
  property: Property | null;
}

function MapController({ property }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!property || !hasValidCoordinates(property)) {
      return;
    }

    const [longitude, latitude] = property.location.coordinates;
    map.flyTo([latitude, longitude], 16, { animate: true, duration: 0.7 });
  }, [property, map]);

  return null;
}

interface FitBoundsControllerProps {
  properties: Property[];
  fitRequest: number;
}

function FitBoundsController({
  properties,
  fitRequest,
}: FitBoundsControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (fitRequest === 0 || properties.length === 0) {
      return;
    }

    const positions: LatLngBoundsExpression = properties.map((property) => {
      const [longitude, latitude] = property.location.coordinates;
      return [latitude, longitude];
    });

    if (positions.length === 1) {
      map.flyTo(positions[0] as [number, number], 16, {
        animate: true,
        duration: 0.7,
      });
      return;
    }

    map.fitBounds(positions, {
      padding: [40, 40],
      maxZoom: 15,
      animate: true,
    });
  }, [properties, fitRequest, map]);

  return null;
}

function PropertyMap() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapType, setMapType] = useState<MapType>("street");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [fitRequest, setFitRequest] = useState(0);
  const [resetRequest, setResetRequest] = useState(0);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoadError("");
        const response = await fetch("http://localhost:5000/api/properties");

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          setProperties(result.data);
        } else {
          throw new Error(result.message || "Unexpected response from the server.");
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
        setLoadError("Couldn't load properties. Check that the backend is running and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const validProperties = useMemo(
    () => properties.filter(hasValidCoordinates),
    [properties]
  );

  const search = searchTerm.trim().toLowerCase();

  const filteredProperties = useMemo(
    () =>
      validProperties.filter((property) => {
        const matchesSearch =
          !search ||
          property.propertyName?.toLowerCase().includes(search) ||
          property.address?.toLowerCase().includes(search) ||
          property.city?.toLowerCase().includes(search) ||
          property.district?.toLowerCase().includes(search) ||
          property.state?.toLowerCase().includes(search);

        const matchesStatus =
          statusFilter === "All" || property.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [validProperties, search, statusFilter]
  );

  const handleResetMap = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSelectedProperty(null);
    setResetRequest((current) => current + 1);
  };

  const selectedIsVisible =
    selectedProperty &&
    filteredProperties.some((property) => property._id === selectedProperty._id);

  return (
    <div className="property-map-wrapper">
      <div className="map-search">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setSelectedProperty(null);
          }}
          placeholder="Search property, address, city, district or state..."
          aria-label="Search properties on map"
        />

        {searchTerm && (
          <button
            type="button"
            aria-label="Clear map search"
            onClick={() => {
              setSearchTerm("");
              setSelectedProperty(null);
            }}
          >
            ×
          </button>
        )}
      </div>

      <div className="map-ux-toolbar">
        <label className="map-status-filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setSelectedProperty(null);
            }}
            aria-label="Filter properties by status"
          >
            <option value="All">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Under Construction">Under Construction</option>
            <option value="Pending">Pending</option>
          </select>
        </label>

        <span className="map-result-count" aria-live="polite">
          Showing {filteredProperties.length} of {properties.length} properties
        </span>

        <div className="map-navigation-actions">
          <button
            type="button"
            onClick={() => {
              setSelectedProperty(null);
              setFitRequest((current) => current + 1);
            }}
            disabled={filteredProperties.length === 0}
          >
            Fit All Properties
          </button>
          <button type="button" onClick={handleResetMap}>
            Reset Map
          </button>
        </div>
      </div>

      {searchTerm && filteredProperties.length > 0 && (
        <div className="map-search-results">
          {filteredProperties.slice(0, 5).map((property) => (
            <button
              type="button"
              key={property._id}
              onClick={() => setSelectedProperty(property)}
            >
              <strong>{property.propertyName}</strong>
              <span>
                {property.city}, {property.state}
              </span>
            </button>
          ))}
        </div>
      )}

      {searchTerm && filteredProperties.length === 0 && (
        <div className="map-search-empty">
          No properties match your search and selected status.
        </div>
      )}

      {loadError && (
        <div className="map-load-error" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      <MapContainer
        center={DEFAULT_POSITION}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="property-map"
      >
        {mapType === "street" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        <div className="map-type-control">
          <button
            type="button"
            className={mapType === "street" ? "active" : ""}
            onClick={() => setMapType("street")}
            aria-pressed={mapType === "street"}
          >
            Map
          </button>
          <button
            type="button"
            className={mapType === "satellite" ? "active" : ""}
            onClick={() => setMapType("satellite")}
            aria-pressed={mapType === "satellite"}
          >
            Satellite
          </button>
        </div>

        <div className="map-marker-legend" aria-label="Property status marker legend">
          <strong>Property Status</strong>
          <span><i className="map-legend-dot completed" />Completed</span>
          <span><i className="map-legend-dot construction" />Under Construction</span>
          <span><i className="map-legend-dot pending" />Pending</span>
        </div>

        <MapController property={selectedIsVisible ? selectedProperty : null} />
        <FitBoundsController
          properties={filteredProperties}
          fitRequest={fitRequest}
        />

        {resetRequest > 0 && (
          <ResetMapController resetRequest={resetRequest} />
        )}

        {filteredProperties.map((property) => {
          const [longitude, latitude] = property.location.coordinates;

          return (
            <Marker
              key={property._id}
              position={[latitude, longitude]}
              icon={statusIcons[property.status] || statusIcons.Pending}
              eventHandlers={{
                click: () => setSelectedProperty(property),
              }}
            >
              <Popup>
                <div className="property-map-popup">
                  <strong>{property.propertyName}</strong>
                  <p>{property.address}</p>
                  <p>
                    {property.city}
                    {property.district ? `, ${property.district}` : ""},{" "}
                    {property.state}
                  </p>
                  <p>
                    <strong>Status:</strong> {property.status}
                  </p>
                  <p>
                    <strong>Current Value:</strong>{" "}
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(property.valuation.currentValue)}
                  </p>
                  <p>
                    <strong>Valuation Date:</strong>{" "}
                    {new Date(property.valuation.valuationDate).toLocaleDateString("en-IN")}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps ↗
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {loading && (
          <div className="map-loading-indicator">
            Loading properties...
          </div>
        )}
      </MapContainer>
    </div>
  );
}

interface ResetMapControllerProps {
  resetRequest: number;
}

function ResetMapController({ resetRequest }: ResetMapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (resetRequest > 0) {
      map.flyTo(DEFAULT_POSITION, DEFAULT_ZOOM, {
        animate: true,
        duration: 0.7,
      });
    }
  }, [resetRequest, map]);

  return null;
}

export default PropertyMap;
