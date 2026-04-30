import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const products = [
  {
    name: 'Whey Protein Isolate',
    description: 'Premium whey protein isolate with 27g protein per serving. Fast absorbing, low lactose, ideal post-workout.',
    price: 4500,
    category: 'protein',
    brand: 'MuscleBlaze',
    stock: 50,
    isFeatured: true,
    images: [{ url: 'https://placehold.co/400x400?text=Whey+Protein', alt: 'Whey Protein' }],
    tags: ['muscle gain', 'post-workout', 'isolate'],
  },
  {
    name: 'Creatine Monohydrate',
    description: 'Pure micronized creatine monohydrate. Increases strength, power, and muscle volume.',
    price: 1800,
    category: 'creatine',
    brand: 'Optimum Nutrition',
    stock: 80,
    isFeatured: true,
    images: [{ url: 'https://placehold.co/400x400?text=Creatine', alt: 'Creatine' }],
    tags: ['strength', 'power', 'beginner-friendly'],
  },
  {
    name: 'Adjustable Dumbbell Set',
    description: 'Space-saving adjustable dumbbells from 5kg to 32kg. Perfect for home gyms.',
    price: 15000,
    discountPrice: 12999,
    category: 'equipment',
    brand: 'PowerBlock',
    stock: 15,
    isFeatured: true,
    images: [{ url: 'https://placehold.co/400x400?text=Dumbbells', alt: 'Dumbbells' }],
    tags: ['home gym', 'strength training'],
  },
  {
    name: 'Gym Gloves Pro',
    description: 'Full palm protection with wrist support. Anti-slip grip for heavy lifting.',
    price: 850,
    category: 'accessories',
    brand: 'FitForge',
    stock: 100,
    images: [{ url: 'https://placehold.co/400x400?text=Gym+Gloves', alt: 'Gym Gloves' }],
    tags: ['protection', 'grip', 'lifting'],
  },
  {
    name: 'Compression Gym T-Shirt',
    description: 'Moisture-wicking compression fit for maximum performance. Available in multiple colors.',
    price: 1200,
    category: 'apparel',
    brand: 'FitForge',
    stock: 60,
    images: [{ url: 'https://placehold.co/400x400?text=T-Shirt', alt: 'Gym T-Shirt' }],
    tags: ['compression', 'performance', 'moisture-wicking'],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log('Products seeded successfully');
    process.exit();
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();