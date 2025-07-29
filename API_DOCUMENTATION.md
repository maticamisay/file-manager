# File Manager API - Documentación Completa

## 📋 Información General

**Base URL**: `http://localhost:3000` (configurable con variable `PORT`)  
**Versión**: 1.0.0  
**Almacenamiento**: AWS S3  
**Content-Type**: `application/json` para respuestas, `multipart/form-data` para subida  

---

## 🔗 Endpoints

### 1. **GET /** - Información de la API
Obtiene información básica sobre la API y sus endpoints disponibles.

**Request:**
```http
GET / HTTP/1.1
Host: localhost:3000
```

**Response:** `200 OK`
```json
{
  "name": "File Manager API",
  "version": "1.0.0",
  "description": "API para gestión de archivos - subir, listar, descargar y eliminar",
  "endpoints": {
    "POST /upload": "Subir archivo",
    "GET /files": "Listar archivos",
    "GET /files/:filename": "Descargar archivo",
    "DELETE /files/:filename": "Eliminar archivo"
  }
}
```

---

### 2. **POST /upload** - Subir Archivo
Sube un archivo al servidor con validación de tipo y tamaño.

**Content-Type**: `multipart/form-data`

**Request:**
```http
POST /upload HTTP/1.1
Host: localhost:3000
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="file"; filename="documento.pdf"
Content-Type: application/pdf

[binary data]
------FormBoundary--
```

**Parámetros:**
- `file` (required): Archivo a subir

**Response Exitosa:** `200 OK`
```json
{
  "message": "Archivo subido exitosamente",
  "file": {
    "id": "uploads/file-1691234567890-123456789.pdf",
    "originalName": "documento.pdf",
    "filename": "uploads/file-1691234567890-123456789.pdf",
    "mimetype": "application/pdf",
    "size": 2048576,
    "uploadDate": "2024-08-05T10:30:00.000Z",
    "url": "https://eldisco.s3.us-east-2.amazonaws.com/uploads/file-1691234567890-123456789.pdf"
  }
}
```

**Errores:**
```json
// 400 - No hay archivo
{
  "error": "No se ha seleccionado ningún archivo"
}

// 400 - Archivo muy grande
{
  "error": "El archivo es demasiado grande (máximo 10MB)"
}

// 400 - Tipo no permitido
{
  "error": "Tipo de archivo no permitido"
}

// 500 - Error del servidor
{
  "error": "Error al subir el archivo"
}
```

---

### 3. **GET /files** - Listar Archivos
Obtiene la lista de todos los archivos almacenados en el servidor.

**Request:**
```http
GET /files HTTP/1.1
Host: localhost:3000
```

**Response:** `200 OK`
```json
{
  "files": [
    {
      "id": "uploads/file-1691234567890-123456789.pdf",
      "filename": "uploads/file-1691234567890-123456789.pdf",
      "size": 2048576,
      "uploadDate": "2024-08-05T10:30:00.000Z",
      "url": "https://eldisco.s3.us-east-2.amazonaws.com/uploads/file-1691234567890-123456789.pdf"
    },
    {
      "id": "uploads/file-1691234567891-987654321.jpg",
      "filename": "uploads/file-1691234567891-987654321.jpg",
      "size": 1024000,
      "uploadDate": "2024-08-05T11:15:00.000Z",
      "url": "https://eldisco.s3.us-east-2.amazonaws.com/uploads/file-1691234567891-987654321.jpg"
    }
  ]
}
```

**Response (sin archivos):** `200 OK`
```json
{
  "files": []
}
```

**Errores:**
```json
// 500 - Error del servidor
{
  "error": "Error al obtener la lista de archivos"
}
```

---

### 4. **GET /files/:filename** - Descargar Archivo
Descarga un archivo específico del servidor.

**Request:**
```http
GET /files/uploads/file-1691234567890-123456789.pdf HTTP/1.1
Host: localhost:3000
```

**Response Exitosa:** `302 Redirect`
- **Headers**: `Location: https://eldisco.s3.us-east-2.amazonaws.com/uploads/file-1691234567890-123456789.pdf?AWSAccessKeyId=...&Expires=...&Signature=...`
- **Nota**: Redirección automática a URL firmada de S3 válida por 1 hora

