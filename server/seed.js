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

    // 5. Seed realistic, professional sample tickets matching assignment guidelines
    console.log('Seeding initial sample tickets...');
    const priya = await User.findOne({ email: 'priya.sharma@email.com' });
    const priyaBook = await Book.findOne({ author: priya._id, title: 'Whispers of the Ganges' });

    const rohit = await User.findOne({ email: 'rohit.kapoor@email.com' });
    const rohitBook = await Book.findOne({ author: rohit._id, title: 'Code & Karma' });

    const sneha = await User.findOne({ email: 'sneha.kulkarni@email.com' });
    const snehaBook = await Book.findOne({ author: sneha._id, title: 'The Algorithm of Love' });

    const vikram = await User.findOne({ email: 'vikram.joshi@email.com' });
    const vikramBook = await Book.findOne({ author: vikram._id, title: 'The Last Monsoon' });

    const kavita = await User.findOne({ email: 'kavita.deshmukh@email.com' });
    const kavitaBook = await Book.findOne({ author: kavita._id, title: 'Raising Roots' });

    const diya = await User.findOne({ email: 'diya.chatterjee@email.com' });
    const diyaBook = (await Book.findOne({ author: diya._id, title: "Durga’s Daughters" })) || (await Book.findOne({ author: diya._id }));

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const sampleTickets = [
      {
        author: priya._id,
        book: priyaBook?._id,
        subject: 'Royalty not received',
        description: "I published my book 4 months ago and still haven’t received any royalty payout. What’s going on? Can you please check on the status?",
        category: 'Royalty & Payments',
        priority: 'Critical',
        status: 'Open',
        aiStatus: 'done',
        aiDraft: `Dear Priya,\n\nI completely understand your concern regarding your royalty payout for "Whispers of the Ganges", especially when you are expecting timely disbursement.\n\nBookLeaf calculates royalties on a quarterly schedule and disburses payments within 45 days following the quarter close, provided your balance crosses the Rs 1,000 threshold. Checking your publishing records, "Whispers of the Ganges" has accumulated Rs 3,570 in pending royalties, and your total copies sold stand at 342.\n\nNext Step: I have escalated this directly to our finance and accounts team to verify your bank transfer batch. We will follow up with an update within 24 to 48 business hours with confirmation.\n\nWarm regards,\nBookLeaf Support Team`,
        assignedTo: null,
        unreadByAdmin: true,
        unreadByAuthor: false,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        author: rohit._id,
        book: rohitBook?._id,
        subject: 'ISBN mismatch on Amazon listing',
        description: 'My book is showing a different ISBN on Amazon than what’s on the physical copy. The physical book has 978-93-5XXXX-03-5.',
        category: 'ISBN & Metadata Issues',
        priority: 'High',
        status: 'In Progress',
        aiStatus: 'done',
        aiDraft: `Dear Rohit,\n\nOur production and catalog team is actively coordinating with Amazon India to resolve the ISBN discrepancy on "Code & Karma".\n\nWe have submitted the corrected imprint metadata to Amazon's catalog operations and are awaiting platform propagation.\n\nNext Step: We expect the updated ISBN to reflect on Amazon within 24 to 48 business hours. We will confirm as soon as it goes live.\n\nWarm regards,\nBookLeaf Support Team`,
        assignedTo: admin._id,
        unreadByAdmin: false,
        unreadByAuthor: true,
        replies: [
          {
            message: 'Hi Rohit,\n\nThank you for alerting us. An ISBN discrepancy between your physical copy and Amazon is a serious metadata issue, and we treat it with high priority.\n\nI have escalated this directly to our head of production to reconcile the registered imprint metadata and correct the Amazon listing.\n\nNext Step: We are tracking this with Amazon catalog support and will follow up with you within 48 hours with confirmation.',
            sentBy: admin._id,
            from: 'admin',
            createdAt: oneDayAgo,
          },
          {
            message: 'Thank you for the quick escalation! Looking forward to the update once it is resolved.',
            sentBy: rohit._id,
            from: 'author',
            createdAt: twelveHoursAgo,
          },
        ],
        createdAt: oneDayAgo,
        updatedAt: twelveHoursAgo,
      },
      {
        author: sneha._id,
        book: snehaBook?._id,
        subject: 'Author copies print quality issue',
        description: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
        category: 'Printing & Quality',
        priority: 'High',
        status: 'Open',
        aiStatus: 'done',
        aiDraft: `Dear Sneha,\n\nI am truly sorry to hear that your author copies of "The Algorithm of Love" arrived with blurry images and misaligned pages. You have put immense effort into your book, and the physical copies must reflect that quality.\n\nBookLeaf guarantees manufacturing quality and provides free replacement reprints for any printing or trimming defects from our Delhi printing facility.\n\nNext Step: Please reply to this ticket with 2-3 photos showing the blurry images and misaligned pages under clear lighting. Once verified, we will arrange a priority replacement reprint within 5-7 business days at no cost to you.\n\nWarm regards,\nBookLeaf Support Team`,
        assignedTo: null,
        unreadByAdmin: true,
        unreadByAuthor: false,
        createdAt: sixHoursAgo,
        updatedAt: sixHoursAgo,
      },
      {
        author: vikram._id,
        book: vikramBook?._id,
        subject: 'Book showing Currently Unavailable on Amazon',
        description: 'My book is published but it’s showing as “Currently Unavailable” on Amazon. Why is it out of stock?',
        category: 'Distribution & Availability',
        priority: 'High',
        status: 'Open',
        aiStatus: 'done',
        aiDraft: `Dear Vikram,\n\nThank you for alerting us. Seeing "The Last Monsoon" listed as "Currently Unavailable" on Amazon India is understandably concerning when readers are eager to order.\n\nThis is almost always due to an automated inventory synchronization lag between our central warehouse and Amazon's retail catalog rather than a physical stock outage.\n\nNext Step: We have triggered a manual inventory refresh with Amazon India. The listing typically restores to active ordering status within 24 to 48 hours. We are monitoring this and will confirm as soon as it goes live.\n\nWarm regards,\nBookLeaf Support Team`,
        assignedTo: null,
        unreadByAdmin: true,
        unreadByAuthor: false,
        createdAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
      },
      {
        author: kavita._id,
        book: kavitaBook?._id,
        subject: 'Typesetting timeline update',
        description: 'It’s been 3 weeks and my book is still in typesetting. When will it be done?',
        category: 'Book Status & Production Updates',
        priority: 'Medium',
        status: 'Open',
        aiStatus: 'done',
        aiDraft: `Dear Kavita,\n\nThank you for following up. Waiting three weeks in typesetting without an update is frustrating, and I appreciate your patience.\n\nI checked your production log for "Raising Roots": our typesetting team completed the preliminary layout, and interior formatting is undergoing final quality checks following the recent seasonal batch.\n\nNext Step: Your formatted interior PDF proof is scheduled for final quality review by tomorrow afternoon. You will receive your PDF proof for review by Thursday end-of-day.\n\nWarm regards,\nBookLeaf Support Team`,
        assignedTo: null,
        unreadByAdmin: true,
        unreadByAuthor: false,
        createdAt: thirtyMinsAgo,
        updatedAt: thirtyMinsAgo,
      },
      {
        author: diya._id,
        book: diyaBook?._id,
        subject: 'Update book description on Amazon',
        description: 'Can I update the description of my book on Amazon after it’s already live? I have a revised blurb ready.',
        category: 'General Inquiry',
        priority: 'Low',
        status: 'Resolved',
        aiStatus: 'done',
        aiDraft: `Dear Diya,\n\nWe have resolved the issue regarding your query for "${diyaBook?.title || "Durga's Daughters"}" at our end. Please check it out and verify if everything looks good to you.\n\nIf you have any further questions or if anything is still not right, feel free to reply directly to this ticket at any time.\n\nWarm regards,\nBookLeaf Support Team`,
        assignedTo: admin._id,
        unreadByAdmin: false,
        unreadByAuthor: false,
        replies: [
          {
            message: 'Hi Diya,\n\nYes, absolutely! You can update your book description, author bio, or keywords at any time even though your book is already live.\n\nOur catalog team has received your revised blurb and pushed the update to Amazon India and Flipkart, where it typically reflects within 3-5 business days.\n\nWe have marked this request as resolved. If you need any further modifications, feel free to reply directly to this ticket!',
            sentBy: admin._id,
            from: 'admin',
            createdAt: oneDayAgo,
          },
          {
            message: 'Thank you so much! The updated description looks fantastic on Amazon now.',
            sentBy: diya._id,
            from: 'author',
            createdAt: twelveHoursAgo,
          },
        ],
        createdAt: twoDaysAgo,
        updatedAt: twelveHoursAgo,
      },
    ];

    await Ticket.insertMany(sampleTickets);
    console.log(`Successfully seeded ${sampleTickets.length} realistic sample tickets.`);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
