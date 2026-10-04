import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
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

function PropertyMap() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/properties"
        );

        const result = await response.json();

        if (result.success) {
          setProperties(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const defaultPosition: [number, number] = [19.455, 72.798];

  return (
    <MapContainer
      center={defaultPosition}
      zoom={13}
      scrollWheelZoom={true}
      className="property-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {properties.map((property) => {
        const [longitude, latitude] = property.location.coordinates;

        return (
          <Marker
            key={property._id}
            position={[latitude, longitude]}
            icon={propertyIcon}
          >
            <Popup>
              <strong>{property.propertyName}</strong>
              <br />
              {property.address}
              <br />
              <br />

              <strong>Status:</strong> {property.status}
              <br />

              <strong>Current Value:</strong>{" "}
              ₹{property.valuation.currentValue.toLocaleString("en-IN")}
              <br />

              <strong>Valuation Date:</strong>{" "}
              {new Date(
                property.valuation.valuationDate
              ).toLocaleDateString("en-IN")}
            </Popup>
          </Marker>
        );
      })}

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
  );
}

export default PropertyMap;