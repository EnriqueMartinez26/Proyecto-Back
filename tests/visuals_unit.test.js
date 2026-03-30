const httpMocks = require('node-mocks-http');
const platformController = require('../controllers/platformController');
const genreController = require('../controllers/genreController');
const Platform = require('../models/Platform');
const Genre = require('../models/Genre');

// Mock Mongoose models
jest.mock('../models/Platform');
jest.mock('../models/Genre');

describe('Visuals Management Controller Tests', () => {

    describe('Platform Controller - getPlatform', () => {
        it('should return platform data if found by custom ID', async () => {
            const req = httpMocks.createRequest({
                params: { id: 'plat1' }
            });
            const res = httpMocks.createResponse();
            const next = jest.fn();

            // Mongoose findOne returns a query chain; mock .lean() on the chain
            Platform.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    id: 'plat1',
                    nombre: 'Platform 1',
                    imageId: 'img1',
                    activo: true
                })
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

            Platform.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            });

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

            Genre.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    id: 'gen1',
                    nombre: 'Genre 1',
                    imageId: 'img1',
                    activo: true
                })
            });

            await genreController.getGenre(req, res, next);
            const data = res._getJSONData();

            expect(res.statusCode).toBe(200);
            expect(data.data.name).toBe('Genre 1');
        });
    });
});
