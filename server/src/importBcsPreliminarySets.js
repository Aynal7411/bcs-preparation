import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { buildBcsPreliminaryExamSets } from './data/bcsPreliminarySets.js';
import Exam from './models/Exam.js';

async function run() {
  await connectDB();

  const examSets = buildBcsPreliminaryExamSets(10, 50);

  const operations = examSets.map((exam) => ({
    updateOne: {
      filter: {
        title: exam.title,
        category: exam.category
      },
      update: {
        $set: {
          ...exam,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        }
      },
      upsert: true
    }
  }));

  const result = await Exam.bulkWrite(operations, { ordered: false });

  console.log('BCS preliminary import complete');
  console.log(`Matched: ${result.matchedCount}`);
  console.log(`Modified: ${result.modifiedCount}`);
  console.log(`Upserted: ${result.upsertedCount}`);
}

run()
  .catch((error) => {
    console.error('Failed to import BCS preliminary sets', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
