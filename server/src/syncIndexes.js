import mongoose from 'mongoose';
import { env } from './config/env.js';
import Exam from './models/Exam.js';
import ExamResult from './models/ExamResult.js';
import UploadHistory from './models/UploadHistory.js';
import User from './models/User.js';

async function syncModelIndexes(model) {
  const dropped = await model.syncIndexes();
  return {
    model: model.modelName,
    dropped
  };
}

async function run() {
  await mongoose.connect(env.mongodbUri);
  const results = await Promise.all([
    syncModelIndexes(User),
    syncModelIndexes(Exam),
    syncModelIndexes(ExamResult),
    syncModelIndexes(UploadHistory)
  ]);

  console.log('Index sync complete');
  results.forEach((result) => {
    console.log(`${result.model}: dropped indexes -> ${JSON.stringify(result.dropped)}`);
  });
}

run()
  .catch((error) => {
    console.error('Failed to sync indexes', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
