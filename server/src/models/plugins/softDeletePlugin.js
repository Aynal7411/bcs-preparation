import mongoose from 'mongoose';

export function softDeletePlugin(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  });

  function applyNotDeletedFilter() {
    const options = this.getOptions ? this.getOptions() : {};
    if (options.includeDeleted) {
      return;
    }

    const query = this.getQuery ? this.getQuery() : {};
    if (Object.prototype.hasOwnProperty.call(query, 'isDeleted')) {
      return;
    }

    this.where({ isDeleted: { $ne: true } });
  }

  schema.pre('find', applyNotDeletedFilter);
  schema.pre('findOne', applyNotDeletedFilter);
  schema.pre('findOneAndUpdate', applyNotDeletedFilter);
  schema.pre('countDocuments', applyNotDeletedFilter);
  schema.pre('updateOne', applyNotDeletedFilter);
  schema.pre('updateMany', applyNotDeletedFilter);

  schema.pre('aggregate', function applyAggregateNotDeletedFilter() {
    const options = this.options || {};
    if (options.includeDeleted) {
      return;
    }

    const pipeline = this.pipeline();
    const hasDeletedCondition = pipeline.some((stage) => Boolean(stage?.$match?.isDeleted));
    if (!hasDeletedCondition) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });
}
