import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ValuationHistory {
  value: number;
  valuationDate: string;
  notes?: string;
}

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

  valuationHistory?: ValuationHistory[];

  notes?: string;
}

interface PropertyDetailsProps {
  property: Property;
  onClose: () => void;
  onPropertyUpdated: (
    property: Property
  ) => void;
  onPropertyDeleted: (
    propertyId: string
  ) => void;
}

function PropertyDetails({
  property,
  onClose,
  onPropertyUpdated,
  onPropertyDeleted,
}: PropertyDetailsProps) {
  const [formData, setFormData] = useState({
    propertyName: property.propertyName,
    address: property.address,
    city: property.city,
    district: property.district || "",
    state: property.state,
    status: property.status,
    currentValue:
      property.valuation.currentValue.toString(),
    valuationDate:
      property.valuation.valuationDate.split("T")[0],
    notes: property.notes || "",
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const valuationHistory = property.valuationHistory || [];

  const chartData = [
    ...valuationHistory.map((item) => ({
      date: item.valuationDate,
      displayDate: new Date(
        item.valuationDate
      ).toLocaleDateString("en-IN"),
      value: item.value,
    })),

    {
      date: property.valuation.valuationDate,
      displayDate: new Date(
        property.valuation.valuationDate
      ).toLocaleDateString("en-IN"),
      value: property.valuation.currentValue,
    },
  ].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);

      const response = await fetch(
        `http://localhost:5000/api/properties/${property._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyName: formData.propertyName,
            address: formData.address,
            city: formData.city,
            district: formData.district,
            state: formData.state,

            status: formData.status,

            valuation: {
              currentValue: Number(
                formData.currentValue
              ),
              valuationDate:
                formData.valuationDate,
            },

            notes: formData.notes,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(
          result.message ||
            "Failed to update property."
        );
        return;
      }

      onPropertyUpdated(result.data);

      alert(
        "Property updated successfully."
      );
    } catch (error) {
      console.error(
        "Failed to update property:",
        error
      );

      alert(
        "Failed to update property."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${property.propertyName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `http://localhost:5000/api/properties/${property._id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(
          result.message ||
            "Failed to delete property."
        );
        return;
      }

      onPropertyDeleted(property._id);
      onClose();
    } catch (error) {
      console.error(
        "Failed to delete property:",
        error
      );

      alert(
        "Failed to delete property."
      );
    } finally {
      setDeleting(false);
    }
  };

  const currentValue =
    property.valuation.currentValue;

  const previousValue =
    property.valuation.previousValue;

  const valuationChange =
    previousValue !== undefined
      ? currentValue - previousValue
      : null;

  const valuationChangePercentage =
    previousValue !== undefined &&
    previousValue !== 0
      ? (valuationChange! / previousValue) * 100
      : null;

  return (
    <div className="modal-overlay">
      <div className="property-details-modal">
        <div className="property-details-header">
          <div>
            <p className="subtitle">
              PROPERTY DETAILS
            </p>

            <h2>{property.propertyName}</h2>

            <p>
              {property.address},{" "}
              {property.city},{" "}
              {property.state}
            </p>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="property-details-content">
          <div className="property-form-grid">
            <div className="form-group">
              <label>
                Property Name
              </label>

              <input
                name="propertyName"
                value={
                  formData.propertyName
                }
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                Address
              </label>

              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                City
              </label>

              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                District
              </label>

              <input
                name="district"
                value={
                  formData.district
                }
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                State
              </label>

              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                Status
              </label>

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

            <div className="form-group">
              <label>
                Current Valuation
              </label>

              <input
                type="number"
                name="currentValue"
                value={
                  formData.currentValue
                }
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                Valuation Date
              </label>

              <input
                type="date"
                name="valuationDate"
                value={
                  formData.valuationDate
                }
                onChange={handleChange}
              />
            </div>

            <div className="form-group full-width">
              <label>
                Notes
              </label>

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>

          <div className="valuation-analytics">
            <h3>
              Valuation Analytics
            </h3>

            <div className="valuation-analytics-grid">
              <div className="analytics-card">
                <span>
                  Current Value
                </span>

                <strong>
                  {formatValue(
                    currentValue
                  )}
                </strong>
              </div>

              <div className="analytics-card">
                <span>
                  Previous Value
                </span>

                <strong>
                  {previousValue !==
                  undefined
                    ? formatValue(
                        previousValue
                      )
                    : "N/A"}
                </strong>
              </div>

              <div className="analytics-card">
                <span>
                  Change
                </span>

                <strong>
                  {valuationChange !==
                  null
                    ? formatValue(
                        valuationChange
                      )
                    : "N/A"}
                </strong>
              </div>

              <div className="analytics-card">
                <span>
                  Change %
                </span>

                <strong>
                  {valuationChangePercentage !==
                  null
                    ? `${valuationChangePercentage.toFixed(
                        2
                      )}%`
                    : "N/A"}
                </strong>
              </div>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="valuation-history">
              <h3>
                Valuation Trend
              </h3>

              <div className="valuation-chart">
  <ResponsiveContainer
    width="100%"
    height={280}
    minWidth={0}
    minHeight={280}
  >
    <LineChart
      data={chartData}
      margin={{
        top: 10,
        right: 20,
        left: 20,
        bottom: 10,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis
        dataKey="displayDate"
        tick={{ fontSize: 12 }}
      />

      <YAxis
        tick={{ fontSize: 12 }}
        tickFormatter={(value) =>
          `₹${(Number(value) / 100000).toFixed(0)}L`
        }
      />

      <Tooltip
        formatter={(value) =>
          formatValue(Number(value))
        }
      />

      <Line
        type="monotone"
        dataKey="value"
        stroke="#2563eb"
        strokeWidth={3}
        dot={{
          r: 5,
          fill: "#2563eb",
        }}
        activeDot={{
          r: 7,
        }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>
            </div>
          )}

          <div className="valuation-history">
            <h3>
              Valuation History
            </h3>

            {valuationHistory.length ===
            0 ? (
              <p>
                No previous valuation
                history available.
              </p>
            ) : (
              <div className="valuation-history-list">
                {valuationHistory
                  .slice()
                  .reverse()
                  .map(
                    (
                      history,
                      index
                    ) => (
                      <div
                        className="valuation-history-item"
                        key={`${history.valuationDate}-${index}`}
                      >
                        <div>
                          <strong>
                            {formatValue(
                              history.value
                            )}
                          </strong>

                          <span>
                            {new Date(
                              history.valuationDate
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        {history.notes && (
                          <p>
                            {
                              history.notes
                            }
                          </p>
                        )}
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="property-details-footer">
          <button
            type="button"
            className="delete-button"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? "Deleting..."
              : "Delete Property"}
          </button>

          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={handleUpdate}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;