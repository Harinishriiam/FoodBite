// routes/api.js - REST API routes for FoodBite
const express = require('express');
const router = express.Router();
const { menuItems, categories } = require('../data/menu');
const { getRecommendations } = require('../services/aiService');

// In-memory store for orders in prototype
const activeOrders = new Map();

// Valid promo coupons
const COUPONS = {
  TASTY50: { discount: 50, type: 'flat', minOrder: 199, label: "₹50 OFF on orders above ₹199" },
  FOODBITE: { discount: 20, type: 'percent', maxDiscount: 100, minOrder: 250, label: "20% OFF (Up to ₹100)" },
  SWEET20: { discount: 30, type: 'flat', minOrder: 150, label: "₹30 OFF on desserts & snacks" }
};

// GET /api/menu - List all items with optional filters
router.get('/menu', (req, res) => {
  let { category, search, isVeg, maxPrice, spicyOnly, sortBy } = req.query;
  let items = [...menuItems];

  // Category filter
  if (category && category !== 'All') {
    items = items.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }

  // Dietary filter
  if (isVeg !== undefined && isVeg !== '') {
    const vegBool = isVeg === 'true' || isVeg === true;
    items = items.filter(item => item.isVeg === vegBool);
  }

  // Max price filter
  if (maxPrice && !isNaN(Number(maxPrice))) {
    items = items.filter(item => item.price <= Number(maxPrice));
  }

  // Spicy filter
  if (spicyOnly === 'true' || spicyOnly === true) {
    items = items.filter(item => item.spicyLevel >= 2);
  }

  // Text search
  if (search && search.trim() !== '') {
    const s = search.trim().toLowerCase();
    items = items.filter(item =>
      item.name.toLowerCase().includes(s) ||
      item.description.toLowerCase().includes(s) ||
      item.category.toLowerCase().includes(s) ||
      item.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  // Sorting
  if (sortBy === 'price_asc') {
    items.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price_desc') {
    items.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    items.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'prep_time') {
    items.sort((a, b) => parseInt(a.prepTime) - parseInt(b.prepTime));
  }

  res.json({
    success: true,
    total: items.length,
    categories,
    items
  });
});

// GET /api/menu/:id - Single item
router.get('/menu/:id', (req, res) => {
  const item = menuItems.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  res.json({ success: true, item });
});

// POST /api/ai/recommend - AI Food Recommendation Chatbot endpoint
router.post('/ai/recommend', (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ success: false, message: 'Please provide a valid query' });
  }

  try {
    const recommendationResult = getRecommendations(query.trim());
    res.json({
      success: true,
      query: query.trim(),
      ...recommendationResult
    });
  } catch (err) {
    console.error('Error in AI recommendation:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process culinary recommendation',
      error: err.message
    });
  }
});

// POST /api/coupons/validate - Validate coupon code
router.post('/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Please enter a coupon code' });
  }

  const coupon = COUPONS[code.toUpperCase()];
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid coupon code. Try TASTY50 or FOODBITE!' });
  }

  if (subtotal < coupon.minOrder) {
    return res.status(400).json({
      success: false,
      message: `Minimum order amount of ₹${coupon.minOrder} required for ${code.toUpperCase()}`
    });
  }

  let discountAmount = 0;
  if (coupon.type === 'flat') {
    discountAmount = coupon.discount;
  } else if (coupon.type === 'percent') {
    discountAmount = Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount || 9999);
  }

  res.json({
    success: true,
    code: code.toUpperCase(),
    discountAmount: Math.round(discountAmount),
    label: coupon.label
  });
});

// POST /api/orders - Place simulated order
router.post('/orders', (req, res) => {
  const { items, customer, couponCode } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart cannot be empty' });
  }

  // Calculate pricing server-side for integrity
  let subtotal = 0;
  const verifiedItems = [];

  for (const itemReq of items) {
    const menuItem = menuItems.find(m => m.id === itemReq.id);
    if (!menuItem) continue;
    const qty = Math.max(1, parseInt(itemReq.quantity || 1, 10));
    subtotal += menuItem.price * qty;
    verifiedItems.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
      image: menuItem.image,
      itemTotal: menuItem.price * qty
    });
  }

  if (verifiedItems.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid items found in order' });
  }

  // Calculate discount if valid
  let discountAmount = 0;
  if (couponCode && COUPONS[couponCode.toUpperCase()]) {
    const coupon = COUPONS[couponCode.toUpperCase()];
    if (subtotal >= coupon.minOrder) {
      discountAmount = coupon.type === 'flat'
        ? coupon.discount
        : Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount || 9999);
    }
  }

  // Delivery fee: Free over ₹399, otherwise ₹39
  const deliveryFee = subtotal >= 399 ? 0 : 39;
  const gstCharges = Math.round((subtotal - discountAmount) * 0.05); // 5% GST on food
  const platformFee = 7;
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee + gstCharges + platformFee);

  const orderId = 'FB-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const etaMinutes = 28 + Math.floor(Math.random() * 12); // 28-40 mins

  const order = {
    orderId,
    createdAt: now.toISOString(),
    etaMinutes,
    status: 'received', // received -> preparing -> out_for_delivery -> delivered
    statusSteps: [
      { step: 'Order Placed', time: 'Just now', completed: true },
      { step: 'Kitchen Accepted & Preparing', time: 'Est. 5 mins', completed: false },
      { step: 'Rider Picked Up', time: 'Est. 15 mins', completed: false },
      { step: 'Delivered at Doorstep', time: `Est. ${etaMinutes} mins`, completed: false }
    ],
    customer: {
      name: customer?.name || 'Valued Foodie',
      phone: customer?.phone || '+91 98765 43210',
      address: customer?.address || '204, Green Heights, Tech Hub, Phase 2',
      notes: customer?.notes || '',
      paymentMethod: customer?.paymentMethod || 'UPI (Google Pay)'
    },
    items: verifiedItems,
    bill: {
      subtotal,
      discountAmount: Math.round(discountAmount),
      deliveryFee,
      gstCharges,
      platformFee,
      grandTotal: Math.round(grandTotal)
    }
  };

  activeOrders.set(orderId, order);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully! FoodBite kitchen is cooking.',
    order
  });
});

// GET /api/orders/:id - Get order tracking status
router.get('/orders/:id', (req, res) => {
  const order = activeOrders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Calculate elapsed progress for realistic live simulation
  const elapsedSeconds = Math.floor((new Date() - new Date(order.createdAt)) / 1000);
  if (elapsedSeconds > 15) {
    order.status = 'preparing';
    order.statusSteps[1].completed = true;
  }
  if (elapsedSeconds > 45) {
    order.status = 'out_for_delivery';
    order.statusSteps[2].completed = true;
  }
  if (elapsedSeconds > 120) {
    order.status = 'delivered';
    order.statusSteps[3].completed = true;
  }

  res.json({ success: true, order });
});

module.exports = router;
