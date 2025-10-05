import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding exoplanet database...');

  // Read the planets data from the frontend JSON file
  const planetsPath = path.join(__dirname, '../../public/data/planets.min.json');
  let planetsData = [];

  try {
    const data = fs.readFileSync(planetsPath, 'utf8');
    planetsData = JSON.parse(data);
  } catch (error) {
    console.log('Could not read planets.min.json, using default data');
    // Fallback data
    planetsData = [
      {
        "pl_name": "Kepler-186f",
        "hostname": "Kepler-186",
        "sy_dist": 151.0,
        "pl_rade": 1.11,
        "pl_bmasse": null,
        "pl_orbper": 129.9,
        "pl_insol": 0.32,
        "pl_eqt": 188,
        "discoverymethod": "Transit",
        "discoveryyear": 2014,
        "st_spectype": "M1V",
        "st_teff": 3788,
        "image": "/images/kepler-186f.jpg",
        "classification": "Earth-size",
        "summary": "First Earth-size planet found in the habitable zone of another star. This potentially rocky world orbits a red dwarf star and could have liquid water on its surface."
      },
      {
        "pl_name": "Proxima Centauri b",
        "hostname": "Proxima Centauri",
        "sy_dist": 1.3,
        "pl_rade": 1.07,
        "pl_bmasse": 1.27,
        "pl_orbper": 11.2,
        "pl_insol": 1.5,
        "pl_eqt": 234,
        "discoverymethod": "Radial Velocity",
        "discoveryyear": 2016,
        "st_spectype": "M5.5V",
        "st_teff": 3042,
        "image": "/images/proxima-centauri-b.jpg",
        "classification": "Terrestrial",
        "summary": "The closest exoplanet to Earth, orbiting our nearest stellar neighbor. This potentially rocky world is in the habitable zone and might harbor liquid water."
      },
      {
        "pl_name": "TRAPPIST-1e",
        "hostname": "TRAPPIST-1",
        "sy_dist": 12.4,
        "pl_rade": 0.91,
        "pl_bmasse": 0.69,
        "pl_orbper": 6.1,
        "pl_insol": 0.66,
        "pl_eqt": 251,
        "discoverymethod": "Transit",
        "discoveryyear": 2017,
        "st_spectype": "M8V",
        "st_teff": 2566,
        "image": "/images/trappist-1e.jpg",
        "classification": "Terrestrial",
        "summary": "One of seven Earth-sized planets in the TRAPPIST-1 system. This world receives similar energy from its star as Earth does from the Sun."
      }
    ];
  }

  // Create planets
  for (const planetData of planetsData) {
    try {
      await prisma.planet.upsert({
        where: { pl_name: planetData.pl_name },
        update: planetData,
        create: {
          ...planetData,
          classification: planetData.classification || 'Unknown',
          summary: planetData.summary || `${planetData.pl_name} is an exoplanet discovered in ${planetData.discoveryyear} using ${planetData.discoverymethod}.`
        }
      });
      console.log(`✅ Added/updated planet: ${planetData.pl_name}`);
    } catch (error) {
      console.error(`❌ Error adding planet ${planetData.pl_name}:`, error);
    }
  }

  // Add system information
  await prisma.systemInfo.upsert({
    where: { key: 'total_planets' },
    update: { value: planetsData.length.toString() },
    create: {
      key: 'total_planets',
      value: planetsData.length.toString(),
      description: 'Total number of exoplanets in the database'
    }
  });

  await prisma.systemInfo.upsert({
    where: { key: 'last_updated' },
    update: { value: new Date().toISOString() },
    create: {
      key: 'last_updated',
      value: new Date().toISOString(),
      description: 'Last time the planet database was updated'
    }
  });

  await prisma.systemInfo.upsert({
    where: { key: 'website_version' },
    update: { value: '1.0.0' },
    create: {
      key: 'website_version',
      value: '1.0.0',
      description: 'Current version of the Exoplanet Explorer website'
    }
  });

  console.log('🎉 Database seeding completed!');
  console.log(`📊 Total planets: ${planetsData.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });