export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  DEALER = 'DEALER',
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  dealerId?: string;
  createdAt: string;
}

export interface DealerGroup {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface IngestionLog {
  id: string;
  platform: 'WHATSAPP' | 'MANUAL';
  dealerId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  attachmentPath: string;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  paymentStatus: 'CREATED' | 'DUPLICATE_WARNING' | 'REJECTED' | 'MANUAL_REVIEW' | 'NONE';
  paymentRequestId?: string;
  duplicateDetected: boolean;
  errorMessage?: string;
  receivedAt: string;
}

export interface Bank {
  id: string;
  binCode: string;
  shortName: string;
  fullName: string;
  logoUrl?: string;
}

export interface CompanyAccount {
  id: string;
  bankId: string;
  accountNo: string;
  accountAlias: string;
  openingBalance: number;
  currentBalance: number;
}

export interface TransactionLedger {
  id: string;
  type: 'FUNDING' | 'PAYMENT_OUT';
  accountId: string;
  amount: number;
  referenceId?: string; // paymentRequestId or depositId
  timestamp: string;
  note?: string;
}

export interface PaymentRequest {
  id: string;
  imagePath: string;
  uploadSource: 'MANUAL' | 'WHATSAPP';
  aiRawText?: string;
  aiConfidenceScore?: number;
  recvBankId?: string;
  recvAccountNo?: string;
  recvAccountName?: string;
  amount?: number;
  description?: string;
  status: PaymentStatus;
  isDuplicateWarning: boolean;
  duplicateRefIds?: string[];
  senderAccountId?: string;
  dealerGroupId: string;
  voucherNo?: string;
  fileName?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExtractedInfo {
  bankCode?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  amount?: number;
  description?: string;
  confidence?: number;
}
