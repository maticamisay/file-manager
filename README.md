# File Manager API (AWS S3)

API REST para gestión de archivos con almacenamiento en AWS S3 - subir, almacenar, listar, descargar y eliminar imágenes, documentos y otros tipos de archivo.

## 🚀 Características

- ✅ **Almacenamiento en AWS S3** - Archivos seguros y escalables
- ✅ API REST completa sin interfaz web
- ✅ Subida de múltiples tipos de archivo (imágenes, PDF, Word, Excel, texto)
- ✅ URLs directas de S3 para descargas rápidas
- ✅ Validación estricta de tipos de archivo
- ✅ Límite de tamaño configurable (10MB por defecto)
- ✅ Gestión completa: listar, descargar, eliminar
- ✅ Respuestas JSON estructuradas
- ✅ Manejo robusto de errores
- ✅ CORS habilitado

## 📁 Tipos de archivo soportados

- **Imágenes**: JPEG, JPG, PNG, GIF, WebP
- **Documentos**: PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
- **Texto**: TXT, CSV

## ⚡ Instalación y Ejecución

1. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales de AWS S3
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Ejecutar el servidor:**
```bash
npm start
```

O para desarrollo con recarga automática:
```bash
npm run dev
```

4. La API estará disponible en http://localhost:3000

## 📖 Documentación

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Documentación completa de la API con esquemas, ejemplos de respuestas y códigos de error
- **[EXAMPLES.md](./EXAMPLES.md)** - Ejemplos de uso en JavaScript, React, Python, React Native y cURL

## 🔗 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/upload` | Subir archivo |
| `GET` | `/files` | Listar archivos |
| `GET` | `/files/:filename` | Descargar archivo |
| `DELETE` | `/files/:filename` | Eliminar archivo |

## 📂 Estructura del proyecto

```
file-manager/
├── server.js                # Servidor Express principal
├── package.json             # Dependencias y scripts
├── uploads/                 # Directorio de archivos subidos
├── README.md               # Información general
├── API_DOCUMENTATION.md    # Documentación completa de la API
└── EXAMPLES.md            # Ejemplos de uso para frontend
```

## ⚙️ Configuración

### Variables de Entorno Requeridas
```bash
# Servidor
PORT=3000

# AWS S3
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-2
S3_BUCKET_NAME=tu-bucket

# Opcional
MAX_FILE_SIZE=10485760  # 10MB
CORS_ORIGIN=*
```

### Configuración S3
- **Bucket**: Configurado para tu bucket de AWS S3
- **Región**: us-east-2 (Ohio) por defecto
- **URLs**: Directas desde S3 para máximo rendimiento
- **Límite de tamaño**: 10MB por archivo (configurable)
- **CORS**: Habilitado para todos los orígenes