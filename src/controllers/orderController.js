import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';

const calculateShipping = (itemsPrice) => {
  // Free shipping over Rs. 5000, else Rs. 150
  return itemsPrice >= 5000 ? 0 : 150;
};

// Private | Create order from cart
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  if (!shippingAddress || !paymentMethod) {
    res.status(400);
    throw new Error('Shipping address and payment method are required');
  }

  // Get user's cart
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name images price discountPrice stock isActive'
  );

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty');
  }

  // Validate all items are still in stock
  for (const item of cart.items) {
    if (!item.product || !item.product.isActive) {
      res.status(400);
      throw new Error(`"${item.product?.name}" is no longer available`);
    }
    if (item.product.stock < item.quantity) {
      res.status(400);
      throw new Error(
        `"${item.product.name}" only has ${item.product.stock} left in stock`
      );
    }
  }

  // Build order items (snapshot)
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    image: item.product.images[0]?.url || '',
    price: item.price,          // use cart's snapshotted price
    quantity: item.quantity,
  }));

  const itemsPrice = cart.totalPrice;
  const shippingPrice = calculateShipping(itemsPrice);
  const totalPrice = itemsPrice + shippingPrice;

  // Create the order
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    totalPrice,
  });

  // Deduct stock & increment sold count for each product
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stock: -item.quantity, sold: item.quantity },
    });
  }

  // Clear the cart after order is placed
  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

// Private | Get logged-in user's orders
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json({ success: true, orders });
});

// Private | Get single order (owner or admin)
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Only the owner or an admin can view the order
  const isOwner = order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json({ success: true, order });
});

// Private | Cancel an order (only if still processing)
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (!['processing', 'confirmed'].includes(order.orderStatus)) {
    res.status(400);
    throw new Error(`Cannot cancel an order that is "${order.orderStatus}"`);
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, sold: -item.quantity },
    });
  }

  order.orderStatus = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = req.body.reason || 'Cancelled by user';
  await order.save();

  res.json({ success: true, order });
});

// ADMIN ROUTES

// Admin | Get all orders
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.orderStatus = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(query),
  ]);

  res.json({ success: true, total, page: Number(page), orders });
});

// Admin | Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (orderStatus) order.orderStatus = orderStatus;

  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
    if (paymentStatus === 'paid') {
      order.isPaid = true;
      order.paidAt = new Date();
    }
  }

  if (orderStatus === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  await order.save();
  res.json({ success: true, order });
});