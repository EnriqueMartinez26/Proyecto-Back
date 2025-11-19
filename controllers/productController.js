const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.getProducts = async (req, res) => {
  try { const products = await Product.find(); res.json(products); } 
  catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'ID inválido' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'No encontrado' });
    res.json(product);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updateProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'ID inválido' });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Eliminado' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};