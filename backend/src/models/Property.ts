import mongoose, { Document, Schema } from "mongoose";

export interface IProperty extends Document {
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
    valuationDate: Date;
  };

  notes?: string;
  photos: string[];
}

const propertySchema = new Schema<IProperty>(
  {
    propertyName: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },

    status: {
      type: String,
      enum: ["Completed", "Under Construction", "Pending"],
      default: "Pending",
    },

    valuation: {
      currentValue: {
        type: Number,
        required: true,
      },

      previousValue: {
        type: Number,
      },

      valuationDate: {
        type: Date,
        required: true,
      },
    },

    notes: {
      type: String,
      trim: true,
    },

    photos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.index({
  location: "2dsphere",
});

const Property = mongoose.model<IProperty>("Property", propertySchema);

export default Property;