import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import propertyRoutes from "./routes/propertyRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/properties", propertyRoutes);

const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => {
  res.json({
    message: "ValueMap API is running",
  });
});

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`ValueMap server running on port ${PORT}`);
  });
};

startServer();