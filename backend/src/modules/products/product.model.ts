import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true, maxlength: 150 },
    nameSearch: { type: String, required: true },
    unitPriceMinor: {
      type: Number,
      required: true,
      min: 1,
      max: 100000000,
      validate: Number.isSafeInteger,
    },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);
schema.index({ sku: 1 }, { unique: true });
schema.index({ active: 1, nameSearch: 1 });
export const Product = model('Product', schema);
