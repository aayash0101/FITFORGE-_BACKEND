import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate(
    'items.product',
    'name images price stock isActive'
  );
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// Private | Get current user's cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ success: true, cart });
});

// Private | Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Validate product exists and is in stock
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (product.stock < quantity) {
    res.status(400);
    throw new Error(`Only ${product.stock} items left in stock`);
  }

  const cart = await getOrCreateCart(req.user._id);

  // Check if product already in cart
  const existingItem = cart.items.find(
    (item) => item.product._id.toString() === productId
  );

  if (existingItem) {
    // Check combined quantity doesn't exceed stock
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) {
      res.status(400);
      throw new Error(`Cannot add more — only ${product.stock} in stock`);
    }
    existingItem.quantity = newQty;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.discountPrice > 0 ? product.discountPrice : product.price,
    });
  }

  await cart.save();

  // Re-populate after save so response has full product details
  await cart.populate('items.product', 'name images price stock isActive');

  res.status(201).json({ success: true, cart });
});

// Private | Update quantity of a cart item
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (!quantity || quantity < 1) {
    res.status(400);
    throw new Error('Quantity must be at least 1');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  if (quantity > product.stock) {
    res.status(400);
    throw new Error(`Only ${product.stock} items available`);
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const item = cart.items.find(
    (item) => item.product.toString() === productId
  );
  if (!item) {
    res.status(404);
    throw new Error('Item not in cart');
  }

  item.quantity = quantity;
  await cart.save();
  await cart.populate('items.product', 'name images price stock isActive');

  res.json({ success: true, cart });
});

// Private | Remove a single item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId
  );

  if (cart.items.length === initialLength) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  await cart.save();
  await cart.populate('items.product', 'name images price stock isActive');

  res.json({ success: true, cart });
});

// Private | Clear entire cart
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  cart.items = [];
  await cart.save();

  res.json({ success: true, message: 'Cart cleared', cart });
});