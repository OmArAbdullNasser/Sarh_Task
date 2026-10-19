export type Status = 'pending' | 'processing' | 'completed' | 'cancelled';
export interface User { _id: string; name: string; email: string; role: 'admin' | 'agent'; active: boolean; mustChangePassword: boolean; createdAt: string }
export interface Product { _id: string; sku: string; name: string; unitPriceMinor: number }
export interface LineInput { productId: string; quantity: number; expectedUnitPriceMinor: number }
export interface Submission { customerName: string; customerEmail: string; items: LineInput[] }
export interface Order { _id: string; createdBy: string; customerName: string; customerEmail: string; status: Status; items: { productId: string; name: string; quantity: number; unitPriceMinor: number }[]; totalMinor: number; currency: 'SAR'; createdAt: string; deletedAt: string | null }
export interface Attempt { _id: string; operationKey: string; state: 'draft' | 'submitted' | 'committed'; submission?: Submission; deletedAt?: string | null; createdAt?: string }
export interface Page<T> { data: T[]; total: number; page: number; pageSize: number; totalPages: number }
