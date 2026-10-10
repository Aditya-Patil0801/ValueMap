
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import Property from "../models/Property.js";

export const exportPropertiesToExcel = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const properties = await Property.find()
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "ValueMap";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Properties");

    worksheet.columns = [
      { header: "Property ID", key: "id", width: 26 },
      { header: "Property Name", key: "propertyName", width: 25 },
      { header: "Address", key: "address", width: 35 },
      { header: "City", key: "city", width: 18 },
      { header: "District", key: "district", width: 18 },
      { header: "State", key: "state", width: 20 },
      { header: "Latitude", key: "latitude", width: 14 },
      { header: "Longitude", key: "longitude", width: 14 },
      { header: "Status", key: "status", width: 22 },
      { header: "Current Value", key: "currentValue", width: 18 },
      { header: "Previous Value", key: "previousValue", width: 18 },
      { header: "Valuation Date", key: "valuationDate", width: 20 },
      { header: "Notes", key: "notes", width: 40 },
     
    ];

    for (const property of properties) {
      const coordinates = property.location?.coordinates;

      worksheet.addRow({
        id: property._id.toString(),
        propertyName: property.propertyName,
        address: property.address,
        city: property.city,
        district: property.district ?? "",
        state: property.state,
        longitude: coordinates?.[0] ?? "",
        latitude: coordinates?.[1] ?? "",
        status: property.status,
        currentValue: property.valuation?.currentValue ?? "",
        previousValue: property.valuation?.previousValue ?? "",
        valuationDate: property.valuation?.valuationDate
          ? new Date(property.valuation.valuationDate)
          : "",
        notes: property.notes ?? "",
        
      });
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle" };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    worksheet.autoFilter = {
      from: "A1",
      to: `M${Math.max(1, worksheet.rowCount)}`,
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="valuemap-properties.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting properties to Excel:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to export properties to Excel",
      });
    } else {
      res.end();
    }
  }
};
