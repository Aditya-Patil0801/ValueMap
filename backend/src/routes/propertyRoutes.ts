import { Router } from "express";
import {
  createProperty,
  getProperties,
  getPropertyById,
} from "../controllers/propertyController.js";

const router = Router();

// Create a new property
router.post("/", createProperty);

// Get all properties
router.get("/", getProperties);

// Get a single property by ID
router.get("/:id", getPropertyById);

export default router;