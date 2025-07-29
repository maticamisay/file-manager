# Ejemplos de Uso - File Manager API (AWS S3)

> **ℹ️ Nota**: Esta API utiliza AWS S3 para almacenamiento. Los archivos se almacenan en el bucket `eldisco` y las URLs apuntan directamente a S3.

## 🌐 JavaScript/Fetch (Vanilla JS)

### Subir Archivo
```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Archivo subido:', result.file);
      return result.file;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Uso con input file
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const uploadedFile = await uploadFile(file);
      console.log('Archivo subido exitosamente:', uploadedFile);
      console.log('URL de S3:', uploadedFile.url);
    } catch (error) {
      console.error('Error al subir:', error.message);
    }
  }
});
```

### Listar Archivos
```javascript
async function getFiles() {
  try {
    const response = await fetch('http://localhost:3000/files');
    const data = await response.json();
    
    if (response.ok) {
      console.log('Archivos:', data.files);
    // Cada archivo tiene una URL directa de S3
    data.files.forEach(file => {
      console.log(`${file.filename}: ${file.url}`);
    });
      return data.files;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}
```

### Descargar Archivo
```javascript
function downloadFile(filename) {
  // El servidor redirige automáticamente a la URL firmada de S3
  const url = `http://localhost:3000/files/${filename}`;
  window.open(url, '_blank');
}

