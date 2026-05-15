const Table = require('../models/Table');

exports.getAllTables = async (req, res) => {
  const tables = await Table.find().sort({ tableNumber: 1 });
  res.json(tables);
};

exports.updateTableStatus = async (req, res) => {
  const { tableNumber, status } = req.body;
  const table = await Table.findOneAndUpdate({ tableNumber }, { status }, { new: true, upsert: true });
  res.json(table);
};