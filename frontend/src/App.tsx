
import { useEffect, useRef, useState } from "react";
import PropertyMap from "./components/PropertyMap";
import AddProperty from "./components/AddProperty";
import Properties from "./components/Properties";

const API_URL = "http://localhost:5000/api/properties";

type StatusFilter =
  | "All"
  | "Completed"
  | "Under Construction"
  | "Pending";

type PropertyStatus =
  | "Completed"
  | "Under Construction"
  | "Pending";

interface Property {
  _id: string;
  status: PropertyStatus;
}

interface ImportProperty {
  propertyName: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  status: PropertyStatus;
  valuation: {
    currentValue: number;
    previousValue?: number;
    valuationDate: string;
  };
  notes?: string;
  photos: string[];
}

interface RejectedRow {
  row: number;
  reason: string;
}

interface ImportPreview {
  message: string;
  totalDataRows: number;
  validRows: number;
  rejectedCount: number;
  preview: ImportProperty[];
  properties: ImportProperty[];
  rejectedRows: RejectedRow[];
}

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilter>("All");

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importPreview, setImportPreview] =
    useState<ImportPreview | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [showImport, setShowImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProperties = async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();

      if (response.ok && result.success) {
        setProperties(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const response = await fetch(`${API_URL}/export/excel`);

      if (!response.ok) {
        throw new Error("Failed to export properties");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "valuemap-properties.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Excel export failed:", error);
      alert(
        "Failed to export properties. Check that the backend is running."
      );
    } finally {
      setExporting(false);
    }
  };

  const handlePreviewExcel = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    setImportPreview(null);
    setImportMessage("");
    setImportError("");

    if (!file) return;

    const allowedExtensions = [".xlsx", ".xlsm"];
    const extension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setImportError("Please select an .xlsx or .xlsm file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImportError("The file must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setImporting(true);

      const response = await fetch(`${API_URL}/import/preview`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const details = result.missingFields?.length
          ? ` Missing columns: ${result.missingFields.join(", ")}.`
          : "";

        throw new Error(
          `${result.message || "Unable to preview Excel file."}${details}`
        );
      }

      setImportPreview(result as ImportPreview);
      setImportMessage("Preview ready. No properties have been saved.");
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to preview the Excel file."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.properties.length === 0) {
      setImportError("There are no valid records to import.");
      return;
    }

    const approved = window.confirm(
      `Import ${importPreview.properties.length} valid properties into ValueMap? Existing matching properties will be skipped.`
    );

    if (!approved) return;

    try {
      setConfirmingImport(true);
      setImportError("");
      setImportMessage("");

      const response = await fetch(`${API_URL}/import/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: importPreview.properties,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import failed.");
      }

      setImportMessage(
        `Import finished: ${result.importedCount} imported, ${result.skippedCount} skipped.`
      );

      setImportPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await fetchProperties();
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to import properties."
      );
    } finally {
      setConfirmingImport(false);
    }
  };

  const closeImport = () => {
    setShowImport(false);
    setImportPreview(null);
    setImportMessage("");
    setImportError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const totalProperties = properties.length;

  const completedProperties = properties.filter(
    (property) => property.status === "Completed"
  ).length;

  const underConstructionProperties = properties.filter(
    (property) => property.status === "Under Construction"
  ).length;

  const pendingProperties = properties.filter(
    (property) => property.status === "Pending"
  ).length;

  const handleStatusCardClick = (status: StatusFilter) => {
    setSelectedStatus(status);

    window.setTimeout(() => {
      document.getElementById("properties")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">ValueMap</div>

        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#properties">Properties</a>
          <a href="#map">Map</a>
        </nav>
      </header>

      <main className="dashboard" id="dashboard">
        <section className="hero">
          <div>
            <p className="subtitle">
              PROPERTY VALUATION MANAGEMENT
            </p>

            <h1>Welcome to ValueMap</h1>

            <p className="description">
              Manage properties, locations, valuations, and
              property history from one place.
            </p>
          </div>

          <div className="hero-actions">
            <button
              className="export-button"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "↓ Export to Excel"}
            </button>

            <button
              className="export-button"
              onClick={() => {
                setShowImport(true);
                setImportError("");
                setImportMessage("");
              }}
            >
              ↑ Import from Excel
            </button>

            <button
              className="add-button"
              onClick={() => setShowAddProperty(true)}
            >
              + Add Property
            </button>
          </div>
        </section>

        {showImport && (
          <section className="import-panel">
            <div className="import-panel-header">
              <div>
                <h2>Import Properties</h2>
                <p>
                  Upload an Excel valuation sheet to review its
                  records before importing.
                </p>
              </div>

              <button
                className="import-close-button"
                onClick={closeImport}
                disabled={importing || confirmingImport}
                aria-label="Close import panel"
              >
                ×
              </button>
            </div>

            <label className="import-file-label" htmlFor="excel-file">
              Choose Excel file (.xlsx or .xlsm)
            </label>

            <input
              ref={fileInputRef}
              id="excel-file"
              type="file"
              accept=".xlsx,.xlsm"
              onChange={handlePreviewExcel}
              disabled={importing || confirmingImport}
            />

            <p className="import-help">
              Maximum size: 10 MB. Your file must contain property
              names, addresses, city, state, latitude, longitude,
              current value, and valuation date.
            </p>

            {importing && (
              <p className="import-info">
                Reading and validating your Excel file...
              </p>
            )}

            {importMessage && (
              <p className="import-success" role="status">
                {importMessage}
              </p>
            )}

            {importError && (
              <p className="import-error" role="alert">
                {importError}
              </p>
            )}

            {importPreview && (
              <div className="import-results">
                <div className="import-summary">
                  <div>
                    <span>Total rows</span>
                    <strong>{importPreview.totalDataRows}</strong>
                  </div>

                  <div>
                    <span>Valid rows</span>
                    <strong>{importPreview.validRows}</strong>
                  </div>

                  <div>
                    <span>Rejected rows</span>
                    <strong>{importPreview.rejectedCount}</strong>
                  </div>
                </div>

                <h3>Preview (up to 10 records)</h3>

                <div className="import-table-wrapper">
                  <table className="import-table">
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>Current Value</th>
                        <th>Valuation Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {importPreview.preview.map((property, index) => (
                        <tr
                          key={`${property.propertyName}-${property.address}-${index}`}
                        >
                          <td>{property.propertyName}</td>
                          <td>{property.address}</td>
                          <td>{property.city}</td>
                          <td>
                            {property.valuation.currentValue.toLocaleString(
                              "en-IN",
                              {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }
                            )}
                          </td>
                          <td>
                            {new Date(
                              property.valuation.valuationDate
                            ).toLocaleDateString("en-IN")}
                          </td>
                          <td>{property.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.rejectedRows.length > 0 && (
                  <>
                    <h3>Rejected rows</h3>

                    <ul className="rejected-rows">
                      {importPreview.rejectedRows.map((row) => (
                        <li key={`${row.row}-${row.reason}`}>
                          Row {row.row}: {row.reason}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <p className="import-help">
                  Only valid rows will be submitted. Existing matching
                  properties may be skipped by the backend.
                </p>

                <button
                  className="add-button import-confirm-button"
                  onClick={handleConfirmImport}
                  disabled={
                    confirmingImport ||
                    importing ||
                    importPreview.properties.length === 0
                  }
                >
                  {confirmingImport
                    ? "Importing..."
                    : `Confirm Import (${importPreview.properties.length})`}
                </button>
              </div>
            )}
          </section>
        )}

        <section className="stats">
          <div
            className={`stat-card ${
              selectedStatus === "All" ? "active" : ""
            }`}
            onClick={() => handleStatusCardClick("All")}
          >
            <span>Total Properties</span>
            <strong>{loading ? "..." : totalProperties}</strong>
          </div>

          <div
            className={`stat-card ${
              selectedStatus === "Completed" ? "active" : ""
            }`}
            onClick={() => handleStatusCardClick("Completed")}
          >
            <span>Completed</span>
            <strong>{loading ? "..." : completedProperties}</strong>
          </div>

          <div
            className={`stat-card ${
              selectedStatus === "Under Construction" ? "active" : ""
            }`}
            onClick={() =>
              handleStatusCardClick("Under Construction")
            }
          >
            <span>Under Construction</span>
            <strong>
              {loading ? "..." : underConstructionProperties}
            </strong>
          </div>

          <div
            className={`stat-card ${
              selectedStatus === "Pending" ? "active" : ""
            }`}
            onClick={() => handleStatusCardClick("Pending")}
          >
            <span>Pending</span>
            <strong>{loading ? "..." : pendingProperties}</strong>
          </div>
        </section>

        <section className="map-container" id="map">
          <PropertyMap />
        </section>

        <Properties
          onPropertiesChanged={fetchProperties}
          selectedStatus={selectedStatus}
        />
      </main>

      {showAddProperty && (
        <AddProperty
          onClose={() => setShowAddProperty(false)}
          onPropertyAdded={fetchProperties}
        />
      )}
    </div>
  );
}

export default App;
