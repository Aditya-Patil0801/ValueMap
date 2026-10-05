import { Request, Response } from "express";
import Property from "../models/Property.js";

// Create a new property
export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const property = await Property.create(req.body);

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error creating property:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create property",
    });
  }
};

// Get all properties
export const getProperties = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const properties = await Property.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
};

// Get a single property by ID
export const getPropertyById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Property not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("Error fetching property:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch property",
    });
  }
};

// Update a property
export const updateProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Property not found",
      });
      return;
    }

    const newCurrentValue =
      req.body.valuation?.currentValue;

    const valuationHasChanged =
      typeof newCurrentValue === "number" &&
      newCurrentValue !==
        property.valuation.currentValue;

    if (valuationHasChanged) {
      property.valuationHistory.push({
        value: property.valuation.currentValue,
        valuationDate:
          property.valuation.valuationDate,
        notes:
          property.notes ||
          "Previous valuation recorded automatically.",
      });
    }

    property.set(req.body);

    await property.save();

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error updating property:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update property",
    });
  }
};

// Delete a property
export const deleteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const property = await Property.findByIdAndDelete(
      req.params.id
    );

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Property not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error deleting property:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete property",
    });
  }
};