import crypto from "crypto";
import { paymentRepository, PaymentRepository } from "../repositories/payment.repository";
import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { contentRepository, ContentRepository } from "../repositories/content.repository";
import { PaymentTransaction } from "../db";

export class PaymentService {
  constructor(
    private paymentRepo: PaymentRepository = paymentRepository,
    private teamRepo: TeamRepository = teamRepository,
    private contentRepo: ContentRepository = contentRepository
  ) {}

  public async getTransactions(registrationId?: string): Promise<PaymentTransaction[]> {
    return this.paymentRepo.findByRegistrationId(registrationId);
  }

  public async recordTransaction(payload: {
    registrationId: string;
    orderId: string;
    paymentId?: string;
    amount: number;
    currency?: string;
    status: "created" | "paid" | "failed" | "refunded";
    paymentMethod?: string;
    signature?: string;
    studentEmail?: string;
    rawResponse?: string;
  }): Promise<PaymentTransaction> {
    const id = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const tx: PaymentTransaction = {
      id,
      registrationId: payload.registrationId,
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      amount: payload.amount,
      currency: payload.currency || "INR",
      status: payload.status,
      paymentMethod: payload.paymentMethod,
      signature: payload.signature,
      studentEmail: payload.studentEmail,
      rawResponse: payload.rawResponse,
      createdAt: new Date().toISOString()
    };

    await this.paymentRepo.save(tx);

    // If paid, update team registration payment status
    if (payload.status === "paid") {
      const team = await this.teamRepo.findById(payload.registrationId);
      if (team) {
        team.paymentStatus = "paid";
        team.paymentId = payload.paymentId;
        team.orderId = payload.orderId;
        team.amountPaid = payload.amount;
        await this.teamRepo.save(team);
      }
    }

    return tx;
  }
}

export const paymentService = new PaymentService();
