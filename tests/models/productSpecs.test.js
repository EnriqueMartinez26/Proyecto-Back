const Product = require('../../models/Product');
const { PC_SPECS } = require('../../utils/constants');

describe('Product Model - Specs', () => {
    it('Debe aceptar cualquier desarrollador (campo libre)', () => {
        const product = new Product({ desarrollador: 'Indie Dev 123' });
        const err = product.validateSync();
        if (err) {
            expect(err.errors['desarrollador']).toBeUndefined();
        }
    });

    it('Debe auto-completar requisitos basado en el preset', () => {
        const product = new Product({
            nombre: 'Test Game',
            specPreset: 'High',
            descripcion: 'Desc',
            precio: 10,
            plataformaId: '1',
            generoId: '1',
            tipo: 'Digital',
            fechaLanzamiento: new Date(),
            desarrollador: 'Test Studio',
            stock: 1
        });

        if (product.specPreset && PC_SPECS[product.specPreset.toUpperCase()]) {
            product.requisitos = PC_SPECS[product.specPreset.toUpperCase()];
        }

        expect(product.requisitos).toEqual(PC_SPECS.HIGH);
    });
});
