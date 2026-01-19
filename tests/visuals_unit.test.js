const httpMocks = require('node-mocks-http');
const categoryController = require('../controllers/categoryController');
const platformController = require('../controllers/platformController');
const genreController = require('../controllers/genreController');
const Category = require('../models/Category');
const Platform = require('../models/Platform');
const Genre = require('../models/Genre');

// Mock Mongoose models
jest.mock('../models/Category');
jest.mock('../models/Platform');
jest.mock('../models/Genre');

describe('Visuals Management Controller Tests', () => {

    describe('Category Controller - deleteCategories', () => {
        it('should return error if no IDs provided', async () => {
            const req = httpMocks.createRequest({
                method: 'DELETE',
                body: {}
            });
            const res = httpMocks.createResponse();

            await categoryController.deleteCategories(req, res);
            const data = res._getJSONData(); // Use _getJSONData() instead of _getData()

            expect(res.statusCode).toBe(400);
            expect(data.success).toBe(false);
        });

        it('should delete categories given an array of IDs', async () => {
            const req = httpMocks.createRequest({
                method: 'DELETE',
                body: ['id1', 'id2']
            });
            const res = httpMocks.createResponse();

            Category.deleteMany.mockResolvedValue({ deletedCount: 2 });

            await categoryController.deleteCategories(req, res);
            const data = res._getJSONData();

            // Check if status code is 200 (default for res.json)
            // Note: node-mocks-http defaults status to 200 unless set
            expect(res.statusCode).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toContain('2 categorías eliminadas');
        });
    });

    describe('Platform Controller - getPlatform', () => {
        it('should return platform data if found by custom ID', async () => {
            const req = httpMocks.createRequest({
                params: { id: 'plat1' }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            Platform.findOne.mockResolvedValue({
                id: 'plat1',
                nombre: 'Platform 1',
                imageId: 'img1',
                activo: true
            });

            await platformController.getPlatform(req, res, next);
            const data = res._getJSONData();

            expect(res.statusCode).toBe(200);
            expect(data.data.name).toBe('Platform 1');
        });

        it('should call next with error if not found', async () => {
            const req = httpMocks.createRequest({
                params: { id: 'unknown' }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            Platform.findOne.mockResolvedValue(null);

            await platformController.getPlatform(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(next.mock.calls[0][0].message).toBe('Plataforma no encontrada');
        });
    });

    describe('Genre Controller - getGenre', () => {
        it('should return genre data if found by custom ID', async () => {
            const req = httpMocks.createRequest({
                params: { id: 'gen1' }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            Genre.findOne.mockResolvedValue({
                id: 'gen1',
                nombre: 'Genre 1',
                imageId: 'img1',
                activo: true
            });

            await genreController.getGenre(req, res, next);
            const data = res._getJSONData();

            expect(res.statusCode).toBe(200);
            expect(data.data.name).toBe('Genre 1');
        });
    });
});
