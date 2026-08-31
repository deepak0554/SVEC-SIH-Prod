import { Request, Response } from "express";
import { paymentService, PaymentService } from "../services/payment.service";

export class PaymentController {
  constructor(private service: PaymentService = paymentService) {}

  public getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { registrationId } = req.query;
      const txs = await this.service.getTransactions(registrationId as string);
      res.json(txs);
    } catch (err: any) {
      console.error("[PaymentController.getTransactions Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch transactions" },
        message: "Failed to fetch transactions"
      });
    }
  };

  public recordTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const tx = await this.service.recordTransaction(req.body);
      res.status(201).json(tx);
    } catch (err: any) {
      console.error("[PaymentController.recordTransaction Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to record transaction" },
        message: "Failed to record transaction"
      });
    }
  };
}

export const paymentController = new PaymentController();
