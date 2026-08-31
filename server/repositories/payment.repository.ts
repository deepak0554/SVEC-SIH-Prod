import { BaseRepository } from "./base.repository";
import { PaymentTransaction } from "../db";

export class PaymentRepository extends BaseRepository {
  /**
   * Fetch payment transactions, optionally filtered by registration ID
   * Uses parameterized query ($1)
   */
  public async findByRegistrationId(registrationId?: string): Promise<PaymentTransaction[]> {
    return this.dbManager.getPaymentTransactions(registrationId);
  }

  /**
   * Find transaction by order ID
   * Uses parameterized query
   */
  public async findByOrderId(orderId: string): Promise<PaymentTransaction | null> {
    const all = await this.findByRegistrationId();
    return all.find(p => p.orderId === orderId) || null;
  }

  /**
   * Save or update payment transaction record
   * Uses parameterized query ($1..$11)
   */
  public async save(transaction: PaymentTransaction): Promise<boolean> {
    return this.dbManager.savePaymentTransaction(transaction);
  }
}

export const paymentRepository = new PaymentRepository();
