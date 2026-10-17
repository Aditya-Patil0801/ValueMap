import { useState } from "react";
import type { FormEvent } from "react";

interface AddPropertyProps {
  onClose: () => void;
  onPropertyAdded: () => void;
}

interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
}

function AddProperty({
  onClose,
  onPropertyAdded,
}: AddPropertyProps) {
  const [formData, setFormData] = useState({
    propertyName: "",
    address: "",
    city: "",
    district: "",
    state: "",
    latitude: "",
    longitude: "",
    status: "Pending",
    currentValue: "",
    previousValue: "",
    valuationDate: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [searchingLocation, setSearchingLocation] =
    useState(false);
  const [locationResults, setLocationResults] = useState<
    LocationResult[]
  >([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    ([
      ["propertyName", "Property name"],
      ["address", "Address"],
      ["city", "City"],
      ["state", "State"],
    ] as const).forEach(([field, label]) => {
      if (!formData[field].trim()) errors[field] = `${label} is required.`;
    });

    const currentValue = Number(formData.currentValue);
    if (!formData.currentValue.trim()) {
      errors.currentValue = "Current valuation is required.";
    } else if (!Number.isFinite(currentValue) || currentValue <= 0) {
      errors.currentValue = "Enter a valid valuation greater than ₹0.";
    }

    if (formData.previousValue.trim()) {
      const previousValue = Number(formData.previousValue);
      if (!Number.isFinite(previousValue) || previousValue < 0) {
        errors.previousValue = "Previous valuation must be zero or greater.";
      }
    }

    if (!formData.valuationDate) {
      errors.valuationDate = "Valuation date is required.";
    } else {
      const date = new Date(`${formData.valuationDate}T00:00:00`);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (Number.isNaN(date.getTime())) {
        errors.valuationDate = "Enter a valid valuation date.";
      } else if (date > today) {
        errors.valuationDate = "Valuation date cannot be in the future.";
      }
    }

    if (!formData.latitude.trim()) {
      errors.latitude = "Search for and select a property location.";
    } else {
      const latitude = Number(formData.latitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        errors.latitude = "Latitude must be between -90 and 90.";
      }
    }

    if (!formData.longitude.trim()) {
      errors.longitude = "Search for and select a property location.";
    } else {
      const longitude = Number(formData.longitude);
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        errors.longitude = "Longitude must be between -180 and 180.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const renderFieldError = (field: string) =>
    fieldErrors[field] ? (
      <p className="field-error" role="alert">
        {fieldErrors[field]}
      </p>
    ) : null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
    if (error) setError("");
  };

  const searchLocation = async () => {
    if (!formData.address.trim()) {
      setError("Please enter the property address first.");
      return;
    }

    setSearchingLocation(true);
    setError("");
    setLocationResults([]);

    try {
      const searchQuery = [
        formData.address,
        formData.city,
        formData.district,
        formData.state,
        "India",
      ]
        .filter(Boolean)
        .join(", ");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
          searchQuery
        )}`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Location search failed.");
      }

      const results: LocationResult[] =
        await response.json();

      if (results.length === 0) {
        setError(
          "No location found. Try entering a more specific address."
        );
        return;
      }

      setLocationResults(results);
    } catch (error) {
      console.error("Location search failed:", error);

      setError(
        "Unable to search location. Please try again."
      );
    } finally {
      setSearchingLocation(false);
    }
  };

  const selectLocation = (location: LocationResult) => {
    setFormData((previous) => ({
      ...previous,
      latitude: location.lat,
      longitude: location.lon,
    }));

    setLocationResults([]);
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    if (!validateForm()) {
      setError("Please correct the highlighted fields before saving.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/properties",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyName: formData.propertyName,
            address: formData.address,
            city: formData.city,
            district: formData.district,
            state: formData.state,

            location: {
              type: "Point",
              coordinates: [
                Number(formData.longitude),
                Number(formData.latitude),
              ],
            },

            status: formData.status,

            valuation: {
              currentValue: Number(
                formData.currentValue
              ),
              previousValue: formData.previousValue
                ? Number(formData.previousValue)
                : undefined,
              valuationDate: formData.valuationDate,
            },

            notes: formData.notes,
            photos: [],
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to create property"
        );
      }

      onPropertyAdded();
      onClose();
    } catch (error) {
      console.error("Error saving property:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save property"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="property-form">
        <div className="form-header">
          <div>
            <h2>Add Property</h2>

            <p>
              Enter the property valuation details.
            </p>
          </div>

          <button
            className="close-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "20px",
              padding: "12px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Property Name</label>

              <input
                name="propertyName"
                value={formData.propertyName}
                onChange={handleChange}
                type="text"
                placeholder="e.g. Global City Building B"
                required
              />
            {renderFieldError("propertyName")}
            </div>

            <div className="form-group">
              <label>Address</label>

              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                type="text"
                placeholder="Enter property address"
                required
              />
            {renderFieldError("address")}
            </div>

            <div className="form-group">
              <label>City</label>

              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                type="text"
                placeholder="Enter city"
                required
              />
            {renderFieldError("city")}
            </div>

            <div className="form-group">
              <label>District</label>

              <input
                name="district"
                value={formData.district}
                onChange={handleChange}
                type="text"
                placeholder="Enter district"
              />
            </div>

            <div className="form-group">
              <label>State</label>

              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
                type="text"
                placeholder="Enter state"
                required
              />
            {renderFieldError("state")}
            </div>

            <div className="form-group">
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Completed">
                  Completed
                </option>

                <option value="Under Construction">
                  Under Construction
                </option>

                <option value="Pending">
                  Pending
                </option>
              </select>
            </div>

            {/* Location Search */}
            <div
              className="form-group"
              style={{
                gridColumn: "1 / -1",
              }}
            >
              <label>Property Location</label>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="add-button"
                  onClick={searchLocation}
                  disabled={searchingLocation}
                >
                  {searchingLocation
                    ? "Searching..."
                    : "Search Location"}
                </button>
              </div>

              {locationResults.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#ffffff",
                  }}
                >
                  {locationResults.map(
                    (location, index) => (
                      <button
                        key={`${location.lat}-${location.lon}-${index}`}
                        type="button"
                        onClick={() =>
                          selectLocation(location)
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px 14px",
                          border: "none",
                          borderBottom:
                            index <
                            locationResults.length - 1
                              ? "1px solid #e2e8f0"
                              : "none",
                          background: "#ffffff",
                          color: "#334155",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        {location.display_name}
                      </button>
                    )
                  )}
                </div>
              )}

              <p
                style={{
                  marginTop: "8px",
                  marginBottom: 0,
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Enter the address, city, district and
                state, then search for the location.
              </p>
            </div>

            <div className="form-group">
              <label>Latitude</label>

              <input
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="Automatically filled"
                required
              />
            {renderFieldError("latitude")}
            </div>

            <div className="form-group">
              <label>Longitude</label>

              <input
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                type="number"
                step="any"
                placeholder="Automatically filled"
                required
              />
            {renderFieldError("longitude")}
            </div>

            <div className="form-group">
              <label>Current Value (₹)</label>

              <input
                name="currentValue"
                value={formData.currentValue}
                onChange={handleChange}
                type="number"
                min="0.01"
                step="any"
                placeholder="Enter current valuation"
                required
              />
            {renderFieldError("currentValue")}
            </div>

            <div className="form-group">
              <label>Previous Value (₹)</label>

              <input
                name="previousValue"
                value={formData.previousValue}
                onChange={handleChange}
                type="number"
                min="0"
                step="any"
                placeholder="Enter previous valuation"
              />
            {renderFieldError("previousValue")}
            </div>

            <div className="form-group">
              <label>Valuation Date</label>

              <input
                name="valuationDate"
                value={formData.valuationDate}
                onChange={handleChange}
                type="date"
                max={new Date().toISOString().split("T")[0]}
                required
              />
            {renderFieldError("valuationDate")}
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Add valuation notes..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Property"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProperty;