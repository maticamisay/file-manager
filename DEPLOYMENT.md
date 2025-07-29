# Guía de Deployment - File Manager API

## 🚨 Problema: Pérdida de Archivos en Deploy

**Con la configuración actual, los archivos se PERDERÁN** al hacer deploy porque:
- El directorio `uploads/` está dentro del proyecto
- Git clone / Docker build eliminan contenido anterior
- Cada deploy = archivos perdidos

## ✅ Soluciones de Almacenamiento Persistente

### 1. **🌐 Almacenamiento en Nube (RECOMENDADO)**

#### AWS S3

```bash
npm install multer-s3 aws-sdk
```

```javascript
// config/storage.js
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'uploads/' + uniqueSuffix + path.extname(file.originalname));
  }
});

module.exports = storage;
```

**Variables de entorno necesarias:**
```bash
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=mi-bucket-archivos
```

#### Google Cloud Storage

```bash
npm install multer-google-storage @google-cloud/storage
```

```javascript
const { Storage } = require('@google-cloud/storage');
const multerGoogleStorage = require('multer-google-storage');

const storage = multerGoogleStorage.storageEngine({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  bucket: process.env.GOOGLE_CLOUD_BUCKET,
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
```

---

### 2. **🐳 Docker con Volumes Persistentes**

#### docker-compose.yml
```yaml
version: '3.8'
services:
  file-manager:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - uploads_data:/app/uploads
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - UPLOADS_PATH=/app/uploads
    restart: unless-stopped

volumes:
  uploads_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/file-manager/uploads  # Ruta en el host
```

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Crear directorio de uploads
RUN mkdir -p /app/uploads

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

#### Deploy con Docker
```bash
# Primera vez
docker-compose up -d

# Actualizar código (mantiene archivos)
docker-compose build
docker-compose up -d
```

---

### 3. **📁 Directorio Externo al Proyecto**

#### Modificar server.js
```javascript
// Al inicio del archivo
const UPLOADS_DIR = process.env.UPLOADS_PATH || '/var/uploads/file-manager';

// Crear directorio si no existe
const fs = require('fs');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Servir archivos estáticos
app.use('/uploads', express.static(UPLOADS_DIR));
```

#### Script de deploy
```bash
#!/bin/bash
# deploy.sh

# Crear directorio de uploads si no existe
sudo mkdir -p /var/uploads/file-manager
sudo chown $USER:$USER /var/uploads/file-manager

# Actualizar código
git pull origin main
npm install
pm2 restart file-manager

echo "Deploy completado. Archivos preservados en /var/uploads/file-manager"
```

---

### 4. **☁️ Servicios de Hosting Específicos**

#### Vercel (Solo para APIs sin uploads persistentes)
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```
**⚠️ Nota**: Vercel no permite uploads persistentes, usar S3.

#### Railway
```bash
# Agregar variable de entorno
UPLOADS_PATH=/app/uploads

# Railway automáticamente persiste algunos directorios
```

#### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: file-manager
services:
- name: api
  source_dir: /
  github:
    repo: tu-usuario/file-manager
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: UPLOADS_PATH
    value: /app/uploads
    type: SECRET
```

---

## 🔧 Configuración Híbrida (Local + Nube)

```javascript
// config/storage.js
const useCloudStorage = process.env.NODE_ENV === 'production';

const storage = useCloudStorage 
  ? require('./cloud-storage') 
  : require('./local-storage');

module.exports = storage;
```

```javascript
// config/local-storage.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOADS_PATH || './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

module.exports = storage;
```

---

## 🚀 Recomendaciones por Tipo de Deploy

| Escenario | Solución Recomendada | Razón |
|-----------|---------------------|-------|
| **Producción empresarial** | AWS S3 / Google Cloud | Escalabilidad, CDN, backups |
| **VPS/Servidor propio** | Docker volumes | Control total, costo bajo |
| **Desarrollo/Testing** | Directorio externo | Simple, rápido |
| **Hobby/Personal** | Docker volumes | Fácil de configurar |

---

## 📋 Checklist de Deploy con S3

- [x] ✅ Bucket S3 creado (`eldisco`)
- [x] ✅ Usuario IAM configurado con permisos
- [x] ✅ Variables de entorno configuradas
- [x] ✅ Código actualizado para S3
- [ ] ✅ Probar upload/download en staging
- [ ] ✅ Configurar CORS en bucket S3 (si es necesario)
- [ ] ✅ Monitorear costos de S3
- [ ] ✅ Configurar lifecycle policies (opcional)

## 💰 Costos Estimados S3

**Para 1000 archivos/mes (promedio 2MB cada uno):**
- Almacenamiento: ~$0.05/mes
- Requests: ~$0.01/mes  
- Transfer: ~$0.10/mes
- **Total: ~$0.16/mes** 📈

## 🔒 Seguridad S3

### Configuración de CORS (si es necesario)
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### Bucket Policy (opcional - más restrictivo)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eldisco/uploads/*"
    }
  ]
}
```