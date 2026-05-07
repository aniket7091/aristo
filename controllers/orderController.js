const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

const createOrder = async (req, res, next) => {
  try {
    const { customerName, tableNumber, items } = req.body;

    if (!customerName || !tableNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, table number, and at least one item are required.'
      });
    }

    const normalizedTable = Number(tableNumber);
    if (Number.isNaN(normalizedTable) || normalizedTable < 1) {
      return res.status(400).json({ success: false, message: 'Table number must be a valid positive number.' });
    }

    const menuIds = items.map((item) => item.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuIds } });
    const menuMap = new Map(menuItems.map((item) => [item._id.toString(), item]));

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = menuMap.get(item.menuItemId);
      const quantity = Number(item.quantity);

      if (!menuItem) {
        return res.status(404).json({ success: false, message: 'One or more selected menu items no longer exist.' });
      }

      if (Number.isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Each order item quantity must be at least 1.' });
      }

      totalAmount += menuItem.price * quantity;
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        imageUrl: menuItem.imageUrl
      });
    }

    const order = await Order.create({
      customerName: customerName.trim(),
      tableNumber: normalizedTable,
      items: orderItems,
      totalAmount,
      status: 'current'
    });

    res.status(201).json({ success: true, message: 'Order placed successfully.', order });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const { status, tableNumber } = req.query;
    const query = {};

    if (status && ['current', 'completed'].includes(status)) {
      query.status = status;
    }

    if (tableNumber) {
      query.tableNumber = Number(tableNumber);
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    const groupedOrders = orders.reduce((accumulator, order) => {
      const tableKey = `Table ${order.tableNumber}`;
      if (!accumulator[tableKey]) {
        accumulator[tableKey] = [];
      }
      accumulator[tableKey].push(order);
      return accumulator;
    }, {});

    res.json({ success: true, count: orders.length, groupedOrders, orders });
  } catch (error) {
    next(error);
  }
};

const markOrderCompleted = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: 'Order marked as completed.', order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  markOrderCompleted
};
