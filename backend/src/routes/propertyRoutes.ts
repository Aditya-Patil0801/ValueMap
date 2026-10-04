import { Router } from "express";
import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} from "../controllers/propertyController.js";

const router = Router();

// Create property
router.post("/", createProperty);

// Get all properties
router.get("/", getProperties);

// Get property by ID
router.get("/:id", getPropertyById);

// Update property
router.put("/:id", updateProperty);

// Delete property
router.delete("/:id", deleteProperty);

export default router;