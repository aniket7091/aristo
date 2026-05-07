const express = require('express');
const { createOrder, getOrders, markOrderCompleted } = require('../controllers/orderController');
const { protectOwner } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createOrder);
router.get('/', protectOwner, getOrders);
router.patch('/:id/complete', protectOwner, markOrderCompleted);

module.exports = router;
