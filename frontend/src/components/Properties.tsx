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

  status:
    | "Completed"
    | "Under Construction"
    | "Pending";

  valuation: {
    currentValue: number;
    previousValue?: number;
    valuationDate: string;
  };

  notes?: string;
}

type StatusFilter =
  | "All"
  | "Completed"
  | "Under Construction"
  | "Pending";

interface PropertiesProps {
  onPropertiesChanged: () => void;
  selectedStatus?: StatusFilter;
}

function Properties({
  onPropertiesChanged,
  selectedStatus,
}: PropertiesProps) {
  const [properties, setProperties] =
    useState<Property[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedProperty, setSelectedProperty] =
    useState<Property | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(
      selectedStatus ?? "All"
    );

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
        const validProperties = result.data.filter(
          (
            property: Property | undefined
          ): property is Property =>
            property !== undefined &&
            property !== null &&
            typeof property.propertyName ===
              "string"
        );

        setProperties(validProperties);
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error(
        "Failed to fetch properties:",
        error
      );

      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedStatus) {
      setStatusFilter(selectedStatus);
    }
  }, [selectedStatus]);

  const handlePropertyUpdated = (
    updatedProperty: Property
  ) => {
    setProperties(
      (currentProperties) =>
        currentProperties.map((property) =>
          property._id ===
          updatedProperty._id
            ? updatedProperty
            : property
        )
    );

    setSelectedProperty(updatedProperty);

    onPropertiesChanged();
  };

  const handlePropertyDeleted = (
    propertyId: string
  ) => {
    setProperties(
      (currentProperties) =>
        currentProperties.filter(
          (property) =>
            property._id !== propertyId
        )
    );

    setSelectedProperty(null);

    onPropertiesChanged();
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const filteredProperties =
    properties.filter((property) => {
      if (!property) {
        return false;
      }

      const search = searchTerm
        .trim()
        .toLowerCase();

      const matchesSearch =
        !search ||
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
          .includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        property.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  if (loading) {
    return (
      <section
        className="properties-section"
        id="properties"
      >
        <h2>Properties</h2>

        <p>
          Loading properties...
        </p>
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
              View all properties and their
              latest valuation details.
            </p>
          </div>

          <span className="property-count">
            {filteredProperties.length} of{" "}
            {properties.length} Properties
          </span>
        </div>

        <div className="property-search">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Search by property name, address, city, district or state..."
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
              className="clear-search"
            >
              ×
            </button>
          )}
        </div>

        <div className="property-filters">
          <span className="filter-label">
            Filter by status:
          </span>

          <div className="filter-buttons">
            {(
              [
                "All",
                "Completed",
                "Under Construction",
                "Pending",
              ] as StatusFilter[]
            ).map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-button ${
                  statusFilter === status
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setStatusFilter(status)
                }
              >
                {status}
              </button>
            ))}
          </div>

          {(searchTerm ||
            statusFilter !== "All") && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}
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
              {filteredProperties.map(
                (property) => (
                  <tr
                    key={property._id}
                    onClick={() =>
                      setSelectedProperty(
                        property
                      )
                    }
                    className="property-row"
                  >
                    <td>
                      <strong>
                        {
                          property.propertyName
                        }
                      </strong>

                      <span>
                        {property.address}
                      </span>
                    </td>

                    <td>
                      {property.city},{" "}
                      {property.state}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${property.status
                          .toLowerCase()
                          .replaceAll(
                            " ",
                            "-"
                          )}`}
                      >
                        {property.status}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {formatValue(
                          property.valuation
                            .currentValue
                        )}
                      </strong>
                    </td>

                    <td>
                      {new Date(
                        property.valuation
                          .valuationDate
                      ).toLocaleDateString(
                        "en-IN"
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredProperties.length ===
          0 && (
          <div className="empty-properties">
            <h3>
              No properties found
            </h3>

            <p>
              Try changing your search or
              status filter.
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