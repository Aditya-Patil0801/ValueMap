
import { Router } from "express";

import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} from "../controllers/propertyController.js";

import { exportPropertiesToExcel } from "../controllers/exportController.js";

import {
  uploadExcel,
  previewExcelImport,
  confirmExcelImport,
} from "../controllers/importController.js";

const router = Router();

// Create property
router.post("/", createProperty);

// Export all properties to Excel
router.get("/export/excel", exportPropertiesToExcel);

// Preview uploaded Excel data before importing
router.post(
  "/import/preview",
  uploadExcel.single("file"),
  previewExcelImport
);

// Confirm and import reviewed properties
router.post("/import/confirm", confirmExcelImport);

// Get all properties
router.get("/", getProperties);

// Get property by ID
router.get("/:id", getPropertyById);

// Update property
router.put("/:id", updateProperty);

// Delete property
router.delete("/:id", deleteProperty);

export default router;
