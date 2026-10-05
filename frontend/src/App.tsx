import { useEffect, useState } from "react";
import PropertyMap from "./components/PropertyMap";
import AddProperty from "./components/AddProperty";
import Properties from "./components/Properties";

type StatusFilter =
  | "All"
  | "Completed"
  | "Under Construction"
  | "Pending";

interface Property {
  _id: string;
  status:
    | "Completed"
    | "Under Construction"
    | "Pending";
}

function App() {
  const [properties, setProperties] =
    useState<Property[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showAddProperty, setShowAddProperty] =
    useState(false);

  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilter>("All");

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
      console.error(
        "Failed to fetch properties:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const totalProperties =
    properties.length;

  const completedProperties =
    properties.filter(
      (property) =>
        property.status === "Completed"
    ).length;

  const underConstructionProperties =
    properties.filter(
      (property) =>
        property.status ===
        "Under Construction"
    ).length;

  const pendingProperties =
    properties.filter(
      (property) =>
        property.status === "Pending"
    ).length;

  const handleStatusCardClick = (
    status: StatusFilter
  ) => {
    setSelectedStatus(status);

    setTimeout(() => {
      document
        .getElementById("properties")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          ValueMap
        </div>

        <nav>
          <a href="#dashboard">
            Dashboard
          </a>

          <a href="#properties">
            Properties
          </a>

          <a href="#map">
            Map
          </a>
        </nav>
      </header>

      <main
        className="dashboard"
        id="dashboard"
      >
        <section className="hero">
          <div>
            <p className="subtitle">
              PROPERTY VALUATION MANAGEMENT
            </p>

            <h1>
              Welcome to ValueMap
            </h1>

            <p className="description">
              Manage properties, locations,
              valuations, and property
              history from one place.
            </p>
          </div>

          <button
            className="add-button"
            onClick={() =>
              setShowAddProperty(true)
            }
          >
            + Add Property
          </button>
        </section>

        <section className="stats">

          <div
            className={`stat-card ${
              selectedStatus === "All"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleStatusCardClick(
                "All"
              )
            }
          >
            <span>
              Total Properties
            </span>

            <strong>
              {loading
                ? "..."
                : totalProperties}
            </strong>
          </div>

          <div
            className={`stat-card ${
              selectedStatus === "Completed"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleStatusCardClick(
                "Completed"
              )
            }
          >
            <span>
              Completed
            </span>

            <strong>
              {loading
                ? "..."
                : completedProperties}
            </strong>
          </div>

          <div
            className={`stat-card ${
              selectedStatus ===
              "Under Construction"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleStatusCardClick(
                "Under Construction"
              )
            }
          >
            <span>
              Under Construction
            </span>

            <strong>
              {loading
                ? "..."
                : underConstructionProperties}
            </strong>
          </div>

          <div
            className={`stat-card ${
              selectedStatus === "Pending"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleStatusCardClick(
                "Pending"
              )
            }
          >
            <span>
              Pending
            </span>

            <strong>
              {loading
                ? "..."
                : pendingProperties}
            </strong>
          </div>

        </section>

        <section
          className="map-container"
          id="map"
        >
          <PropertyMap />
        </section>

        <Properties
          onPropertiesChanged={
            fetchProperties
          }
          selectedStatus={
            selectedStatus
          }
        />
      </main>

      {showAddProperty && (
        <AddProperty
          onClose={() =>
            setShowAddProperty(false)
          }
          onPropertyAdded={
            fetchProperties
          }
        />
      )}
    </div>
  );
}

export default App;