**Errores:**
```json
// 404 - Archivo no encontrado
{
  "error": "Archivo no encontrado"
}

// 500 - Error del servidor
{
  "error": "Error al descargar el archivo"
}
```

---

### 5. **DELETE /files/:filename** - Eliminar Archivo
Elimina permanentemente un archivo del servidor.

**Request:**
```http
DELETE /files/uploads/file-1691234567890-123456789.pdf HTTP/1.1
Host: localhost:3000
```

**Response Exitosa:** `200 OK`
```json
{
  "message": "Archivo eliminado exitosamente"
}
```

**Errores:**
```json
// 404 - Archivo no encontrado
{
  "error": "Archivo no encontrado"
}

// 500 - Error del servidor
{
  "error": "Error al eliminar el archivo"
}
```

---

## 📝 Esquemas de Datos

### FileInfo Object
```typescript
interface FileInfo {
  id: string;              // Nombre único del archivo
  originalName?: string;   // Nombre original (solo en upload)
  filename: string;        // Nombre del archivo en servidor
  mimetype?: string;       // Tipo MIME (solo en upload)
  size: number;           // Tamaño en bytes
  uploadDate: string;     // ISO 8601 timestamp
  url: string;           // URL relativa del archivo
}
```

### Upload Response
```typescript
interface UploadResponse {
  message: string;
  file: FileInfo;
}
```

### Files List Response  
```typescript
interface FilesResponse {
  files: FileInfo[];
}
```

### Error Response
```typescript
interface ErrorResponse {
  error: string;
}
```

---

## ✅ Validaciones y Límites

### Tipos de Archivo Permitidos
| Categoría | Tipos MIME | Extensiones |
|-----------|------------|-------------|
| **Imágenes** | `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| **Documentos PDF** | `application/pdf` | `.pdf` |
| **Word** | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.doc`, `.docx` |
| **Excel** | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xls`, `.xlsx` |
| **Texto** | `text/plain`, `text/csv` | `.txt`, `.csv` |

### Límites
- **Tamaño máximo**: 10MB por archivo (configurable con `MAX_FILE_SIZE`)
- **Nombre de archivo**: Se genera automáticamente con formato `uploads/file-{timestamp}-{random}.{ext}`
- **Almacenamiento**: AWS S3 bucket `eldisco`
- **URLs de descarga**: Firmadas, válidas por 1 hora

---

## 🔌 Configuración CORS
La API está configurada para aceptar requests desde cualquier origen. Para producción, configurar dominios específicos:

```javascript
app.use(cors({
  origin: ['https://tudominio.com', 'https://app.tudominio.com']
}));
```

---

## 🚀 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Operación exitosa |
| `302` | Redirección a URL de descarga (solo para GET /files/:filename) |
| `400` | Error en la petición (archivo faltante, muy grande, tipo no permitido) |
| `404` | Archivo no encontrado en S3 |
| `500` | Error interno del servidor o AWS S3 |

---

## 🛠 Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en producción
npm start

# Ejecutar en desarrollo
npm run dev
```

**Variables de Entorno Requeridas:**
- `PORT`: Puerto del servidor (default: 3000)
- `AWS_ACCESS_KEY_ID`: Clave de acceso AWS
- `AWS_SECRET_ACCESS_KEY`: Clave secreta AWS  
- `AWS_REGION`: Región de S3 (ej: us-east-2)
- `S3_BUCKET_NAME`: Nombre del bucket S3

---

## 📂 Estructura de Directorios
```
file-manager/
├── server.js              # Servidor principal
├── package.json           # Dependencias (incluye aws-sdk, multer-s3)
├── .env                   # Variables de entorno (NO subir a git)
├── .env.example          # Plantilla de variables de entorno
├── API_DOCUMENTATION.md   # Esta documentación
├── EXAMPLES.md           # Ejemplos de uso
├── DEPLOYMENT.md         # Guía de deployment
└── README.md             # Información general
```