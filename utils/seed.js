// utils/seed.js
// Seeds the database with an admin user and sample data
// Run once with: node utils/seed.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');

const seed = async () => {
  try {
    console.log('🌱 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ─── Create Admin User ─────────────────────────────────────────────────
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    const existingAdmin = await User.findOne({ email: adminEmail });

    let admin;
    if (existingAdmin) {
      console.log(`ℹ️  Admin already exists: ${adminEmail}`);
      admin = existingAdmin;
    } else {
      admin = await User.create({
        name: 'مدير النظام',
        email: adminEmail,
        password: adminPassword, // Hashed automatically by model
        role: 'admin',
      });
      console.log(`✅ Admin created: ${adminEmail}`);
    }

    // ─── Create Sample Course ──────────────────────────────────────────────
    const existingCourse = await Course.findOne({ title: 'أساسيات المحاسبة المالية' });

    if (!existingCourse) {
      const course = await Course.create({
        title: 'أساسيات المحاسبة المالية',
        description:
          'دورة شاملة تغطي المفاهيم الأساسية للمحاسبة المالية من القيد المزدوج إلى إعداد القوائم المالية.',
        category: 'محاسبة',
        level: 'مبتدئ',
        isPublished: true,
        tags: ['محاسبة', 'مالية', 'قوائم مالية'],
        createdBy: admin._id,
        chapters: [
          {
            title: 'الفصل الأول: مقدمة في المحاسبة',
            description: 'نظرة عامة على مفهوم المحاسبة وأهميتها',
            order: 0,
            videos: [
              {
                title: 'ما هي المحاسبة؟',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                duration: '10:30',
                description: 'تعريف المحاسبة وأهدافها',
                order: 0,
              },
              {
                title: 'مبدأ القيد المزدوج',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                duration: '15:45',
                description: 'شرح مبدأ القيد المزدوج وكيفية تطبيقه',
                order: 1,
              },
            ],
          },
          {
            title: 'الفصل الثاني: القوائم المالية',
            description: 'إعداد وتحليل القوائم المالية الأساسية',
            order: 1,
            videos: [
              {
                title: 'قائمة الدخل',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                duration: '20:00',
                description: 'كيفية إعداد قائمة الدخل',
                order: 0,
              },
            ],
          },
        ],
      });

      console.log(`✅ Sample course created: "${course.title}"`);

      // ─── Create Sample Quiz ──────────────────────────────────────────────
      await Quiz.create({
        title: 'اختبار أساسيات المحاسبة',
        description: 'اختبر معلوماتك في المحاسبة المالية الأساسية',
        course: course._id,
        difficulty: 'سهل',
        timeLimit: 15,
        isPublished: true,
        createdBy: admin._id,
        questions: [
          {
            question: 'ما هو مبدأ القيد المزدوج في المحاسبة؟',
            options: [
              'تسجيل كل عملية في دفترين مختلفين',
              'لكل عملية مدين ودائن بنفس المبلغ',
              'تسجيل العمليات مرتين في نفس الدفتر',
              'لا شيء مما سبق',
            ],
            correctAnswer: 1,
            explanation: 'مبدأ القيد المزدوج يعني أن لكل عملية جانبين: مدين ودائن بنفس المبلغ',
            order: 0,
          },
          {
            question: 'أي من القوائم المالية التالية تُظهر المركز المالي للمنشأة؟',
            options: ['قائمة الدخل', 'قائمة التدفقات النقدية', 'الميزانية العمومية', 'قائمة حقوق الملكية'],
            correctAnswer: 2,
            explanation: 'الميزانية العمومية (قائمة المركز المالي) تُظهر الأصول والخصوم وحقوق الملكية',
            order: 1,
          },
          {
            question: 'ما الفرق بين الأصول والخصوم؟',
            options: [
              'الأصول هي ما تملكه المنشأة، الخصوم هي ما تدين به',
              'الأصول هي ما تدين به المنشأة، الخصوم هي ما تملكه',
              'لا فرق بينهما',
              'الأصول أكبر دائماً من الخصوم',
            ],
            correctAnswer: 0,
            explanation: 'الأصول = ما تملكه المنشأة، الخصوم = الالتزامات المالية',
            order: 2,
          },
        ],
      });

      console.log('✅ Sample quiz created');
    } else {
      console.log('ℹ️  Sample data already exists, skipping...');
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log(`\n📧 Admin login:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change the admin password in production!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

seed();
