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
    const properties = await Property.find().sort({ createdAt: -1 });

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