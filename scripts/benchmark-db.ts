import { MongoClient, ObjectId } from 'mongodb';

export interface Order {
  _id: ObjectId;
  customerName: string;
  customerEmail: string;
  customerNameSearch?: string;
  customerEmailSearch?: string;
  status: string;
  totalMinor: number;
  createdAt: Date;
  deletedAt: Date | null;
  items: { productId: number; name: string; quantity: number; unitPriceMinor: number }[];
}

export const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27018', {
  serverSelectionTimeoutMS: 10000,
});
export const database = client.db('sarh_search_benchmark');
export const orders = database.collection<Order>('orders');
