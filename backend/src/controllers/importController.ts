
import type { Request, Response } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import Property from "../models/Property.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMPORT_COUNT = 1000;

type PropertyStatus =
  | "Completed"
  | "Under Construction"
  | "Pending";

interface ImportProperty {
  propertyName: string;
  address: string;
  city: string;
  district?: string;
  state: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  status: PropertyStatus;
  valuation: {
    currentValue: number;
    previousValue?: number;
    valuationDate: Date;
  };
  notes?: string;
  photos: string[];
}

const allowedStatuses: PropertyStatus[] = [
  "Completed",
  "Under Construction",
  "Pending",
];

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if ([".xlsx", ".xlsm"].includes(extension)) {
      callback(null, true);
    } else {
      callback(new Error("Please upload an Excel file (.xlsx or .xlsm)."));
    }
  },
});

const textValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const cell = value as Record<string, unknown>;

    if (cell.text !== undefined) {
      return String(cell.text).trim();
    }

    if (cell.result !== undefined) {
      return String(cell.result).trim();
    }

    if (Array.isArray(cell.richText)) {
      return cell.richText
        .map((part) =>
          String(
            (part as Record<string, unknown>).text ?? ""
          )
        )
        .join("")
        .trim();
    }
  }

  return String(value).trim();
};

const parseNumber = (value: unknown): number => {
  const text = textValue(value).replace(/[₹,\s]/g, "");
  if (!text) return NaN;
  return Number(text);
};

const parseDate = (value: unknown): Date => {
  if (value instanceof Date) return value;

  // Excel's 1900 date system serial number.
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = Math.round(
      (value - 25569) * 24 * 60 * 60 * 1000
    );
    return new Date(milliseconds);
  }

  const text = textValue(value);
  if (!text) return new Date(NaN);

  // Handle common day/month/year formats without ambiguity.
  const match = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);

    // Interpret dates like 29/10/2026 as DD/MM/YYYY.
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return new Date(NaN);
    }

    return date;
  }

  return new Date(text);
};

const normalizeHeader = (value: unknown): string =>
  textValue(value).toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeKey = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mapStatus = (value: unknown): PropertyStatus => {
  const status = textValue(value).toLowerCase().trim();

  if (
    ["completed", "complete", "ready", "ready to move"].includes(status)
  ) {
    return "Completed";
  }

  if (
    ["under construction", "construction", "in progress"].includes(status)
  ) {
    return "Under Construction";
  }

  return "Pending";
};

