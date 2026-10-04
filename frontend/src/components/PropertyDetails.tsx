import { useState } from "react";

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

interface PropertyDetailsProps {
  property: Property;
  onClose: () => void;
  onPropertyUpdated?: (property: Property) => void;
  onPropertyDeleted?: (propertyId: string) => void;
}

function PropertyDetails({
  property,
  onClose,
  onPropertyUpdated,
  onPropertyDeleted,
}: PropertyDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    propertyName: property.propertyName,
    address: property.address,
    city: property.city,
    district: property.district || "",
    state: property.state,
    status: property.status,
    latitude: property.location.coordinates[1].toString(),
    longitude: property.location.coordinates[0].toString(),
    currentValue: property.valuation.currentValue.toString(),
    previousValue:
      property.valuation.previousValue?.toString() || "",
    valuationDate: property.valuation.valuationDate
      ? property.valuation.valuationDate.substring(0, 10)
      : "",
    notes: property.notes || "",
  });

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);

    try {
      const updatedData = {
        propertyName: formData.propertyName,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        state: formData.state,

        location: {
          type: "Point" as const,
          coordinates: [
            Number(formData.longitude),
            Number(formData.latitude),
          ] as [number, number],
        },

        status: formData.status,

        valuation: {
          currentValue: Number(formData.currentValue),
          previousValue: formData.previousValue
            ? Number(formData.previousValue)
            : undefined,
          valuationDate: formData.valuationDate,
        },

        notes: formData.notes,
      };

      const response = await fetch(
        `http://localhost:5000/api/properties/${property._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update property"
        );
      }

      onPropertyUpdated?.(result.data);

      setIsEditing(false);

      alert("Property updated successfully!");
    } catch (error) {
      console.error("Update failed:", error);

      alert("Failed to update property.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${property.propertyName}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/properties/${property._id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete property"
        );
      }

      onPropertyDeleted?.(property._id);

      onClose();

      alert("Property deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);

      alert("Failed to delete property.");
    } finally {
      setDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="modal-overlay">
        <div className="property-details edit-property-modal">
          <div className="details-header">
            <div>
              <p className="subtitle">EDIT PROPERTY</p>

              <h2>Update Property</h2>

              <p>
                Modify the property valuation and location details.
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

          <form onSubmit={handleUpdate}>
            <div className="edit-form-grid">
              <div className="form-group">
                <label>Property Name</label>

                <input
                  type="text"
                  name="propertyName"
                  value={formData.propertyName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Address</label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>City</label>

                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>District</label>

                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>State</label>

                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
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
                  <option value="Pending">Pending</option>

                  <option value="Under Construction">
                    Under Construction
                  </option>

                  <option value="Completed">
                    Completed
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>Latitude</label>

                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Longitude</label>

                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Current Value (₹)</label>

                <input
                  type="number"
                  name="currentValue"
                  value={formData.currentValue}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Previous Value (₹)</label>

                <input
                  type="number"
                  name="previousValue"
                  value={formData.previousValue}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Valuation Date</label>

                <input
                  type="date"
                  name="valuationDate"
                  value={formData.valuationDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Add valuation notes..."
              />
            </div>

            <div className="details-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="add-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const [longitude, latitude] = property.location.coordinates;

  return (
    <div className="modal-overlay">
      <div className="property-details">
        <div className="details-header">
          <div>
            <p className="subtitle">PROPERTY DETAILS</p>

            <h2>{property.propertyName}</h2>

            <p>{property.address}</p>
          </div>

          <button
            className="close-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="details-grid">
          <div className="detail-card">
            <span>Status</span>

            <strong>{property.status}</strong>
          </div>

          <div className="detail-card">
            <span>Current Valuation</span>

            <strong>
              {formatValue(
                property.valuation.currentValue
              )}
            </strong>
          </div>

          <div className="detail-card">
            <span>Previous Valuation</span>

            <strong>
              {property.valuation.previousValue
                ? formatValue(
                    property.valuation.previousValue
                  )
                : "Not available"}
            </strong>
          </div>

          <div className="detail-card">
            <span>Valuation Date</span>

            <strong>
              {new Date(
                property.valuation.valuationDate
              ).toLocaleDateString("en-IN")}
            </strong>
          </div>
        </div>

        <div className="details-section">
          <h3>Location</h3>

          <div className="location-details">
            <p>
              <strong>City:</strong> {property.city}
            </p>

            <p>
              <strong>District:</strong>{" "}
              {property.district || "Not available"}
            </p>

            <p>
              <strong>State:</strong> {property.state}
            </p>

            <p>
              <strong>Latitude:</strong> {latitude}
            </p>

            <p>
              <strong>Longitude:</strong> {longitude}
            </p>
          </div>
        </div>

        <div className="details-section">
          <h3>Notes</h3>

          <div className="notes-box">
            {property.notes || "No notes available."}
          </div>
        </div>

        <div className="details-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            type="button"
          >
            Close
          </button>

          <button
            className="add-button"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            Edit Property
          </button>

          <button
            className="delete-button"
            onClick={handleDelete}
            type="button"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Property"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;