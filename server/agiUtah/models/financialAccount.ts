import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A student's financial account for a program: the fee inputs, the progress-based quarterly
 * invoices, and whether a financial hold is active (a hold blocks instructional access but
 * transcripts are still issued). USD only. Amounts are placeholders until Logan's fee
 * schedule is approved. Isolated: `agiutah_financial_accounts` collection.
 */
export interface IAgiUtahInvoice {
  quarter: number;
  amount: number;
  dueAt?: Date;
  paidAt?: Date;
}

export interface IAgiUtahFinancialAccount {
  studentRef: string;
  programKey: string;
  currency: 'USD';
  totalTuition: number;
  applicationFee: number;
  deposit: number;
  invoices: IAgiUtahInvoice[];
  holdActive: boolean;
}

export interface IAgiUtahFinancialAccountDocument extends IAgiUtahFinancialAccount, Document {}

const InvoiceSchema = new Schema<IAgiUtahInvoice>(
  {
    quarter: { type: Number, required: true, min: 1, max: 4 },
    amount: { type: Number, required: true },
    dueAt: { type: Date, required: false },
    paidAt: { type: Date, required: false },
  },
  { _id: false },
);

const AgiUtahFinancialAccountSchema = new Schema<IAgiUtahFinancialAccountDocument>(
  {
    studentRef: { type: String, required: true },
    programKey: { type: String, required: true },
    currency: { type: String, enum: ['USD'], default: 'USD' },
    totalTuition: { type: Number, required: true, default: 0 },
    applicationFee: { type: Number, required: true, default: 0 },
    deposit: { type: Number, required: true, default: 0 },
    invoices: { type: [InvoiceSchema], default: [] },
    holdActive: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'agiutah_financial_accounts' },
);

AgiUtahFinancialAccountSchema.index({ studentRef: 1, programKey: 1 }, { unique: true });

export const AgiUtahFinancialAccount: Model<IAgiUtahFinancialAccountDocument> =
  (mongoose.models.AgiUtahFinancialAccount as Model<IAgiUtahFinancialAccountDocument>) ||
  mongoose.model<IAgiUtahFinancialAccountDocument>('AgiUtahFinancialAccount', AgiUtahFinancialAccountSchema);
