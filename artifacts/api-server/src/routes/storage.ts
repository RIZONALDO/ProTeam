import { Router, type Request, type Response } from "express";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { generateUploadId, getUploadPath, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();

// Step 1: client requests an upload slot, gets back a URL to PUT to
router.post("/storage/uploads/request-url", (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};
  if (!name || !size || !contentType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const id = generateUploadId();
  const uploadURL = `/api/storage/upload/${id}`;
  const objectPath = `/objects/uploads/${id}`;

  res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
});

// Step 2: client PUTs the raw file bytes to this URL
router.put("/storage/upload/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: "Invalid upload ID" });
    return;
  }

  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const buffer = Buffer.concat(chunks);
      await writeFile(getUploadPath(id), buffer);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to save file" });
    }
  });
  req.on("error", () => {
    res.status(500).json({ error: "Upload stream error" });
  });
});

// Serve uploaded files
router.get("/storage/objects/uploads/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const filePath = getUploadPath(id);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(filePath);
});

export default router;