export const previewExcelImport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        message: "Please select an Excel file.",
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as never);

    const worksheet = workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount < 2) {
      res.status(400).json({
        message: "The Excel file has no property records.",
      });
      return;
    }

    const headers: string[] = [];

    worksheet.getRow(1).eachCell((cell, columnNumber) => {
      headers[columnNumber - 1] = normalizeHeader(cell.value);
    });

    const headerAliases: Record<string, string[]> = {
      propertyName: [
        "propertyname",
        "property",
        "buildingname",
        "building",
        "name",
      ],
      address: [
        "address",
        "propertyaddress",
        "fulladdress",
        "locationaddress",
      ],
      city: ["city", "town"],
      district: ["district"],
      state: ["state"],
      latitude: ["latitude", "lat"],
      longitude: ["longitude", "long", "lng", "lon"],
      status: ["status", "propertystatus", "constructionstatus"],
      currentValue: [
        "currentvalue",
        "valuation",
        "marketvalue",
        "propertyvalue",
        "currentvaluation",
      ],
      previousValue: [
        "previousvalue",
        "oldvalue",
        "previousvaluation",
      ],
      valuationDate: [
        "valuationdate",
        "dateofvaluation",
        "date",
        "valuationasof",
      ],
      notes: ["notes", "remarks", "comments", "description"],
    };

    const columnMap: Record<string, number> = {};

    for (const [field, aliases] of Object.entries(headerAliases)) {
      const index = headers.findIndex((header) =>
        aliases.includes(header)
      );

      if (index !== -1) columnMap[field] = index;
    }

    const requiredFields = [
      "propertyName",
      "address",
      "city",
      "state",
      "latitude",
      "longitude",
      "currentValue",
      "valuationDate",
    ];

    const missingFields = requiredFields.filter(
      (field) => columnMap[field] === undefined
    );

    if (missingFields.length > 0) {
      res.status(400).json({
        message: "Some required columns could not be identified.",
        missingFields,
        detectedHeaders: headers.filter(Boolean),
      });
      return;
    }

    const rows: ImportProperty[] = [];
    const rejectedRows: Array<{
      row: number;
      reason: string;
    }> = [];

    const getCellValue = (
      row: ExcelJS.Row,
      field: string
    ): unknown => {
      const column = columnMap[field];
      return column === undefined
        ? undefined
        : row.getCell(column + 1).value;
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      const propertyName = textValue(getCellValue(row, "propertyName"));
      const address = textValue(getCellValue(row, "address"));
      const city = textValue(getCellValue(row, "city"));
      const district = textValue(getCellValue(row, "district"));
      const state = textValue(getCellValue(row, "state"));

      const latitude = parseNumber(getCellValue(row, "latitude"));
      const longitude = parseNumber(getCellValue(row, "longitude"));
      const currentValue = parseNumber(getCellValue(row, "currentValue"));
      const rawPreviousValue = textValue(
        getCellValue(row, "previousValue")
      );
      const previousValue = rawPreviousValue
        ? parseNumber(rawPreviousValue)
        : undefined;

      const valuationDate = parseDate(
        getCellValue(row, "valuationDate")
      );

      const problems: string[] = [];

      if (!propertyName) problems.push("Property name is missing");
      if (!address) problems.push("Address is missing");
      if (!city) problems.push("City is missing");
      if (!state) problems.push("State is missing");

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        problems.push("Invalid latitude");
      }

      if (
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        problems.push("Invalid longitude");
      }

      if (!Number.isFinite(currentValue) || currentValue <= 0) {
        problems.push("Current value must be a positive number");
      }

      if (Number.isNaN(valuationDate.getTime())) {
        problems.push("Invalid valuation date");
      }

      if (
        previousValue !== undefined &&
        (!Number.isFinite(previousValue) || previousValue < 0)
      ) {
        problems.push("Previous value must be a non-negative number");
      }

      if (problems.length > 0) {
        rejectedRows.push({
          row: rowNumber,
          reason: problems.join("; "),
        });
        continue;
      }

      rows.push({
        propertyName,
        address,
        city,
        ...(district ? { district } : {}),
        state,
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        status: mapStatus(getCellValue(row, "status")),
        valuation: {
          currentValue,
          ...(previousValue !== undefined ? { previousValue } : {}),
          valuationDate,
        },
        ...(textValue(getCellValue(row, "notes"))
          ? { notes: textValue(getCellValue(row, "notes")) }
          : {}),
        photos: [],
      });
    }

    res.status(200).json({
      message: "Excel preview generated. No properties have been saved yet.",
      worksheet: worksheet.name,
      totalDataRows: Math.max(0, worksheet.rowCount - 1),
      validRows: rows.length,
      rejectedCount: rejectedRows.length,
      preview: rows.slice(0, 10),
      properties: rows,
      rejectedRows,
    });
  } catch (error) {
    console.error("Excel import preview error:", error);

    res.status(400).json({
      message: "Unable to read this Excel file. Please check its format.",
    });
  }
};