// Alternativa: obtener URL directa de S3 desde la respuesta de /files
async function downloadFileFromList() {
  const files = await getFiles();
  const file = files[0]; // Primer archivo
  window.open(file.url, '_blank'); // URL directa de S3
}
```

### Eliminar Archivo
```javascript
async function deleteFile(filename) {
  try {
    const response = await fetch(`http://localhost:3000/files/${filename}`, {
      method: 'DELETE'
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Archivo eliminado:', result.message);
      return true;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}
```

---

## ⚛️ React/TypeScript

### Interfaces TypeScript
```typescript
interface FileInfo {
  id: string;
  originalName?: string;
  filename: string;
  mimetype?: string;
  size: number;
  uploadDate: string;
  url: string;
}

interface UploadResponse {
  message: string;
  file: FileInfo;
}

interface FilesResponse {
  files: FileInfo[];
}

interface ErrorResponse {
  error: string;
}
```

### Hook personalizado
```typescript
import { useState, useCallback } from 'react';

const useFileManager = (baseUrl = 'http://localhost:3000') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<FileInfo> => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse | ErrorResponse = await response.json();

      if (response.ok) {
        return (result as UploadResponse).file;
      } else {
        throw new Error((result as ErrorResponse).error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const getFiles = useCallback(async (): Promise<FileInfo[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/files`);
      const result: FilesResponse | ErrorResponse = await response.json();

      if (response.ok) {
        return (result as FilesResponse).files;
      } else {
        throw new Error((result as ErrorResponse).error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const deleteFile = useCallback(async (filename: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/files/${filename}`, {
        method: 'DELETE',
      });

      const result: { message: string } | ErrorResponse = await response.json();

      if (!response.ok) {
        throw new Error((result as ErrorResponse).error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const downloadFile = useCallback((filename: string) => {
    const url = `${baseUrl}/files/${filename}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [baseUrl]);

  return {
    uploadFile,
    getFiles,
    deleteFile,
    downloadFile,
    loading,
    error,
  };
};
```

### Componente de ejemplo
```typescript
import React, { useState, useEffect } from 'react';

const FileManagerComponent: React.FC = () => {
  const { uploadFile, getFiles, deleteFile, downloadFile, loading, error } = useFileManager();
  const [files, setFiles] = useState<FileInfo[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const fileList = await getFiles();
      setFiles(fileList);
    } catch (err) {
      console.error('Error al cargar archivos:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile(file);
      await loadFiles(); // Recargar lista
      event.target.value = ''; // Limpiar input
    } catch (err) {
      console.error('Error al subir archivo:', err);
    }
  };

  const handleDelete = async (filename: string) => {
    if (window.confirm('¿Eliminar archivo?')) {
      try {
        await deleteFile(filename);
        await loadFiles(); // Recargar lista
      } catch (err) {
        console.error('Error al eliminar archivo:', err);
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileUpload}
        disabled={loading}
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <div>
        {files.map((file) => (
          <div key={file.id}>
            <span>{file.filename}</span>
            <button onClick={() => downloadFile(file.filename)}>
              Descargar
            </button>
            <button onClick={() => handleDelete(file.filename)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🔷 Axios (JavaScript/TypeScript)

### Configuración
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000, // 30 segundos para uploads grandes
});
```

### Subir archivo con progreso
```javascript
async function uploadFileWithProgress(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      },
    });

    return response.data.file;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
```

---

## 🐍 Python/Requests

```python
import requests
import os

class FileManagerClient:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url

    def upload_file(self, file_path):
        """Sube un archivo al servidor"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

        with open(file_path, 'rb') as file:
            files = {'file': file}
            response = requests.post(f"{self.base_url}/upload", files=files)
            
            if response.status_code == 200:
                return response.json()['file']
            else:
                raise Exception(response.json().get('error', 'Error desconocido'))

    def get_files(self):
        """Obtiene lista de archivos"""
        response = requests.get(f"{self.base_url}/files")
        
        if response.status_code == 200:
            return response.json()['files']
        else:
            raise Exception(response.json().get('error', 'Error desconocido'))

    def download_file(self, filename, save_path=None):
        """Descarga un archivo"""
        response = requests.get(f"{self.base_url}/files/{filename}")
        
        if response.status_code == 200:
            if save_path is None:
                save_path = filename
                
            with open(save_path, 'wb') as file:
                file.write(response.content)
            return save_path
        else:
            raise Exception(response.json().get('error', 'Error desconocido'))

    def delete_file(self, filename):
        """Elimina un archivo"""
        response = requests.delete(f"{self.base_url}/files/{filename}")
        
        if response.status_code == 200:
            return response.json()['message']
        else:
            raise Exception(response.json().get('error', 'Error desconocido'))

# Uso
client = FileManagerClient()

# Subir archivo
file_info = client.upload_file('documento.pdf')
print(f"Archivo subido: {file_info['filename']}")

# Listar archivos
files = client.get_files()
print(f"Total archivos: {len(files)}")

# Descargar archivo
client.download_file(file_info['filename'], 'descargado.pdf')

# Eliminar archivo
client.delete_file(file_info['filename'])
```

---

## 📱 React Native

```javascript
// FileManager.js
import { Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';

class FileManagerRN {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async pickAndUploadFile() {
    try {
      // Seleccionar archivo
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      // Crear FormData
      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        type: result.type,
        name: result.name,
      });

      // Subir archivo
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        return responseData.file;
      } else {
        throw new Error(responseData.error);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('Usuario canceló la selección');
        return null;
      }
      throw error;
    }
  }

  async getFiles() {
    const response = await fetch(`${this.baseUrl}/files`);
    const data = await response.json();
    
    if (response.ok) {
      return data.files;
    } else {
      throw new Error(data.error);
    }
  }
}

export default FileManagerRN;
```

---

## 🔧 cURL (Terminal)

### Subir archivo
```bash
curl -X POST \
  -F "file=@documento.pdf" \
  http://localhost:3000/upload
```

### Listar archivos  
```bash
curl -X GET http://localhost:3000/files
```

### Descargar archivo (redirección automática)
```bash
curl -L -X GET \
  -o documento_descargado.pdf \
  "http://localhost:3000/files/uploads/file-1691234567890-123456789.pdf"
```

### Obtener URL directa de S3
```bash
# Listar archivos y extraer URL de S3
curl -X GET http://localhost:3000/files | jq '.files[0].url'
# Resultado: "https://eldisco.s3.us-east-2.amazonaws.com/uploads/file-1691234567890-123456789.pdf"
```

### Eliminar archivo
```bash
curl -X DELETE "http://localhost:3000/files/uploads/file-1691234567890-123456789.pdf"
```

---

## ⚡ Manejo de Errores Recomendado

```javascript
class FileManagerError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'FileManagerError';
    this.statusCode = statusCode;
  }
}

async function safeApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.response) {
      // Error de respuesta HTTP
      throw new FileManagerError(
        error.response.data.error || 'Error del servidor',
        error.response.status
      );
    } else if (error.request) {
      // Error de red
      throw new FileManagerError('Error de conexión', 0);
    } else {
      // Error desconocido
      throw new FileManagerError(error.message, -1);
    }
  }
}
```