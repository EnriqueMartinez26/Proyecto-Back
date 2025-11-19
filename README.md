# Backend 4Fun

Backend para tienda 4Fun de artículos deportivos desarrollado con Node.js, Express y MongoDB.

## Tecnologías

- Node.js
- Express
- MongoDB con Mongoose
- CORS

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Copiar `.env.example` a `.env` y configurar las variables necesarias:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/4fun
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

3. Asegurarse de tener MongoDB corriendo localmente o usar MongoDB Atlas

## Ejecución

Modo desarrollo:
```bash
npm run dev
```

Modo producción:
```bash
npm start
```

## Estructura del Proyecto

```
├── config/
│   └── database.js          # Configuración de MongoDB
├── controllers/
│   ├── authController.js    # Autenticación (registro/login)
│   ├── productController.js # Gestión de productos
│   ├── categoryController.js# Gestión de categorías
│   ├── orderController.js   # Gestión de órdenes
│   ├── cartController.js    # Gestión del carrito
│   └── userController.js    # Gestión de usuarios
├── middlewares/
│   └── errorHandler.js      # Manejo de errores
├── models/
│   ├── User.js              # Modelo de usuario
│   ├── Product.js           # Modelo de producto
│   ├── Category.js          # Modelo de categoría
│   ├── Order.js             # Modelo de orden
│   └── Cart.js              # Modelo de carrito
├── routes/
│   ├── auth.routes.js       # Rutas de autenticación
│   ├── product.routes.js    # Rutas de productos
│   ├── category.routes.js   # Rutas de categorías
│   ├── order.routes.js      # Rutas de órdenes
│   ├── cart.routes.js       # Rutas de carrito
│   └── user.routes.js       # Rutas de usuarios
├── .env                     # Variables de entorno
├── .env.example             # Plantilla de variables
├── package.json
└── server.js                # Punto de entrada
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil del usuario

### Productos
- `GET /api/products` - Obtener todos los productos (con filtros)
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Categorías
- `GET /api/categories` - Obtener todas las categorías
- `GET /api/categories/:id` - Obtener categoría por ID
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/:id` - Actualizar categoría
- `DELETE /api/categories/:id` - Eliminar categoría

### Órdenes
- `POST /api/orders` - Crear orden
- `GET /api/orders` - Obtener todas las órdenes
- `GET /api/orders/:id` - Obtener orden por ID
- `GET /api/orders/user/:userId` - Obtener órdenes de un usuario
- `PUT /api/orders/:id/status` - Actualizar estado de orden
- `PUT /api/orders/:id/pay` - Marcar orden como pagada

### Carrito
- `GET /api/cart/:userId` - Obtener carrito del usuario
- `POST /api/cart` - Agregar producto al carrito
- `PUT /api/cart` - Actualizar cantidad de producto
- `DELETE /api/cart/:userId/:itemId` - Eliminar producto del carrito
- `DELETE /api/cart/:userId` - Vaciar carrito

### Usuarios
- `GET /api/users` - Obtener todos los usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

## Notas

- La autenticación JWT y encriptación de contraseñas se implementará en una fase posterior
- Actualmente el sistema usa comparación simple de contraseñas
- Para pruebas, todos los endpoints están abiertos sin autenticación

## Autor

Enrique Martinez - 4Fun
