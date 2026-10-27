import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import User from './models/User.js';
import Book from './models/Book.js';
import Ticket from './models/Ticket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Clear existing collections to ensure idempotent execution
    console.log('Clearing existing data from Users, Books, and Tickets...');
    await User.deleteMany({});
    await Book.deleteMany({});
    await Ticket.deleteMany({});

    // 2. Read sample JSON data
    const dataFilePath = path.join(__dirname, 'data', 'bookleaf_sample_data.json');
    const rawData = await fs.readFile(dataFilePath, 'utf-8');
    const { authors } = JSON.parse(rawData);

    // 3. Create Admin account (admin@bookleaf.com / admin123)
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'BookLeaf Admin',
      email: 'admin@bookleaf.com',
      password: adminPasswordHash,
      role: 'admin',
    });
    console.log(`Created admin account: ${admin.email}`);

    // 4. Create Authors and their associated Books
    const authorPasswordHash = await bcrypt.hash('author123', 10);
    let totalBooksCreated = 0;

    for (const authorData of authors) {
      // Create author user
      const user = await User.create({
        name: authorData.name,
        email: authorData.email.toLowerCase().trim(),
        password: authorPasswordHash,
        role: 'author',
        phone: authorData.phone || '',
        city: authorData.city || '',
        author_id: authorData.author_id || '',
      });

      // Prepare and insert author's books
      if (Array.isArray(authorData.books) && authorData.books.length > 0) {
        const bookDocs = authorData.books.map((b) => ({
          author: user._id,
          book_id: b.book_id || '',
          title: b.title,
          isbn: b.isbn,
          genre: b.genre,
          publication_date: b.publication_date ?? null,
          status: b.status,
          mrp: b.mrp ?? null,
          author_royalty_per_copy: b.author_royalty_per_copy ?? null,
          total_copies_sold: b.total_copies_sold ?? 0,
          total_royalty_earned: b.total_royalty_earned ?? 0,
          royalty_paid: b.royalty_paid ?? 0,
          royalty_pending: b.royalty_pending ?? 0,
          last_royalty_payout_date: b.last_royalty_payout_date ?? null,
          print_partner: b.print_partner ?? null,
          available_on: Array.isArray(b.available_on) ? b.available_on : [],
        }));

        await Book.insertMany(bookDocs);
        totalBooksCreated += bookDocs.length;
      }
    }

    console.log(`Successfully seeded ${authors.length} authors and ${totalBooksCreated} books.`);
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
