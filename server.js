require('dotenv').config();
const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Middleware de logging para requests
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] ➤ ${req.method} ${req.url}`);
  console.log(`  ├─ IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`  ├─ User-Agent: ${req.get('User-Agent') || 'N/A'}`);
  
  if (req.method !== 'GET' && Object.keys(req.body || {}).length > 0) {
    console.log(`  ├─ Body: ${JSON.stringify(req.body, null, 2)}`);
  }
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[${new Date().toISOString()}] ✓ ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    console.log(`  └─ Response: ${JSON.stringify(body, null, 2)}`);
    console.log('');
    
    return originalJson.call(this, body);
  };
  
  // Override res.redirect to log redirects
  const originalRedirect = res.redirect;
  res.redirect = function(url) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[${new Date().toISOString()}] ↗ ${req.method} ${req.url} - 302 REDIRECT (${duration}ms)`);
    console.log(`  └─ Redirect to: ${url}`);
    console.log('');
    
    return originalRedirect.call(this, url);
  };
  
  next();
});
// AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const storage = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'uploads/' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: fileFilter
});

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    console.log('📁 [UPLOAD DEBUG] Request received');
    console.log('📁 [UPLOAD DEBUG] File in request:', !!req.file);
    console.log('📁 [UPLOAD DEBUG] Body keys:', Object.keys(req.body || {}));
    
    if (!req.file) {
      console.log('❌ [UPLOAD ERROR] No file in request');
      return res.status(400).json({ error: 'No se ha seleccionado ningún archivo' });
    }

    console.log('📁 [UPLOAD DEBUG] File details:', {
      key: req.file.key,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      location: req.file.location
    });

    const fileInfo = {
      id: req.file.key,
      originalName: req.file.originalname,
      filename: req.file.key,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date(),
      url: req.file.location
    };

    console.log('✅ [UPLOAD SUCCESS] File uploaded successfully');
    res.json({
      message: 'Archivo subido exitosamente',
      file: fileInfo
    });
  } catch (error) {
    console.error('❌ [UPLOAD ERROR] Unexpected error in try-catch:', error);
    console.error('❌ [UPLOAD ERROR] Error stack:', error.stack);
    res.status(500).json({ error: 'Error al subir el archivo' });
  }
});

app.get('/files', async (req, res) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'uploads/'
    };

    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const data = await s3.send(new ListObjectsV2Command(params));
    
    const fileList = data.Contents.map(object => {
      return {
        id: object.Key,
        filename: object.Key,
        size: object.Size,
        uploadDate: object.LastModified,
        url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${object.Key}`
      };
    });

    res.json({ files: fileList });
  } catch (error) {
    console.error('Error al listar archivos:', error);
    res.status(500).json({ error: 'Error al obtener la lista de archivos' });
  }
});

app.get('/files/:filename(*)', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename
    };

    // Verificar si el archivo existe
    try {
      await s3.send(new HeadObjectCommand(params));
    } catch (error) {
      if (error.name === 'NotFound') {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }
      throw error;
    }

    // Generar URL de descarga
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand(params), { expiresIn: 3600 });

    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ error: 'Error al descargar el archivo' });
  }
});

app.delete('/files/:filename(*)', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename
    };

    // Verificar si el archivo existe antes de eliminar
    try {
      await s3.send(new HeadObjectCommand(params));
    } catch (error) {
      if (error.name === 'NotFound') {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }
      throw error;
    }

    // Eliminar archivo
    await s3.send(new DeleteObjectCommand(params));
    res.json({ message: 'Archivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'File Manager API',
    version: '1.0.0',
    description: 'API para gestión de archivos - subir, listar, descargar y eliminar',
    endpoints: {
      'POST /upload': 'Subir archivo',
      'GET /files': 'Listar archivos',
      'GET /files/:filename': 'Descargar archivo',
      'DELETE /files/:filename': 'Eliminar archivo'
    }
  });
});

app.use((error, req, res, next) => {
  console.error('🚨 [ERROR HANDLER] Error caught:', error.message);
  console.error('🚨 [ERROR HANDLER] Error type:', error.constructor.name);
  console.error('🚨 [ERROR HANDLER] Error code:', error.code);
  console.error('🚨 [ERROR HANDLER] Full error:', error);
  console.error('🚨 [ERROR HANDLER] Stack trace:', error.stack);
  
  if (error instanceof multer.MulterError) {
    console.log('📤 [MULTER ERROR] Multer error detected:', error.code);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande (máximo 10MB)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de archivo inesperado' });
    }
    return res.status(400).json({ error: `Error de Multer: ${error.message}` });
  }
  
  if (error.message === 'Tipo de archivo no permitido') {
    console.log('📋 [FILE FILTER] File type not allowed');
    return res.status(400).json({ error: 'Tipo de archivo no permitido' });
  }

  // AWS S3 errors
  if (error.code && error.code.startsWith('AWS')) {
    console.log('☁️ [AWS ERROR] AWS S3 error:', error.code, error.message);
    return res.status(500).json({ error: `Error de AWS S3: ${error.message}` });
  }

  console.log('❓ [UNKNOWN ERROR] Unhandled error type');
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});