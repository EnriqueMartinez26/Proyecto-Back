require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    }
};

const fixProduct = async () => {
    await connectDB();

    const productId = '697093e0d1cde70d7a009be8'; // ID from user screenshot

    // PC Specs from constants (High)
    const highSpecs = {
        os: 'Windows 11 64-bit',
        processor: 'Intel Core i7-13700K / AMD Ryzen 7 7800X3D',
        memory: '32 GB RAM',
        graphics: 'NVIDIA GeForce RTX 4070 / AMD Radeon RX 7800 XT',
        storage: '100 GB available space (NVMe SSD)'
    };

    try {
        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found!');
            // Try to find by name "ASD" just in case ID from URL was weird
            const productByName = await Product.findOne({ nombre: 'ASD' });
            if (productByName) {
                console.log('Found by name: ASD');
                productByName.specPreset = 'High';
                productByName.requisitos = highSpecs;
                await productByName.save();
                console.log('Product ASD updated successfully!');
            } else {
                console.log('Product ASD absolutely not found.');
            }
        } else {
            console.log(`Found product: ${product.nombre}`);
            product.specPreset = 'High';
            product.requisitos = highSpecs;
            await product.save();
            console.log('Product updated successfully!');
        }
    } catch (error) {
        console.error('Error updating product:', error);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

fixProduct();