export const confirmExcelImport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (
      !req.body ||
      !Array.isArray(req.body.properties) ||
      req.body.properties.length === 0
    ) {
      res.status(400).json({
        message: "No properties were provided for import.",
      });
      return;
    }

    if (req.body.properties.length > MAX_IMPORT_COUNT) {
      res.status(400).json({
        message: `Import is limited to ${MAX_IMPORT_COUNT} properties per request.`,
      });
      return;
    }

    const importedIds: string[] = [];
    const skipped: Array<{
      propertyName: string;
      reason: string;
    }> = [];
    const seenInUpload = new Set<string>();

    for (const item of req.body.properties as unknown[]) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        skipped.push({
          propertyName: "Unknown",
          reason: "Invalid property data.",
        });
        continue;
      }

      const record = item as Record<string, unknown>;
      const propertyName =
        typeof record.propertyName === "string"
          ? record.propertyName.trim()
          : "";
      const address =
        typeof record.address === "string" ? record.address.trim() : "";
      const city =
        typeof record.city === "string" ? record.city.trim() : "";
      const state =
        typeof record.state === "string" ? record.state.trim() : "";

      const valuation =
        record.valuation && typeof record.valuation === "object"
          ? (record.valuation as Record<string, unknown>)
          : null;

      const location =
        record.location && typeof record.location === "object"
          ? (record.location as Record<string, unknown>)
          : null;

      const coordinates = location?.coordinates;
      const currentValue = Number(valuation?.currentValue);

      const rawPreviousValue = valuation?.previousValue;
      const previousValue =
        rawPreviousValue === undefined ||
        rawPreviousValue === null ||
        rawPreviousValue === ""
          ? undefined
          : Number(rawPreviousValue);

      const valuationDate = new Date(
        String(valuation?.valuationDate ?? "")
      );

      const longitude = Array.isArray(coordinates)
        ? Number(coordinates[0])
        : NaN;
      const latitude = Array.isArray(coordinates)
        ? Number(coordinates[1])
        : NaN;

      const problems: string[] = [];

      if (!propertyName) problems.push("Property name is missing.");
      if (!address) problems.push("Address is missing.");
      if (!city) problems.push("City is missing.");
      if (!state) problems.push("State is missing.");

      if (
        location?.type !== "Point" ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180 ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        problems.push("Invalid coordinates.");
      }

      if (!Number.isFinite(currentValue) || currentValue <= 0) {
        problems.push("Current value must be a positive number.");
      }

      if (Number.isNaN(valuationDate.getTime())) {
        problems.push("Invalid valuation date.");
      }

      if (
        previousValue !== undefined &&
        (!Number.isFinite(previousValue) || previousValue < 0)
      ) {
        problems.push("Previous value must be non-negative.");
      }

      const status =
        record.status === undefined
          ? "Pending"
          : record.status;

      if (
        typeof status !== "string" ||
        !allowedStatuses.includes(status as PropertyStatus)
      ) {
        problems.push("Invalid property status.");
      }

      if (problems.length > 0) {
        skipped.push({
          propertyName: propertyName || "Unknown",
          reason: problems.join(" "),
        });
        continue;
      }

      const duplicateKey = [
        propertyName,
        address,
        city,
        state,
      ]
        .map(normalizeKey)
        .join("|");

      if (seenInUpload.has(duplicateKey)) {
        skipped.push({
          propertyName,
          reason: "Duplicate property in this uploaded file.",
        });
        continue;
      }

      seenInUpload.add(duplicateKey);

      const existing = await Property.findOne({
        propertyName: {
          $regex: `^${escapeRegex(propertyName)}$`,
          $options: "i",
        },
        address: {
          $regex: `^${escapeRegex(address)}$`,
          $options: "i",
        },
        city: {
          $regex: `^${escapeRegex(city)}$`,
          $options: "i",
        },
        state: {
          $regex: `^${escapeRegex(state)}$`,
          $options: "i",
        },
      }).select("_id");

      if (existing) {
        skipped.push({
          propertyName,
          reason: "A matching property already exists in the database.",
        });
        continue;
      }

      try {
        const savedProperty = await Property.create({
          propertyName,
          address,
          city,
          state,
          ...(typeof record.district === "string" &&
          record.district.trim()
            ? { district: record.district.trim() }
            : {}),
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          status: status as PropertyStatus,
          valuation: {
            currentValue,
            ...(previousValue !== undefined ? { previousValue } : {}),
            valuationDate,
          },
          ...(typeof record.notes === "string" && record.notes.trim()
            ? { notes: record.notes.trim() }
            : {}),
          // Don't accept arbitrary photo URLs from an import request.
          photos: [],
        });

        importedIds.push(String(savedProperty._id));
      } catch (error) {
        console.error("Failed to save imported property:", error);

        skipped.push({
          propertyName,
          reason: "MongoDB could not save this property.",
        });
      }
    }

    res.status(200).json({
      message: "Import process completed.",
      importedCount: importedIds.length,
      skippedCount: skipped.length,
      importedIds,
      skipped,
    });
  } catch (error) {
    console.error("Excel import error:", error);

    res.status(500).json({
      message: "Unable to import properties.",
    });
  }
};
