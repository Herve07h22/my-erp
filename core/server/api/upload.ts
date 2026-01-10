import express, { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration de multer pour stocker les fichiers
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Générer un nom de fichier unique : timestamp-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const safeName = basename.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

// Filtre pour n'accepter que les images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image sont autorisés (JPEG, PNG, GIF, WebP)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});

/**
 * Crée le routeur pour l'upload de fichiers
 */
export function createUploadRouter(): Router {
  const router = express.Router();

  // POST /api/upload - Upload un fichier
  router.post(
    '/api/upload',
    upload.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'Aucun fichier fourni',
          });
        }

        // Retourner l'URL relative du fichier
        const fileUrl = `/uploads/${req.file.filename}`;

        res.json({
          success: true,
          data: {
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/upload/multiple - Upload plusieurs fichiers
  router.post(
    '/api/upload/multiple',
    upload.array('files', 10), // Max 10 fichiers
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
          return res.status(400).json({
            success: false,
            error: 'Aucun fichier fourni',
          });
        }

        const files = Array.isArray(req.files) ? req.files : [req.files];
        const uploadedFiles = files.map((file) => ({
          url: `/uploads/${file.filename}`,
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        }));

        res.json({
          success: true,
          data: uploadedFiles,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/upload/:filename - Servir les fichiers uploadés
  router.get('/uploads/:filename', (req: Request, res: Response, next: NextFunction) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);

      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'Fichier non trouvé',
        });
      }

      // Servir le fichier
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
