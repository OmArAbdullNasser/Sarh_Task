import { Schema, model } from 'mongoose';

const itemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 1000, validate: Number.isSafeInteger },
    unitPriceMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  },
  { _id: false },
);
const submissionSchema = new Schema(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    items: {
      type: [
        new Schema(
          {
            productId: { type: String, required: true },
            quantity: { type: Number, required: true },
            expectedUnitPriceMinor: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
  },
  { _id: false },
);
const schema = new Schema(
  {
    operationKey: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    activeAttempt: { type: Boolean, required: true, default: true },
    state: {
      type: String,
      enum: ['draft', 'submitted', 'committed'],
      required: true,
      default: 'draft',
    },
    submission: { type: submissionSchema, default: undefined },
    requestHash: String,
    customerName: String,
    customerEmail: String,
    customerNameSearch: String,
    customerEmailSearch: String,
    status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled'] },
    items: { type: [itemSchema], default: undefined },
    totalMinor: { type: Number, min: 1, validate: Number.isSafeInteger },
    currency: { type: String, enum: ['SAR'] },
    createdAt: Date,
    deletedAt: { type: Date, default: null },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'attemptCreatedAt' as const, updatedAt: 'updatedAt' as const },
  },
);
schema.index({ operationKey: 1 }, { unique: true });
// At most one active attempt per employee, including a committed result awaiting acknowledgment.
schema.index(
  { createdBy: 1 },
  {
    unique: true,
    partialFilterExpression: { activeAttempt: true },
    name: 'one_active_attempt_per_user',
  },
);
const activeOrders = { state: 'committed', deletedAt: null };
for (const field of ['createdAt', 'totalMinor']) {
  schema.index({ [field]: -1, _id: -1 }, { partialFilterExpression: activeOrders });
  schema.index({ status: 1, [field]: -1, _id: -1 }, { partialFilterExpression: activeOrders });
}
schema.index({ customerNameSearch: 1 }, { partialFilterExpression: activeOrders });
schema.index({ customerEmailSearch: 1 }, { partialFilterExpression: activeOrders });
export const Order = model('Order', schema);
