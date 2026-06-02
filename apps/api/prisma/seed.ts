import { PrismaClient, EventStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
  // Cities
  const lviv = await prisma.city.upsert({
    where: { slug: 'lviv' },
    update: { nameEn: 'Lviv' },
    create: { name: 'Львів', nameEn: 'Lviv', slug: 'lviv' },
  });

  // Categories (uk name → en name)
  const categoryNames: Array<[string, string]> = [
    ['Забіги', 'Runs'],
    ['Дегустації', 'Tastings'],
    ['Воркшопи', 'Workshops'],
    ['Музика', 'Music'],
    ['Маркети', 'Markets'],
  ];
  const categories: Record<string, { id: string }> = {};
  for (const [name, nameEn] of categoryNames) {
    const slug = slugify(name);
    categories[slug] = await prisma.category.upsert({
      where: { slug },
      update: { nameEn },
      create: { name, nameEn, slug },
    });
  }

  // Test organizer (user + organizer profile)
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@shodumo.dev' },
    update: {},
    create: {
      email: 'organizer@shodumo.dev',
      passwordHash,
      role: Role.ORGANIZER,
    },
  });

  const organizer = await prisma.organizer.upsert({
    where: { userId: organizerUser.id },
    update: { bioEn: 'We host cool micro-events in Lviv.' },
    create: {
      userId: organizerUser.id,
      name: 'ShoDumo Crew',
      bio: 'Організовуємо круті міні-івенти у Львові.',
      bioEn: 'We host cool micro-events in Lviv.',
      links: { instagram: 'https://instagram.com/shodumo' },
    },
  });

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@shodumo.dev' },
    update: {},
    create: {
      email: 'admin@shodumo.dev',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // Events
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const events = [
    {
      title: 'Ранковий забіг по Стрийському парку',
      titleEn: 'Morning run in Stryiskyi Park',
      category: 'Забіги',
      startsAt: new Date(now + 2 * day),
      isPaid: false,
      lat: 49.8201,
      lng: 24.0186,
      address: 'Стрийський парк, Львів',
    },
    {
      title: 'Дегустація крафтового вина',
      titleEn: 'Craft wine tasting',
      category: 'Дегустації',
      startsAt: new Date(now + 4 * day),
      isPaid: true,
      price: 350,
      lat: 49.8419,
      lng: 24.0315,
      address: 'вул. Вірменська, 12',
    },
    {
      title: 'Воркшоп з кераміки',
      titleEn: 'Ceramics workshop',
      category: 'Воркшопи',
      startsAt: new Date(now + 6 * day),
      isPaid: true,
      price: 500,
      lat: 49.8397,
      lng: 24.0297,
      address: 'вул. Лесі Українки, 5',
    },
    {
      title: 'Джазовий вечір на даху',
      titleEn: 'Rooftop jazz evening',
      category: 'Музика',
      startsAt: new Date(now + 7 * day),
      isPaid: true,
      price: 250,
      lat: 49.8429,
      lng: 24.0312,
      address: 'пл. Ринок, 1',
    },
    {
      title: 'Маркет локальних виробників',
      titleEn: 'Local makers market',
      category: 'Маркети',
      startsAt: new Date(now + 9 * day),
      isPaid: false,
      lat: 49.8356,
      lng: 24.0247,
      address: 'Площа Ринок',
    },
    {
      title: 'Нічний забіг світлячків',
      titleEn: 'Fireflies night run',
      category: 'Забіги',
      startsAt: new Date(now + 11 * day),
      isPaid: false,
      lat: 49.815,
      lng: 24.025,
      address: 'Парк Знесіння, Львів',
    },
  ];

  for (const e of events) {
    const slug = slugify(e.title);
    const descriptionEn = `${e.titleEn} — come along, it'll be fun!`;
    await prisma.event.upsert({
      where: { slug },
      update: { titleEn: e.titleEn, descriptionEn },
      create: {
        organizerId: organizer.id,
        cityId: lviv.id,
        categoryId: categories[slugify(e.category)].id,
        title: e.title,
        titleEn: e.titleEn,
        slug,
        description: `${e.title} — приходь, буде цікаво!`,
        descriptionEn,
        startsAt: e.startsAt,
        address: e.address,
        lat: e.lat,
        lng: e.lng,
        isPaid: e.isPaid,
        price: e.price ?? null,
        status: EventStatus.PUBLISHED,
      },
    });
  }

  console.log('Seed completed: 1 city, 5 categories, organizer + admin, 6 events.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
