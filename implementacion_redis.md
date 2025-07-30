
  Plan de implementación:

  1. Instalación de dependencias

  pnpm add redis

  2. Configuración de Redis

  - Conectar al cliente Redis
  - Configurar variables de entorno para la conexión
  - Manejar reconexión automática

  3. Estrategia de caché

  - Key pattern: file_url:{filename}
  - TTL: 3500 segundos (un poco menos que la URL firmada de 3600s)
  - Valor: La URL firmada como string

  4. Lógica del endpoint

  1. Verificar si existe en caché
  2. Si existe → devolver desde caché
  3. Si no existe → verificar en S3, generar URL, guardar en caché
  4. Invalidar caché cuando se elimine un archivo

  5. Mejoras adicionales

  - Caché también para el listado de archivos
  - Invalidación inteligente
  - Métricas de hit/miss ratio
  - Fallback si Redis falla

  6. Configuración de Redis local

  Para desarrollo necesitarás Redis corriendo:
  # Docker
  docker run -d -p 6379:6379 redis:alpine

  # O instalación local
  sudo apt install redis-server  # Ubuntu
  brew install redis             # macOS

  Preguntas antes de empezar:

  1. ¿Tienes Redis disponible? (local o servicio como ElastiCache)
  2. ¿Las URLs necesitan invalidarse cuando el archivo cambia? (o solo cuando se elimina)
  3. ¿Quieres métricas de caché? (para monitorear performance)

  ¿Arrancamos con la instalación de dependencias y configuración básica?