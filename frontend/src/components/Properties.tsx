import { useEffect, useState } from "react";
import PropertyDetails from "./PropertyDetails";

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

interface PropertiesProps {
  onPropertiesChanged: () => void;
}

function Properties({
  onPropertiesChanged,
}: PropertiesProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] =
    useState<Property | null>(null);

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

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertyUpdated = (
    updatedProperty: Property
  ) => {
    setProperties((currentProperties) =>
      currentProperties.map((property) =>
        property._id === updatedProperty._id
          ? updatedProperty
          : property
      )
    );

    setSelectedProperty(updatedProperty);

    onPropertiesChanged();
  };

  const handlePropertyDeleted = (propertyId: string) => {
    setProperties((currentProperties) =>
      currentProperties.filter(
        (property) => property._id !== propertyId
      )
    );

    onPropertiesChanged();
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <section
        className="properties-section"
        id="properties"
      >
        <h2>Properties</h2>

        <p>Loading properties...</p>
      </section>
    );
  }

  return (
    <>
      <section
        className="properties-section"
        id="properties"
      >
        <div className="properties-header">
          <div>
            <p className="subtitle">
              PROPERTY DATABASE
            </p>

            <h2>Properties</h2>

            <p>
              View all properties and their latest valuation
              details.
            </p>
          </div>

          <span className="property-count">
            {properties.length} Properties
          </span>
        </div>

        <div className="properties-table-wrapper">
          <table className="properties-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Location</th>
                <th>Status</th>
                <th>Current Value</th>
                <th>Valuation Date</th>
              </tr>
            </thead>

            <tbody>
              {properties.map((property) => (
                <tr
                  key={property._id}
                  onClick={() =>
                    setSelectedProperty(property)
                  }
                  className="property-row"
                >
                  <td>
                    <strong>
                      {property.propertyName}
                    </strong>

                    <span>
                      {property.address}
                    </span>
                  </td>

                  <td>
                    {property.city}, {property.state}
                  </td>

                  <td>
                    <span
                      className={`status-badge ${property.status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {property.status}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {formatValue(
                        property.valuation.currentValue
                      )}
                    </strong>
                  </td>

                  <td>
                    {new Date(
                      property.valuation.valuationDate
                    ).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {properties.length === 0 && (
          <div className="empty-properties">
            <h3>No properties found</h3>

            <p>
              Add your first property to get started.
            </p>
          </div>
        )}
      </section>

      {selectedProperty && (
        <PropertyDetails
          property={selectedProperty}
          onClose={() =>
            setSelectedProperty(null)
          }
          onPropertyUpdated={
            handlePropertyUpdated
          }
          onPropertyDeleted={
            handlePropertyDeleted
          }
        />
      )}
    </>
  );
}

export default Properties;