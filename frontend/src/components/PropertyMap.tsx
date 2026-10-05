import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

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

const propertyIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapControllerProps {
  property: Property | null;
}

function MapController({
  property,
}: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!property) {
      return;
    }

    const [longitude, latitude] =
      property.location.coordinates;

    map.setView(
      [latitude, longitude],
      16,
      {
        animate: true,
      }
    );
  }, [property, map]);

  return null;
}

function PropertyMap() {
  const [properties, setProperties] =
    useState<Property[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedProperty, setSelectedProperty] =
    useState<Property | null>(null);

  const [mapType, setMapType] =
    useState<"street" | "satellite">(
      "street"
    );

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/properties"
        );

        const result = await response.json();

        if (
          result.success &&
          Array.isArray(result.data)
        ) {
          setProperties(result.data);
        }
      } catch (error) {
        console.error(
          "Failed to fetch properties:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const defaultPosition: [number, number] = [
    19.455,
    72.798,
  ];

  const search = searchTerm
    .trim()
    .toLowerCase();

  const filteredProperties =
    properties.filter((property) => {
      if (!search) {
        return true;
      }

      return (
        property.propertyName
          .toLowerCase()
          .includes(search) ||
        property.address
          .toLowerCase()
          .includes(search) ||
        property.city
          .toLowerCase()
          .includes(search) ||
        property.district
          ?.toLowerCase()
          .includes(search) ||
        property.state
          .toLowerCase()
          .includes(search)
      );
    });

  return (
    <div className="property-map-wrapper">

      {/* Map Search */}
      <div className="map-search">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          placeholder="Search property, address, city, district or state..."
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedProperty(null);
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchTerm &&
        filteredProperties.length > 0 && (
          <div className="map-search-results">
            {filteredProperties
              .slice(0, 5)
              .map((property) => (
                <button
                  type="button"
                  key={property._id}
                  onClick={() =>
                    setSelectedProperty(property)
                  }
                >
                  <strong>
                    {property.propertyName}
                  </strong>

                  <span>
                    {property.city},{" "}
                    {property.state}
                  </span>
                </button>
              ))}
          </div>
        )}

      {/* No Search Results */}
      {searchTerm &&
        filteredProperties.length === 0 && (
          <div className="map-search-empty">
            No properties found.
          </div>
        )}

      <MapContainer
        center={defaultPosition}
        zoom={13}
        scrollWheelZoom={true}
        className="property-map"
      >

        {/* Map Layer */}
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

        {/* Map / Satellite Control */}
        <div className="map-type-control">

          <button
            type="button"
            className={
              mapType === "street"
                ? "active"
                : ""
            }
            onClick={() =>
              setMapType("street")
            }
          >
            Map
          </button>

          <button
            type="button"
            className={
              mapType === "satellite"
                ? "active"
                : ""
            }
            onClick={() =>
              setMapType("satellite")
            }
          >
            Satellite
          </button>

        </div>

        {/* Map Controller */}
        <MapController
          property={selectedProperty}
        />

        {/* Property Markers */}
        {filteredProperties.map((property) => {
          const [
            longitude,
            latitude,
          ] = property.location.coordinates;

          return (
            <Marker
              key={property._id}
              position={[
                latitude,
                longitude,
              ]}
              icon={propertyIcon}
            >
              <Popup>

                <strong>
                  {property.propertyName}
                </strong>

                <br />

                {property.address}

                <br />

                {property.city},{" "}
                {property.state}

                <br />
                <br />

                <strong>
                  Status:
                </strong>{" "}
                {property.status}

                <br />

                <strong>
                  Current Value:
                </strong>{" "}
                ₹
                {property.valuation.currentValue.toLocaleString(
                  "en-IN"
                )}

                <br />

                <strong>
                  Valuation Date:
                </strong>{" "}
                {new Date(
                  property.valuation.valuationDate
                ).toLocaleDateString(
                  "en-IN"
                )}

              </Popup>
            </Marker>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 1000,
              background: "white",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            Loading properties...
          </div>
        )}

      </MapContainer>
    </div>
  );
}

export default PropertyMap;