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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

    if (!formData.latitude || !formData.longitude) {
      setError(
        "Please search and select a property location before saving."
      );
      return;
    }

    setSaving(true);
    setError("");

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
                placeholder="Automatically filled"
                required
              />
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
            </div>

            <div className="form-group">
              <label>Current Value (₹)</label>

              <input
                name="currentValue"
                value={formData.currentValue}
                onChange={handleChange}
                type="number"
                placeholder="Enter current valuation"
                required
              />
            </div>

            <div className="form-group">
              <label>Previous Value (₹)</label>

              <input
                name="previousValue"
                value={formData.previousValue}
                onChange={handleChange}
                type="number"
                placeholder="Enter previous valuation"
              />
            </div>

            <div className="form-group">
              <label>Valuation Date</label>

              <input
                name="valuationDate"
                value={formData.valuationDate}
                onChange={handleChange}
                type="date"
                required
              />
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