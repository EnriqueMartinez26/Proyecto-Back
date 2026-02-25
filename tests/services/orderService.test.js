const OrderService = require('../../services/orderService.js');
const Product = require('../../models/Product.js');
const Order = require('../../models/Order.js');
const ErrorResponse = require('../../utils/errorResponse.js');
// No necesitamos importar 'mercadopago' real aquí porque lo mockeamos abajo

// --- CONFIGURACIÓN DE ENTORNO PARA TESTS ---
// Inyectamos valores falsos para pasar las validaciones de seguridad del servicio
process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST_TOKEN_123';
process.env.BACKEND_URL = 'http://test.local'; // Para pasar la validación de Ngrok
process.env.FRONTEND_URL = 'http://localhost:3000';

// --- MOCKS ---
jest.mock('../../models/Product');
jest.mock('../../models/Order');
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Preference: jest.fn(() => ({
    create: jest.fn().mockResolvedValue({
      id: 'pref_123',
      init_point: 'https://mercadopago.com/checkout/123',
      sandbox_init_point: 'https://sandbox.mercadopago.com/checkout/123'
    })
  })),
  Payment: jest.fn()
}));

describe('OrderService - Create Order', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debe lanzar error si no hay items', async () => {
    await expect(OrderService.createOrder({ orderItems: [] }))
      .rejects.toThrow('El carrito está vacío.');
    // .rejects.toHaveProperty('statusCode', 400); // Verify generic empty cart error response
  });

  it('Debe lanzar ErrorResponse 400 si un producto no existe', async () => {
    Product.findById.mockResolvedValue(null);
    try {
      await OrderService.createOrder({
        user: 'u1',
        orderItems: [{ product: 'invalid_id', quantity: 1, name: 'Ghost' }]
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorResponse);
      expect(error.statusCode).toBe(400);
      expect(error.message).toMatch(/Producto no encontrado/);
    }
  });

  it('Debe crear una orden correctamente y descontar stock', async () => {
    // 1. Arrange
    const mockUser = 'user_123';
    const mockItems = [{ product: 'prod_1', quantity: 1, name: 'Juego Test' }];

    // Mock de la BD
    Product.findById.mockResolvedValue({
      _id: 'prod_1',
      nombre: 'Juego Test',
      precio: 100,
      stock: 10,
      descripcion: 'Desc'
    });

    Order.create.mockResolvedValue({
      _id: 'order_123',
      save: jest.fn()
    });

    // 2. Act
    const result = await OrderService.createOrder({
      user: mockUser,
      orderItems: mockItems,
      shippingAddress: {},
      paymentMethod: 'mercadopago'
    });

    // 3. Assert
    // Verificamos que nos devuelva el link (init_point o sandbox_init_point)
    expect(result.paymentLink).toMatch(/mercadopago\.com\/checkout/);

    // Verificar descuento de stock
    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      'prod_1',
      { $inc: { stock: -1, cantidadVendida: 1 } }
    );
  });

  it('Debe fallar si no hay stock suficiente', async () => {
    Product.findById.mockResolvedValue({
      _id: 'prod_1',
      nombre: 'Juego Agotado',
      precio: 100,
      stock: 0
    });

    await expect(OrderService.createOrder({
      user: 'user_123',
      orderItems: [{ product: 'prod_1', quantity: 1, name: 'Juego Agotado' }]
    })).rejects.toThrow('Stock insuficiente');
  });
});