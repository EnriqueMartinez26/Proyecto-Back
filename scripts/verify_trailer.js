require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const ProductService = require('../services/productService');

const run = async () => {
    try {
        console.log("Connecting to DB...");
        // Use a simplified connection if needed, but connectDB is available
        await connectDB();

        const testData = {
            name: "Test Trailer Product " + Date.now(),
            description: "Test Description",
            price: 100,
            platform: "507f1f77bcf86cd799439011", // Fake ObjectId
            genre: "507f1f77bcf86cd799439012",    // Fake ObjectId
            type: "Digital",
            releaseDate: new Date(),
            developer: "Test Dev",
            trailerUrl: "http://example.com/trailer.mp4",
            stock: 10
        };

        console.log("Creating product with trailerUrl...");
        const result = await ProductService.createProduct(testData);

        console.log("Result:", JSON.stringify(result, null, 2));

        if (result.trailerUrl === testData.trailerUrl) {
            console.log("✅ SUCCESS: trailerUrl was saved and returned correctly.");
        } else {
            console.error("❌ FAILURE: trailerUrl mismatch. Expected " + testData.trailerUrl + ", got " + result.trailerUrl);
            process.exit(1);
        }

        // Clean up
        console.log("Cleaning up...");
        await ProductService.deleteProduct(result.id);
        console.log("Deleted test product.");

        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

run();
