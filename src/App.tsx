import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  History, 
  Wallet, 
  Store, 
  FileSpreadsheet, 
  Users, 
  LogOut, 
  Trash2, 
  Plus, 
  Search, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Loader2, 
  RefreshCw, 
  ArrowUpRight, 
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  PlusCircle,
  FileDown,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { PaymentStatus, UserRole, PaymentRequest, CompanyAccount, DealerGroup, TransactionLedger } from './types';
import { MASTER_BANKS } from './constants';
import { extractPaymentInfo } from './services/ocrService';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper Formatters
const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return "---";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
};

const formatDateTime = (val: string) => {
  return new Date(val).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const formatNumberInput = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val);
};

// VietQR dynamic generator helper
const generateVietQRUrl = ({ binCode, accountNo, amount, description, accountName }: {
  binCode?: string;
  accountNo?: string;
  amount?: number;
  description?: string;
  accountName?: string;
}) => {
  if (!binCode || !accountNo) return "";
  const baseUrl = `https://img.vietqr.io/image/${binCode}-${accountNo}-compact2.jpg`;
  const params = new URLSearchParams();
  if (amount) params.append("amount", amount.toString());
  if (description) params.append("addInfo", description);
  if (accountName) params.append("accountName", accountName);
  
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
};

export default function App() {
  const { appUser, loading, logout } = useAuth();
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Central Application States
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [accounts, setAccounts] = useState<CompanyAccount[]>([]);
  const [dealers, setDealers] = useState<DealerGroup[]>([]);
  const [ledger, setLedger] = useState<TransactionLedger[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Selection states for details panel
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  
  // Drawer states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showAddDealerModal, setShowAddDealerModal] = useState(false);
  
  // Account Form state
  const [accountForm, setAccountForm] = useState({
    bankId: MASTER_BANKS[0].id,
    accountAlias: '',
    accountNo: '',
    openingBalance: 0
  });

  // Account Edit Form states
  const [editingAccount, setEditingAccount] = useState<CompanyAccount | null>(null);
  const [editAccountForm, setEditAccountForm] = useState({
    bankId: MASTER_BANKS[0].id,
    accountAlias: '',
    accountNo: '',
    openingBalance: 0
  });

  // Funding Form state
  const [fundForm, setFundForm] = useState({
    accountId: '',
    amount: 0,
    note: ''
  });

  // Dealer Form state
  const [dealerForm, setDealerForm] = useState({
    code: '',
    name: '',
    phone: '',
    address: '',
    description: ''
  });
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);

  // Filter/Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUploadDealerId, setSelectedUploadDealerId] = useState('');
  
  // Upload processing states
  const [isUploading, setIsUploading] = useState(false);
  
  // Report configurations
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom Confirmation & Alert Modals (IFrame Sandbox Aware)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const triggerAlert = (title: string, message: string) => {
    setAlertModal({ show: true, title, message });
  };

  // Fetch all app properties from rest server
  const fetchAllData = useCallback(async () => {
    const token = localStorage.getItem('smart_pay_token');
    if (!token) return;
    
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [payRes, accRes, dealRes, ledgRes] = await Promise.all([
        fetch('/api/payments', { headers }),
        fetch('/api/accounts', { headers }),
        fetch('/api/dealers', { headers }),
        fetch('/api/ledger', { headers })
      ]);
      
      const safeJson = async (res: Response, fallback: any) => {
        if (!res.ok) return fallback;
        const type = res.headers.get("content-type");
        if (!type || !type.includes("application/json")) return fallback;
        try {
          return await res.json();
        } catch {
          return fallback;
        }
      };

      const payData = await safeJson(payRes, null);
      if (payData !== null) setPayments(payData);

      const accData = await safeJson(accRes, null);
      if (accData !== null) setAccounts(accData);

      const dealData = await safeJson(dealRes, null);
      if (dealData !== null) setDealers(dealData);

      const ledgData = await safeJson(ledgRes, null);
      if (ledgData !== null) setLedger(ledgData);
      
    } catch (e) {
      console.error("Failed to fetch application datasets", e);
    }
  }, []);

  // Sync data on interval and session load
  useEffect(() => {
    if (appUser) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 4000);
      return () => clearInterval(interval);
    }
  }, [appUser, fetchAllData]);

  // Auto-fill fund form default account
  useEffect(() => {
    if (accounts.length > 0 && !fundForm.accountId) {
      setFundForm(prev => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, fundForm.accountId]);

  // Auto-fill dealer uploader default
  useEffect(() => {
    if (dealers.length > 0 && !selectedUploadDealerId) {
      setSelectedUploadDealerId(dealers[0].id);
    }
  }, [dealers, selectedUploadDealerId]);

  // Handle Complete OCR Processing
  const handleCompleteOCR = useCallback(async (paymentId: string, base64: string, mime: string, name: string) => {
    try {
      const extracted = await extractPaymentInfo(base64, mime, name);
      const matchBank = MASTER_BANKS.find(b => {
        const needle = ((extracted.bankCode || "") + " " + (extracted.bankName || "")).toLowerCase();
        const bId = b.id.toLowerCase();
        const short = b.shortName.toLowerCase();
        return needle.includes(bId) || needle.includes(short) || short.split(" ").some(w => needle.includes(w));
      })?.id;

      let isDuplicate = false;
      if (extracted.accountNo && extracted.amount) {
        isDuplicate = payments.some(p => 
          p.id !== paymentId && 
          p.recvAccountNo === extracted.accountNo && 
          p.amount === extracted.amount
        );
      }

      const token = localStorage.getItem('smart_pay_token');
      await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recvBankId: matchBank || null,
          recvAccountNo: extracted.accountNo || null,
          recvAccountName: extracted.accountName || null,
          amount: extracted.amount || null,
          description: extracted.description || null,
          isDuplicateWarning: isDuplicate,
          aiRawText: JSON.stringify(extracted)
        })
      });
      fetchAllData();
    } catch (err) {
      console.error("OCR analysis updates failed in UI", err);
    }
  }, [payments, fetchAllData]);

  // Batch Image Upload Uploader
  const handleUploadImages = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedUploadDealerId) return;

    setIsUploading(true);
    const token = localStorage.getItem('smart_pay_token');
    
    // Create payments first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (reEv) => resolve(reEv.target?.result as string);
        reader.readAsDataURL(file);
      });

      const tempId = "pay-" + Math.random().toString(36).substring(7);
      
      try {
        const createRes = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            id: tempId,
            imagePath: base64,
            fileName: file.name,
            dealerGroupId: selectedUploadDealerId
          })
        });

        if (createRes.ok) {
          const newPayment = await createRes.json();
          // Kickoff asynchronous background OCR 
          handleCompleteOCR(newPayment.id, base64, file.type, file.name);
        }
      } catch (err) {
        console.error("Error creating files:", err);
      }
    }
    
    setIsUploading(false);
  }, [selectedUploadDealerId, handleCompleteOCR]);

  // Selected Payment Reference Getter
  const selectedPayment = useMemo(() => {
    return payments.find(p => p.id === selectedPaymentId) || null;
  }, [payments, selectedPaymentId]);

  // Dynamic Detail Drawer Input Changes
  const handleUpdateSelectedPaymentField = async (update: Partial<PaymentRequest>) => {
    if (!selectedPaymentId) return;
    try {
      const token = localStorage.getItem('smart_pay_token');
      await fetch(`/api/payments/${selectedPaymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(update)
      });
      setPayments(prev => prev.map(p => p.id === selectedPaymentId ? { ...p, ...update } : p));
    } catch (e) {
      console.error(e);
    }
  };

  // Payment Execution Completion 
  const handleCompletePaymentTask = async (payId: string, srcAccId: string, dGroupId: string) => {
    const payItem = payments.find(p => p.id === payId);
    if (!payItem) return;

    try {
      const token = localStorage.getItem('smart_pay_token');
      const response = await fetch(`/api/payments/${payId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: srcAccId,
          amount: payItem.amount,
          dealerId: dGroupId,
          recvBankId: payItem.recvBankId,
          recvAccountNo: payItem.recvAccountNo,
          recvAccountName: payItem.recvAccountName,
          description: payItem.description,
          voucherNo: payItem.voucherNo
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Không thể thực hiện ghi nhận giao dịch.");
      }

      setSelectedPaymentId(null);
      fetchAllData();
    } catch (e: any) {
      triggerAlert("Lỗi hoàn tất giao dịch", e.message || "Xảy ra lỗi hoàn tất giao dịch.");
    }
  };

  // Reject / Decline Payment Task
  const handleRejectPaymentTask = async (payId: string) => {
    triggerConfirm(
      "Từ chối yêu cầu chi",
      "Bạn có chắc muốn từ chối (REJECT) yêu cầu chi này?",
      async () => {
        try {
          const token = localStorage.getItem('smart_pay_token');
          const response = await fetch(`/api/payments/${payId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setSelectedPaymentId(null);
            fetchAllData();
          } else {
            const err = await response.json();
            triggerAlert("Lỗi từ chối yêu cầu chi", err.error || "Không thể từ chối yêu cầu chi này.");
          }
        } catch (e: any) {
          console.error(e);
          triggerAlert("Lỗi hệ thống", e.message || "Không thể gửi yêu cầu từ chối.");
        }
      }
    );
  };

  // Delete Payment Task (NEW EXPLICIT REQUESTS MOCK/REAL ACTION)
  const handleDeletePaymentTask = async (payId: string) => {
    triggerConfirm(
      "Xác nhận xóa vĩnh viễn",
      "Bạn có chắc chắn muốn xóa (DELETE) vĩnh viễn yêu cầu thanh toán này không? Thao tác này không thể khôi phục.",
      async () => {
        try {
          const token = localStorage.getItem('smart_pay_token');
          const response = await fetch(`/api/payments/${payId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Lỗi xóa yêu cầu.");
          }

          if (selectedPaymentId === payId) {
            setSelectedPaymentId(null);
          }
          fetchAllData();
        } catch (e: any) {
          triggerAlert("Lỗi xóa yêu cầu", e.message || "Có lỗi xảy ra khi xóa yêu cầu.");
        }
      }
    );
  };

  // Export accountant metrics to pretty Excel Spreadsheet
  const handleExportAccountingExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Báo cáo kế toán");
    
    // Format structures
    sheet.columns = Array(25).fill({ width: 14 });
    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 24;
    sheet.getColumn(4).width = 16;
    sheet.getColumn(6).width = 16;

    const mainHeaderStyle: any = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 12 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AB" } },
      alignment: { vertical: "middle", horizontal: "center" },
      border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
    };

    const sectionSubHeaderStyle: any = {
      font: { bold: true, size: 10 },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } },
      alignment: { vertical: "middle", horizontal: "center" },
      border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
    };

    const getDealerColors = (code: string, idx: number) => {
      const pallete = [
        { title: "FFDBEAFE", text: "FF1E40AF", sub: "FFEFF6FF" },
        { title: "FFFFEDD5", text: "FF92400E", sub: "FFFFF7ED" },
        { title: "FFF0FDF4", text: "FF166534", sub: "FFF7FEE7" },
        { title: "FFF5F3FF", text: "FF5B21B6", sub: "FFF5F3FF" },
        { title: "FFFDF2F2", text: "FF991B1B", sub: "FFFDF2F2" }
      ];
      const match = code.toUpperCase();
      if (match.includes("TUYT") || match.includes("TUYET")) return pallete[0];
      if (match.includes("LINA")) return pallete[1];
      if (match.includes("TRUM")) return pallete[2];
      return pallete[idx % pallete.length];
    };

    // Grid details
    sheet.mergeCells("A1:L1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `BÁO CÁO TỔNG HỢP TÀI CHÍNH - Ngày ${reportDate}`;
    titleCell.style = mainHeaderStyle;

    sheet.getRow(3).values = ["STT", "NGÂN HÀNG", "SỐ TÀI KHOẢN", "THU (NẠP)", "CHI (THANH TOÁN)", "TỒN CUỐI", "GHI CHÚ"];
    sheet.getRow(3).eachCell((cell) => cell.style = sectionSubHeaderStyle);

    let currentRow = 4;
    const startRange = new Date(reportDate);
    startRange.setHours(0,0,0,0);
    const endRange = new Date(reportDate);
    endRange.setHours(23,59,59,999);
    
    let totalBalancesOfDate = 0;

    accounts.forEach((acc, i) => {
      const pastFunding = ledger.filter(l => l.accountId === acc.id && new Date(l.timestamp) < startRange);
      const pastPayments = payments.filter(p => p.senderAccountId === acc.id && p.status === PaymentStatus.COMPLETED && p.completedAt && new Date(p.completedAt) < startRange);
      
      const startBalance = acc.openingBalance + 
        pastFunding.filter(l => l.type === 'FUNDING').reduce((sum, l) => sum + l.amount, 0) -
        pastPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      const todayFund = ledger.filter(l => l.accountId === acc.id && new Date(l.timestamp) >= startRange && new Date(l.timestamp) <= endRange);
      const todayPay = payments.filter(p => p.senderAccountId === acc.id && p.status === PaymentStatus.COMPLETED && p.completedAt && new Date(p.completedAt) >= startRange && new Date(p.completedAt) <= endRange);

      const added = todayFund.filter(l => l.type === 'FUNDING').reduce((sum, l) => sum + l.amount, 0);
      const spend = todayPay.reduce((sum, p) => sum + (p.amount || 0), 0);
      const closing = startBalance + added - spend;
      
      totalBalancesOfDate += closing;

      const r = sheet.getRow(currentRow);
      r.values = [i + 1, acc.accountAlias, acc.accountNo, added, spend, closing, ""];
      r.getCell(4).numFmt = "#,##0";
      r.getCell(5).numFmt = "#,##0";
      r.getCell(6).numFmt = "#,##0";
      r.eachCell((c) => c.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } });
      currentRow++;
    });

    currentRow++;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = "TỔNG CỘNG TỒN QUỸ:";
    sheet.getCell(`A${currentRow}`).font = { bold: true };
    const totalCell = sheet.getCell(`E${currentRow}`);
    totalCell.value = totalBalancesOfDate;
    totalCell.style = { font: { bold: true, color: { argb: "FFFF0000" } }, numFmt: "#,##0" };

    currentRow += 3;
    sheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const detailsTitle = sheet.getCell(`A${currentRow}`);
    detailsTitle.value = "CHI TIẾT THANH TOÁN THEO ĐẠI LÝ";
    detailsTitle.style = { ...mainHeaderStyle, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } } };
    currentRow++;

    let colStartOffset = 1;
    const sortFilenameAsc = (a: PaymentRequest, b: PaymentRequest) => {
      const aName = a.fileName || a.voucherNo || "";
      const bName = b.fileName || b.voucherNo || "";
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    };

    dealers.forEach((dl, dIdx) => {
      const dealerColors = getDealerColors(dl.code, dIdx);
      const todayDealerPayments = payments.filter(p => 
        p.dealerGroupId === dl.id && 
        p.status === PaymentStatus.COMPLETED && 
        p.completedAt && 
        new Date(p.completedAt) >= startRange && 
        new Date(p.completedAt) <= endRange
      );

      sheet.mergeCells(currentRow, colStartOffset, currentRow, colStartOffset + 4);
      const title = sheet.getCell(currentRow, colStartOffset);
      title.value = `ĐẠI LÝ: ${dl.code}`;
      title.style = {
        font: { bold: true, color: { argb: dealerColors.text } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: dealerColors.title } },
        alignment: { horizontal: "center" }
      };

      const tableHeaders = ["FILE NAME", "NGƯỜI NHẬN", "GIỜ", "SỐ TIỀN", "NGÂN HÀNG"];
      tableHeaders.forEach((th, hIdx) => {
        const cell = sheet.getCell(currentRow + 1, colStartOffset + hIdx);
        cell.value = th;
        cell.style = {
          font: { bold: true, size: 9 },
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: dealerColors.sub } },
          border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
        };
      });

      todayDealerPayments.sort(sortFilenameAsc).forEach((pPay, pIdx) => {
        const itemRowOffset = currentRow + 2 + pIdx;
        sheet.getCell(itemRowOffset, colStartOffset).value = pPay.fileName || pPay.voucherNo || (pIdx + 1);
        sheet.getCell(itemRowOffset, colStartOffset + 1).value = pPay.recvAccountName;
        sheet.getCell(itemRowOffset, colStartOffset + 2).value = pPay.completedAt ? new Date(pPay.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
        sheet.getCell(itemRowOffset, colStartOffset + 3).value = pPay.amount;
        sheet.getCell(itemRowOffset, colStartOffset + 3).numFmt = "#,##0";
        sheet.getCell(itemRowOffset, colStartOffset + 4).value = MASTER_BANKS.find(b => b.id === pPay.recvBankId)?.shortName || "";
        
        for (let cellIdx = 0; cellIdx < 5; cellIdx++) {
          sheet.getCell(itemRowOffset, colStartOffset + cellIdx).border = {
            top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }
          };
        }
      });

      const totalSummaryRow = currentRow + 2 + todayDealerPayments.length;
      sheet.getCell(totalSummaryRow, colStartOffset + 1).value = "TỔNG:";
      sheet.getCell(totalSummaryRow, colStartOffset + 3).value = todayDealerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      sheet.getCell(totalSummaryRow, colStartOffset + 3).style = { font: { bold: true }, numFmt: "#,##0" };

      colStartOffset += 6;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Báo_cáo_kế_toán_${reportDate}.xlsx`);
  };

  // Form handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.accountAlias || !accountForm.accountNo) {
      triggerAlert("Thiếu thông tin", "Vui lòng điền đủ thông tin tài khoản!");
      return;
    }
    
    try {
      const token = localStorage.getItem('smart_pay_token');
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accountForm)
      });
      
      if (response.ok) {
        setShowAddAccountModal(false);
        setAccountForm({ bankId: MASTER_BANKS[0].id, accountAlias: '', accountNo: '', openingBalance: 0 });
        fetchAllData();
      } else {
        const err = await response.json();
        triggerAlert("Lỗi khởi tạo tài khoản", err.error || "Không thể khởi tạo tài khoản.");
      }
    } catch (err: any) {
      triggerAlert("Lỗi khởi tạo tài khoản", err.message || "Lỗi tạo tài khoản");
    }
  };

  const startEditAccount = (acc: CompanyAccount) => {
    setEditingAccount(acc);
    setEditAccountForm({
      bankId: acc.bankId,
      accountAlias: acc.accountAlias,
      accountNo: acc.accountNo,
      openingBalance: acc.openingBalance || 0
    });
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editAccountForm.accountAlias || !editAccountForm.accountNo) {
      triggerAlert("Thiếu thông tin", "Vui lòng điền đủ thông tin tài khoản!");
      return;
    }
    
    try {
      const token = localStorage.getItem('smart_pay_token');
      const response = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bankId: editAccountForm.bankId,
          accountAlias: editAccountForm.accountAlias,
          accountNo: editAccountForm.accountNo,
          openingBalance: editAccountForm.openingBalance
        })
      });

      if (response.ok) {
        setEditingAccount(null);
        fetchAllData();
      } else {
        const err = await response.json();
        triggerAlert("Lỗi cập nhật tài khoản", err.error || "Không thể cập nhật tài khoản.");
      }
    } catch (err: any) {
      triggerAlert("Lỗi cập nhật tài khoản", err.message || "Lỗi cập nhật tài khoản");
    }
  };

  const handleDeleteAccount = async (id: string, accountAlias: string) => {
    triggerConfirm(
      "Xác nhận xóa tài khoản",
      `Bạn có chắc chắn muốn xóa tài khoản "${accountAlias}"? Thao tác này sẽ xóa tài khoản nguồn khỏi hệ thống.`,
      async () => {
        try {
          const token = localStorage.getItem('smart_pay_token');
          const response = await fetch(`/api/accounts/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            fetchAllData();
          } else {
            const err = await response.json();
            triggerAlert("Lỗi xóa tài khoản", err.error || "Không thể xóa tài khoản.");
          }
        } catch (err: any) {
          triggerAlert("Lỗi xóa tài khoản", err.message || "Lỗi xóa tài khoản");
        }
      }
    );
  };

  const handleFundAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fundForm.amount <= 0 || !fundForm.accountId) {
      triggerAlert("Nhập liệu không hợp lệ", "Vui lòng điền đầy đủ số tiền hợp lệ (> 0)!");
      return;
    }

    try {
      const token = localStorage.getItem('smart_pay_token');
      const response = await fetch('/api/accounts/fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fundForm)
      });

      if (response.ok) {
        setShowFundModal(false);
        setFundForm(prev => ({ ...prev, amount: 0, note: '' }));
        fetchAllData();
      } else {
        const err = await response.json();
        triggerAlert("Giao dịch nạp tiền thất bại", err.error || "Giao dịch bổ sung thất bại.");
      }
    } catch (e: any) {
      triggerAlert("Giao dịch nạp tiền thất bại", e.message || "Lỗi nạp tiền bổ sung vào quỹ.");
    }
  };

  const handleCreateOrUpdateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerForm.code || !dealerForm.name) {
      triggerAlert("Thiếu thông tin", "Mã và Tên đại lý là hai trường dữ liệu bắt buộc!");
      return;
    }

    try {
      const token = localStorage.getItem('smart_pay_token');
      let response;
      if (selectedDealerId) {
        response = await fetch(`/api/dealers/${selectedDealerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(dealerForm)
        });
      } else {
        response = await fetch('/api/dealers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(dealerForm)
        });
      }

      if (response.ok) {
        setShowAddDealerModal(false);
        setSelectedDealerId(null);
        setDealerForm({ code: '', name: '', phone: '', address: '', description: '' });
        fetchAllData();
      } else {
        const err = await response.json();
        triggerAlert("Lưu thông tin thất bại", err.error || "Lưu thông tin đại lý không thành công.");
      }
    } catch (e: any) {
      triggerAlert("Lỗi hệ thống", e.message || "Có lỗi xảy ra.");
    }
  };

  const handleDeleteDealer = async (id: string) => {
    triggerConfirm(
      "Xóa đại lý",
      "Bạn có chắc chắn muốn xóa đại lý này?",
      async () => {
        try {
          const token = localStorage.getItem('smart_pay_token');
          const response = await fetch(`/api/dealers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            fetchAllData();
          } else {
            const err = await response.json();
            triggerAlert("Lỗi xóa đại lý", err.error || "Không thể xóa đại lý này.");
          }
        } catch (e: any) {
          triggerAlert("Lỗi hệ thống", e.message || "Thao tác không thành công.");
        }
      }
    );
  };

  const handleEditDealerClick = (dl: DealerGroup) => {
    setSelectedDealerId(dl.id);
    setDealerForm({
      code: dl.code,
      name: dl.name,
      phone: dl.phone || '',
      address: dl.address || '',
      description: dl.description || ''
    });
    setShowAddDealerModal(true);
  };

  const handleAddDealerClick = () => {
    setSelectedDealerId(null);
    setDealerForm({ code: '', name: '', phone: '', address: '', description: '' });
    setShowAddDealerModal(true);
  };

  // Summary Metrics calculations
  const totalFundingBalance = useMemo(() => {
    return accounts.reduce((acc, cu) => acc + cu.currentBalance, 0);
  }, [accounts]);

  const totalDisburstToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return payments
      .filter(p => p.status === PaymentStatus.COMPLETED && p.completedAt && p.completedAt.startsWith(today))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const pendingCount = useMemo(() => {
    return payments.filter(p => p.status === PaymentStatus.PENDING).length;
  }, [payments]);

  // Sorting helper for filename sorting (numeric aware)
  const sortFileNameComparator = (a: PaymentRequest, b: PaymentRequest) => {
    const aVal = a.fileName || a.voucherNo || "";
    const bVal = b.fileName || b.voucherNo || "";
    return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Filtered Payments Lists
  const filteredPendingPayments = useMemo(() => {
    return payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .filter(p => {
        if (dealerFilter && p.dealerGroupId !== dealerFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesFile = (p.fileName || "").toLowerCase().includes(query);
          const matchesVouch = (p.voucherNo || "").toLowerCase().includes(query);
          const matchesName = (p.recvAccountName || "").toLowerCase().includes(query);
          const matchesSTK = (p.recvAccountNo || "").toLowerCase().includes(query);
          return matchesFile || matchesVouch || matchesName || matchesSTK;
        }
        return true;
      })
      .sort(sortFileNameComparator);
  }, [payments, searchQuery, dealerFilter]);

  const filteredHistoryPayments = useMemo(() => {
    return payments
      .filter(p => p.status !== PaymentStatus.PENDING)
      .filter(p => {
        if (dealerFilter && p.dealerGroupId !== dealerFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesFile = (p.fileName || "").toLowerCase().includes(query);
          const matchesVouch = (p.voucherNo || "").toLowerCase().includes(query);
          const matchesName = (p.recvAccountName || "").toLowerCase().includes(query);
          const matchesSTK = (p.recvAccountNo || "").toLowerCase().includes(query);
          return matchesFile || matchesVouch || matchesName || matchesSTK;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, searchQuery, dealerFilter, statusFilter]);

  // Login redirects
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-white font-black uppercase tracking-[0.3em] text-xs">Đang tải hệ thống Smart Pay...</p>
      </div>
    );
  }

  if (!appUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Layout Section */}
      <div className="w-64 bg-[#0f172a] text-white h-screen flex flex-col p-5 border-r border-slate-800 shrink-0 sticky top-0">
        <div className="flex items-center gap-3 mb-10 px-2 pt-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-900/50">
            SP
          </div>
          <div>
            <span className="text-lg font-bold block leading-tight tracking-tight">Smart Pay AI</span>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Hệ thống bóc tách</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển' },
            { id: 'pending', icon: ListTodo, label: `Chờ xử lý (${pendingCount})` },
            { id: 'history', icon: History, label: 'Lịch sử thanh toán' },
            { id: 'accounts', icon: Wallet, label: 'Quản lý tài khoản' },
            { id: 'dealers', icon: Store, label: 'Danh sách đại lý' },
            { id: 'reports', icon: FileSpreadsheet, label: 'Báo cáo kế toán' },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPaymentId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
                <span className="font-semibold text-xs">{tab.label}</span>
              </button>
            );
          })}
          
          {appUser.role === UserRole.ADMIN && (
            <button
              onClick={() => {
                setActiveTab('users');
                setSelectedPaymentId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Users size={18} className={activeTab === 'users' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
              <span className="font-semibold text-xs">Quản trị nhân viên</span>
            </button>
          )}
        </nav>

        <div className="pt-4 border-t border-slate-800 space-y-1">
          <div className="px-4 py-2 mb-2">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">
              Phân quyền: {appUser.role}
            </div>
            <div className="text-xs font-bold text-white truncate">
              {appUser.displayName || appUser.email}
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-xs font-semibold cursor-pointer"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Container Workspace Panel */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-screen">
        
        {/* Header content actions */}
        <header className="bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center sticky top-0 z-45">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
              {activeTab === 'dashboard' && "Hệ Thống Giải Ngân Smart Pay AI"}
              {activeTab === 'pending' && "Danh sách lệnh chi chờ xử lý"}
              {activeTab === 'history' && "Lịch sử duyệt thanh toán"}
              {activeTab === 'accounts' && "Quản lý tài khoản & Quỹ hạn mức"}
              {activeTab === 'dealers' && "Quản lý đại lý giải ngân"}
              {activeTab === 'reports' && "Báo cáo tài chính nghiệp vụ"}
              {activeTab === 'users' && "Quản lý phân quyền tài khoản"}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsRefreshing(true);
                fetchAllData().finally(() => setTimeout(() => setIsRefreshing(false), 800));
              }}
              className="p-3 bg-slate-50 text-slate-500 border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer flex gap-2 text-xs font-bold items-center"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Tải lại dữ liệu
            </button>
          </div>
        </header>

        {/* Content Tabs Switch */}
        <main className="flex-grow overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  {/* Summary Metric Bento Grid Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-[32px] p-8 border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-all duration-500"></div>
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm shadow-blue-100">
                        <Wallet size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng quỹ hạn mức khả dụng</span>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tight mt-2 leading-none">
                        {formatCurrency(totalFundingBalance)}
                      </h3>
                      <p className="text-slate-400 text-xs font-semibold mt-3 flex items-center gap-1">
                        <ArrowUpRight size={14} className="text-emerald-500" />
                        <span>Tổng hạn mức từ {accounts.length} nguồn</span>
                      </p>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-all duration-500"></div>
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-sm shadow-emerald-100">
                        <TrendingUp size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã giải ngân hôm nay (VND)</span>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tight mt-2 leading-none text-emerald-600">
                        {formatCurrency(totalDisburstToday)}
                      </h3>
                      <p className="text-slate-400 text-xs font-semibold mt-3 flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Sổ cái cập nhật tự động</span>
                      </p>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-all duration-500"></div>
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 shadow-sm shadow-amber-100">
                        <ListTodo size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yêu cầu chưa xử lý</span>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tight mt-2 leading-none text-amber-600">
                        {pendingCount} phiếu
                      </h3>
                      <p className="text-slate-400 text-xs font-semibold mt-3 flex items-center gap-1">
                        <Loader2 size={14} className="text-amber-500 animate-spin" />
                        <span>Chờ phân tích OCR từ AI</span>
                      </p>
                    </div>
                  </div>

                  {/* Quick file batch uploader form */}
                  <div className="bg-white border-2 border-slate-100 rounded-[36px] p-10 shadow-sm">
                    <div className="max-w-2xl">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Tải tập lệnh chi giải ngân mới</h3>
                      <p className="text-slate-400 text-sm font-semibold mb-8">
                        Chọn đại lý giải ngân quản lý, và tải loạt ảnh phiếu ủy nhiệm chi hoặc hóa đơn thu. Hệ thống sử dụng mô hình Gemini xử lý dữ liệu và trích xuất chỉ trong 2-3 giây.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            Gán đại lý quản lý
                          </label>
                          <select 
                            value={selectedUploadDealerId}
                            onChange={(e) => setSelectedUploadDealerId(e.target.value)}
                            className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-150 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm"
                          >
                            {dealers.map(d => (
                              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                            ))}
                          </select>
                        </div>

                        <div className="relative">
                          <input 
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleUploadImages}
                            disabled={isUploading || !selectedUploadDealerId}
                            id="batch-image-uploader"
                            className="hidden"
                          />
                          <label
                            htmlFor="batch-image-uploader"
                            className={`w-full py-4.5 px-6 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 font-bold transition-all text-sm cursor-pointer ${
                              isUploading || !selectedUploadDealerId
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Đang phân tích bóc tách bằng AI...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon size={18} />
                                <span>Tải ảnh lệnh chi (Ủy nhiệm chi)</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Ledger overview */}
                  <div className="bg-white border-2 border-slate-100 rounded-[36px] overflow-hidden shadow-sm">
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-none mb-1">Giao dịch biến động quỹ gần đây</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sổ cái kế toán thời gian thực</p>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="px-10 py-5">Nghiệp vụ / Mã phiếu</th>
                            <th className="px-8 py-5">Tài khoản ảnh hưởng</th>
                            <th className="px-8 py-5">Số tiền giao dịch</th>
                            <th className="px-8 py-5">Thời gian</th>
                            <th className="px-10 py-5">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                          {ledger.slice(0, 5).map(l => {
                            const acc = accounts.find(a => a.id === l.accountId);
                            const isFunding = l.type === 'FUNDING';
                            return (
                              <tr key={l.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                                      isFunding ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                      {isFunding ? "+" : "-"}
                                    </div>
                                    <div>
                                      <span className="block font-bold">{isFunding ? "Nạp tiền bổ sung" : "Giải ngân đại lý"}</span>
                                      <span className="text-[10px] text-slate-400 font-mono font-bold leading-none">{l.id}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-slate-500">
                                  {acc ? `${acc.accountAlias} (${acc.accountNo})` : "---"}
                                </td>
                                <td className={`px-8 py-5 font-black font-mono ${
                                  isFunding ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                  {isFunding ? "+" : "-"}{formatCurrency(l.amount)}
                                </td>
                                <td className="px-8 py-5 text-slate-400 text-xs font-semibold">
                                  {formatDateTime(l.timestamp)}
                                </td>
                                <td className="px-10 py-5 text-slate-400 font-semibold italic truncate max-w-xs">
                                  {l.note || "Ghi nhận sổ cái"}
                                </td>
                              </tr>
                            );
                          })}
                          {ledger.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-10 text-slate-400 font-semibold italic bg-slate-50/10">
                                Sổ cái hiện đang trống. Thực hiện nạp tiền hoặc giải ngân đầu tiên.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PENDING LIST */}
              {activeTab === 'pending' && (
                <div className="p-8 space-y-6 animate-in fade-in duration-300">
                  {/* Filters & Actions Header */}
                  <div className="bg-white border-2 border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Tìm mã phiếu, file name, STK nhận, tên...."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-xs outline-none focus:border-blue-600 transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <select
                        value={dealerFilter}
                        onChange={(e) => setDealerFilter(e.target.value)}
                        className="px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-xs select-custom outline-none"
                      >
                        <option value="">Lọc đại lý (Tất cả)</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">
                        Hiển thị {filteredPendingPayments.length} bản ghi
                      </span>
                    </div>
                  </div>

                  {/* Interactive Table List */}
                  <div className="bg-white border-2 border-slate-100 rounded-[36px] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50/50">
                            <th className="px-10 py-5">Mã số phiế / File Name</th>
                            <th className="px-8 py-5">Đại lý liên kết</th>
                            <th className="px-8 py-5">STK nhận / Thụ hưởng</th>
                            <th className="px-8 py-5">Số tiền bóc tách (VND)</th>
                            <th className="px-8 py-5">Trạng thái AI</th>
                            <th className="px-10 py-5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                          {filteredPendingPayments.map(p => {
                            const dl = dealers.find(d => d.id === p.dealerGroupId);
                            const hasExtractedInfo = p.recvBankId && p.recvAccountNo && p.amount;
                            return (
                              <tr 
                                key={p.id} 
                                onDoubleClick={() => setSelectedPaymentId(p.id)}
                                className={`group hover:bg-blue-50/20 transition-all cursor-pointer ${
                                  selectedPaymentId === p.id ? 'bg-blue-50/40' : ''
                                }`}
                              >
                                <td className="px-10 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                                      {p.imagePath ? (
                                        <img src={p.imagePath} alt="thumbnail" className="w-full h-full object-cover rounded-xl" />
                                      ) : (
                                        <FileText size={18} />
                                      )}
                                    </div>
                                    <div className="min-w-0 max-w-xs">
                                      <span className="block font-black text-slate-800 truncate leading-tight mb-1" title={p.fileName}>
                                        {p.fileName || "Tập tin uỷ thác chi"}
                                      </span>
                                      <span className="block text-[10px] text-slate-400 font-semibold leading-none">
                                        Nạp lúc {formatDateTime(p.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  {dl ? (
                                    <span className="px-3 py-1 bg-slate-100 border border-slate-200/50 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider">
                                      {dl.code}
                                    </span>
                                  ) : "---"}
                                </td>
                                <td className="px-8 py-5">
                                  {p.recvAccountNo ? (
                                    <div>
                                      <span className="block text-slate-700 font-bold leading-tight">{p.recvAccountNo}</span>
                                      <span className="block text-[10px] text-slate-400 font-semibold font-mono uppercase leading-none">
                                        {p.recvAccountName || "---"}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium italic text-xs">Chưa bóc tách STK</span>
                                  )}
                                </td>
                                <td className="px-8 py-5 font-black font-mono text-slate-800">
                                  {p.amount !== undefined ? formatCurrency(p.amount) : "---"}
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-2">
                                    {p.isDuplicateWarning && (
                                      <span className="px-3 py-1 bg-red-50 border border-red-100 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse">
                                        Trùng lặp!
                                      </span>
                                    )}
                                    {hasExtractedInfo ? (
                                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        AI Đã bóc tách
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" />
                                        Đang quét
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-10 py-5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* EXPLICIT REQUESTED OPTION: Delete button in Pending list */}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePaymentTask(p.id);
                                      }}
                                      title="Xóa yêu cầu chi"
                                      className="p-2.5 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 text-red-500 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPaymentId(p.id);
                                      }}
                                      title="Chi tiết lệnh"
                                      className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
                                    >
                                      <ChevronRight size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredPendingPayments.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-20 text-slate-400 font-semibold italic">
                                Không tìm thấy yêu cầu chi khả dụng thỏa mãn bộ lọc.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TRANSACTION ARCHIVE HISTORIC LIST */}
              {activeTab === 'history' && (
                <div className="p-8 space-y-6 animate-in fade-in duration-300">
                  {/* Filters Header Row */}
                  <div className="bg-white border-2 border-slate-100 rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-grow max-w-3xl">
                      <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Tìm theo STK nhận, tên người hưởng, file name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-xs outline-none focus:border-blue-600 transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <select
                        value={dealerFilter}
                        onChange={(e) => setDealerFilter(e.target.value)}
                        className="px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-xs outline-none"
                      >
                        <option value="">Đại lý (Tất cả)</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-semibold text-xs outline-none"
                      >
                        <option value="">Trạng thái (Tất cả)</option>
                        <option value={PaymentStatus.COMPLETED}>Thành công (RESOLVED)</option>
                        <option value={PaymentStatus.REJECTED}>Từ chối (REJECTED)</option>
                      </select>
                    </div>

                    <span className="text-xs font-bold text-slate-400">
                      Hiển thị {filteredHistoryPayments.length} phiếu đã duyệt
                    </span>
                  </div>

                  {/* Archive Table */}
                  <div className="bg-white border-2 border-slate-100 rounded-[36px] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50/50">
                            <th className="px-10 py-5">Số phiếu / File Name</th>
                            <th className="px-8 py-5">Đại lý liên kết</th>
                            <th className="px-8 py-5">Người thụ hưởng / STK nhận</th>
                            <th className="px-8 py-5">Số tiền chuyển</th>
                            <th className="px-8 py-5">Thời gian hoàn thành</th>
                            <th className="px-10 py-5">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                          {filteredHistoryPayments.map(p => {
                            const dl = dealers.find(d => d.id === p.dealerGroupId);
                            const bank = MASTER_BANKS.find(b => b.id === p.recvBankId);
                            const isSuccess = p.status === PaymentStatus.COMPLETED;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                                      {p.imagePath ? (
                                        <img src={p.imagePath} alt="payment voucher preview" className="w-full h-full object-cover rounded-xl" />
                                      ) : (
                                        <FileText size={18} />
                                      )}
                                    </div>
                                    <div className="min-w-0 max-w-xs">
                                      <span className="block font-black text-slate-800 truncate leading-tight mb-1" title={p.fileName}>
                                        {p.fileName || "Tập lệnh chi"}
                                      </span>
                                      <span className="block text-[10px] text-slate-400 font-semibold font-mono leading-none">
                                        ID: {p.id}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  {dl ? (
                                    <span className="px-3 py-1 bg-slate-100 border border-slate-200/50 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider">
                                      {dl.code}
                                    </span>
                                  ) : "---"}
                                </td>
                                <td className="px-8 py-5">
                                  {p.recvAccountNo ? (
                                    <div>
                                      <span className="block text-slate-700 font-bold leading-tight">
                                        {p.recvAccountNo} ({bank ? bank.shortName : "---"})
                                      </span>
                                      <span className="block text-[10px] text-slate-400 font-semibold font-mono uppercase leading-none">
                                        {p.recvAccountName || "---"}
                                      </span>
                                    </div>
                                  ) : "---"}
                                </td>
                                <td className="px-8 py-5 font-black font-mono text-slate-800">
                                  {p.amount !== undefined ? formatCurrency(p.amount) : "---"}
                                </td>
                                <td className="px-8 py-5 text-slate-400 text-xs font-semibold">
                                  {p.completedAt ? formatDateTime(p.completedAt) : "---"}
                                </td>
                                <td className="px-10 py-5">
                                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'
                                  }`}>
                                    {isSuccess ? "Thành công" : "Từ chối"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredHistoryPayments.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-20 text-slate-400 font-semibold italic">
                                Sổ cái lịch sử giải ngân đang trống.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BANK ACCOUNT MANAGEMENT */}
              {activeTab === 'accounts' && (
                <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Mạng lưới tài khoản nguồn chi quỹ</h3>
                      <p className="text-slate-400 font-semibold text-sm">Cấu hình ngân hàng thanh toán, nạp hoặc điều tiết số dư biến động để giải ngân ủy thác.</p>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowFundModal(true)}
                        className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                      >
                        <PlusCircle size={16} />
                        Nạp bổ sung quỹ
                      </button>
                      <button 
                        onClick={() => setShowAddAccountModal(true)}
                        className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Thêm tài khoản nguồn
                      </button>
                    </div>
                  </div>

                  {/* Accounts Cards List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map(acc => {
                      const bankObj = MASTER_BANKS.find(b => b.id === acc.bankId);
                      return (
                        <div key={acc.id} className="bg-white border-2 border-slate-150 rounded-[32px] p-8 shadow-sm flex flex-col justify-between group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-6 -mt-6"></div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-6 z-10 relative">
                              <div className="h-10 px-4 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center justify-center font-black text-xs text-slate-500 uppercase tracking-widest leading-none">
                                {bankObj ? bankObj.shortName : "NH NGUỒN"}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => startEditAccount(acc)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                  title="Chỉnh sửa tài khoản"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(acc.id, acc.accountAlias)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Tên gợi nhớ nguồn</span>
                            <h4 className="text-lg font-black text-slate-800 leading-tight mt-1 mb-4">{acc.accountAlias}</h4>

                            <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100/50 mb-6">
                              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Số tài khoản chi quỹ</span>
                              <span className="text-sm font-bold font-mono tracking-wider text-slate-700">{acc.accountNo}</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-6">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Số tiền hiện hữu bảo chứng</span>
                            <span className="text-2xl font-black text-blue-600 leading-none block mt-1 tracking-tight">
                              {formatCurrency(acc.currentBalance)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {accounts.length === 0 && (
                      <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[32px] py-16 flex flex-col items-center justify-center text-center p-6">
                        <Wallet size={48} className="text-slate-300 mb-4 animate-bounce" />
                        <h4 className="text-lg font-bold text-slate-700 mb-1">Chưa khai báo tài khoản ngân hàng nguồn</h4>
                        <p className="text-slate-400 text-xs font-semibold max-w-sm">Vui lòng khởi tạo ít nhất một tài khoản ngân hàng của đơn vị chi quota giải ngân để bảo bảo nghiệp vụ sổ cái.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: DEALER GROUPS */}
              {activeTab === 'dealers' && (
                <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Danh mục đại lý giải ngân ủy thác</h3>
                      <p className="text-slate-400 font-semibold text-sm">Danh mục đầu mối chi nhánh chấp hành phiếu chi trong hệ thống để tự động tập hợp.</p>
                    </div>

                    <button 
                      onClick={handleAddDealerClick}
                      className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus size={16} />
                      Khai báo đại lý mới
                    </button>
                  </div>

                  {/* Dealers List Card Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dealers.map(dl => {
                      return (
                        <div key={dl.id} className="bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-between group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/20 rounded-full -mr-6 -mt-6"></div>
                          
                          <div>
                            <div className="flex items-start justify-between mb-6">
                              <span className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                                MÃ CHỈ THỊ: {dl.code}
                              </span>
                              
                              <span className="text-[10px] text-slate-400 font-mono font-bold">{dl.id}</span>
                            </div>

                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Tên đại lý</span>
                            <h4 className="text-xl font-black text-slate-800 leading-tight mt-1 mb-4 truncate">{dl.name}</h4>

                            {dl.description && (
                              <p className="text-slate-400 font-medium text-xs mb-6 line-clamp-2 italic">
                                "{dl.description}"
                              </p>
                            )}

                            {(dl.phone || dl.address) && (
                              <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100/50 mb-6 text-xs font-bold text-slate-500">
                                {dl.phone && <div>SĐT liên hệ: {dl.phone}</div>}
                                {dl.address && <div className="truncate">Địa chỉ: {dl.address}</div>}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3 border-t border-slate-100 pt-6">
                            <button
                              onClick={() => handleEditDealerClick(dl)}
                              className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              Sửa đổi
                            </button>
                            <button
                              onClick={() => handleDeleteDealer(dl.id)}
                              className="px-3 py-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-100/30 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {dealers.length === 0 && (
                      <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[32px] py-16 flex flex-col items-center justify-center text-center p-6">
                        <Store size={48} className="text-slate-300 mb-4 animate-bounce" />
                        <h4 className="text-lg font-bold text-slate-700 mb-1">Chưa có đại lý giải ngân</h4>
                        <p className="text-slate-400 text-xs font-semibold max-w-sm">Tạo nhóm đầu mối thanh toán chi tiêu để AI gộp file tự động phân loại hóa đơn.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: ACC ACCOUNTANT REPORTS VIEW */}
              {activeTab === 'reports' && (
                <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  {/* Selector date filter row */}
                  <div className="bg-white border-2 border-slate-150 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Tổng hợp kết quả kế toán giải ngân</h3>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Truy xuất bảng đối soát dòng tiền và xuất hóa đơn chi nhánh</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Thời điểm báo cáo:</span>
                        <input
                          type="date"
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="px-5 py-3 border bg-slate-50 border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-blue-600 transition-all cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={handleExportAccountingExcel}
                        className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <FileDown size={14} />
                        Xuất báo cáo Excel
                      </button>
                    </div>
                  </div>

                  {/* Summary Balance Table */}
                  <div className="bg-white border-2 border-slate-100 rounded-[36px] overflow-hidden shadow-sm">
                    <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h4 className="text-base font-bold text-slate-800">Cân đối số dư theo ngày chỉ định ({reportDate})</h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="px-10 py-5">Tài khoản nguồn chi</th>
                            <th className="px-8 py-5">Số tài khoản</th>
                            <th className="px-8 py-5">Số dư đầu kỳ</th>
                            <th className="px-8 py-5">Cộng Nạp (Ghi có)</th>
                            <th className="px-8 py-5">Cộng Chi (Bữa nay)</th>
                            <th className="px-10 py-5">Tồn quỹ cuối ngày</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                          {accounts.map(acc => {
                            const startRange = new Date(reportDate);
                            startRange.setHours(0,0,0,0);
                            const endRange = new Date(reportDate);
                            endRange.setHours(23,59,59,999);

                            const prevFunding = ledger.filter(l => l.accountId === acc.id && new Date(l.timestamp) < startRange);
                            const prevPayments = payments.filter(p => p.senderAccountId === acc.id && p.status === PaymentStatus.COMPLETED && p.completedAt && new Date(p.completedAt) < startRange);
                            
                            const beginning = acc.openingBalance + 
                              prevFunding.filter(l => l.type === 'FUNDING').reduce((sum, l) => sum + l.amount, 0) -
                              prevPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

                            const todayFund = ledger.filter(l => l.accountId === acc.id && new Date(l.timestamp) >= startRange && new Date(l.timestamp) <= endRange);
                            const todayPay = payments.filter(p => p.senderAccountId === acc.id && p.status === PaymentStatus.COMPLETED && p.completedAt && new Date(p.completedAt) >= startRange && new Date(p.completedAt) <= endRange);

                            const added = todayFund.filter(l => l.type === 'FUNDING').reduce((sum, l) => sum + l.amount, 0);
                            const spend = todayPay.reduce((sum, p) => sum + (p.amount || 0), 0);
                            const closing = beginning + added - spend;

                            return (
                              <tr key={acc.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-5 text-slate-800">{acc.accountAlias}</td>
                                <td className="px-8 py-5 text-slate-400 font-mono text-xs">{acc.accountNo}</td>
                                <td className="px-8 py-5 text-slate-500 font-mono font-semibold">{formatCurrency(beginning)}</td>
                                <td className="px-8 py-5 text-emerald-600 font-mono font-semibold">+{formatCurrency(added)}</td>
                                <td className="px-8 py-5 text-red-500 font-mono font-semibold">-{formatCurrency(spend)}</td>
                                <td className="px-10 py-5 text-blue-600 font-mono font-black">{formatCurrency(closing)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Accountant Dealers detailed grid report */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-slate-800">Chi tiết đối soát giao dịch theo tổ chức Đại lý</h4>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {dealers.map(dl => {
                        const startRange = new Date(reportDate);
                        startRange.setHours(0,0,0,0);
                        const endRange = new Date(reportDate);
                        endRange.setHours(23,59,59,999);

                        const todayDealerPayments = payments.filter(p => 
                          p.dealerGroupId === dl.id && 
                          p.status === PaymentStatus.COMPLETED && 
                          p.completedAt && 
                          new Date(p.completedAt) >= startRange && 
                          new Date(p.completedAt) <= endRange
                        );

                        return (
                          <div key={dl.id} className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                <h5 className="font-black text-slate-800 truncate">Nhóm đại lý: {dl.name} ({dl.code})</h5>
                                <span className="px-3.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  {todayDealerPayments.length} giao dịch thành công
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                                      <th className="px-8 py-4">Tên file / Phiếu chi</th>
                                      <th className="px-6 py-4">STK hưởng / Người nhận</th>
                                      <th className="px-6 py-4 text-right">Số tiền giải ngân</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                                    {todayDealerPayments.sort(sortFileNameComparator).map(p => {
                                      return (
                                        <tr key={p.id} className="hover:bg-slate-50/25">
                                          <td className="px-8 py-4 max-w-xs truncate" title={p.fileName}>
                                            {p.fileName || p.voucherNo || "Phiếu chi ủy thác"}
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className="block text-slate-800 font-bold">{p.recvAccountNo}</span>
                                            <span className="block text-[9px] text-slate-400 font-mono uppercase">{p.recvAccountName}</span>
                                          </td>
                                          <td className="px-6 py-4 text-right font-black font-mono text-slate-900">
                                            {formatCurrency(p.amount)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {todayDealerPayments.length === 0 && (
                                      <tr>
                                        <td colSpan={3} className="text-center py-10 text-slate-400 italic font-semibold">
                                          Chưa phát sinh giao dịch giải ngân khớp thành công ngày bữa nay.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center font-black text-sm text-slate-800">
                              <span>TỔNG DOANH SỐ ĐÃ CHI:</span>
                              <span className="font-mono text-lg text-blue-600">
                                {formatCurrency(todayDealerPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: ADMIN STAFF MANAGEMENT */}
              {activeTab === 'users' && appUser.role === UserRole.ADMIN && (
                <UserManagement />
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Slide-out SIDE DETAILS PANEL (Pending Draw) */}
      <AnimatePresence>
        {selectedPaymentId && selectedPayment && (
          <>
            {/* Backdrop cover glass */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPaymentId(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 transition-all duration-300"
            ></motion.div>

            {/* Slide-out details body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-screen w-full max-w-4xl bg-white shadow-2xl border-l border-slate-200 z-52 flex flex-col overflow-hidden"
            >
              {/* Header card details */}
              <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="min-w-0 flex-1 mr-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block leading-tight">Yêu cầu chi tiết bóc tách # {selectedPayment.id}</span>
                  <h3 className="text-lg font-black text-slate-800 truncate leading-tight" title={selectedPayment.fileName}>
                    {selectedPayment.fileName || "Tập tin chi tiết bóc tách"}
                  </h3>
                </div>

                <div className="flex gap-2">
                  {/* EXPLICIT REQUESTED OPTION: Delete button inside Detail Panel */}
                  <button
                    onClick={() => handleDeletePaymentTask(selectedPayment.id)}
                    title="Xóa yêu cầu"
                    className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all cursor-pointer flex items-center justify-center border border-red-100/30"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedPaymentId(null)}
                    className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Drawer Container Panel Scroll Body */}
              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 custom-scrollbar">
                
                {/* Column left side: Large view picture uploader */}
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ảnh chứng từ giải ngân đính kèm</div>
                  <div className="border-2 border-slate-150 rounded-3xl overflow-hidden aspect-[4/5] bg-slate-50 p-4 relative flex items-center justify-center">
                    {selectedPayment.imagePath ? (
                      <img 
                        src={selectedPayment.imagePath} 
                        alt="phiếu chi OCR" 
                        className="max-h-full max-w-full rounded-2xl object-contain shadow-md"
                      />
                    ) : (
                      <ImageIcon size={48} className="text-slate-300" />
                    )}
                  </div>
                  
                  {selectedPayment.aiRawText && (
                    <div className="p-5 bg-slate-50 border border-slate-150 rounded-3xl">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Dữ liệu phân tích AI Gốc</div>
                      <code className="text-[10.5px] font-mono text-slate-600 block whitespace-pre-wrap select-all font-semibold leading-relaxed max-h-40 overflow-y-auto">
                        {selectedPayment.aiRawText}
                      </code>
                    </div>
                  )}
                </div>

                {/* Column right side: Editing Interactive form */}
                <div className="space-y-6 flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none mb-1">
                      Chi tiết dữ liệu giải ngân (AI đã bóc tách)
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                        NGÂN HÀNG THỤ HƯỞNG (NHẬN)
                      </label>
                      <select
                        value={selectedPayment.recvBankId || ""}
                        onChange={(e) => handleUpdateSelectedPaymentField({ recvBankId: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-155 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm"
                      >
                        <option value="">-- Chọn ngân hàng --</option>
                        {MASTER_BANKS.map(b => (
                          <option key={b.id} value={b.id}>{b.shortName} - {b.fullName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                        SỐ TÀI KHOẢN ĐÍCH NHẬN TIỀN
                      </label>
                      <input
                        type="text"
                        value={selectedPayment.recvAccountNo || ""}
                        onChange={(e) => handleUpdateSelectedPaymentField({ recvAccountNo: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-155 rounded-2xl font-bold font-mono outline-none focus:border-blue-600 focus:bg-white transition-all text-sm"
                        placeholder="Số tài khoản ngân hàng người nhận"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                        TÊN NGƯỜI THỤ HƯỞNG (HỌ TÊN UPPERCASE)
                      </label>
                      <input
                        type="text"
                        value={selectedPayment.recvAccountName || ""}
                        onChange={(e) => handleUpdateSelectedPaymentField({ recvAccountName: e.target.value.toUpperCase() })}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-155 rounded-2xl font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-sm text-slate-800"
                        placeholder="VD: NGUYEN VAN A"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block leading-none">
                        SỐ TIỀN THỰC CHI GIẢI NGÂN (VND)
                      </label>
                      <input
                        type="text"
                        value={selectedPayment.amount !== undefined ? formatNumberInput(selectedPayment.amount) : ""}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, "");
                          const numVal = cleaned ? parseInt(cleaned, 10) : 0;
                          handleUpdateSelectedPaymentField({ amount: numVal });
                        }}
                        className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-2xl outline-none focus:border-blue-600 font-mono font-black text-blue-600 shadow-inner"
                        placeholder="0"
                      />
                      <div className="text-right text-[11px] text-slate-400 font-bold tracking-wide italic">
                        {formatCurrency(selectedPayment.amount)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* AMBER HIGHLIGHT STYLING FOR VOUCHER NO */}
                      <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-4 block">
                        Số phiếu nghiệp vụ (Voucher No)
                      </label>
                      <input
                        type="text"
                        value={selectedPayment.voucherNo || ""}
                        onChange={(e) => handleUpdateSelectedPaymentField({ voucherNo: e.target.value })}
                        className="w-full px-6 py-4 bg-amber-50/50 border-2 border-amber-200 text-amber-800 rounded-2xl font-black outline-none focus:border-amber-600 transition-all text-sm uppercase placeholder:text-amber-600/40"
                        placeholder="VD: BILL-01...."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                        NỘI DUNG CHUYỂN TIỀN (MEMO)
                      </label>
                      <textarea
                        rows={2}
                        value={selectedPayment.description || ""}
                        onChange={(e) => handleUpdateSelectedPaymentField({ description: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-150 rounded-2xl text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white resize-none transition-all placeholder:italic"
                        placeholder="Nội dung gửi kèm giao dịch Napas"
                      />
                    </div>
                  </div>

                  {/* Dynamic Sync Live VietQR Napas Preview area */}
                  {selectedPayment.recvBankId && selectedPayment.recvAccountNo ? (
                    <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl space-y-4">
                      <div className="flex items-center gap-5">
                        <img 
                          src={generateVietQRUrl({
                            binCode: MASTER_BANKS.find(b => b.id === selectedPayment.recvBankId)?.binCode,
                            accountNo: selectedPayment.recvAccountNo,
                            amount: selectedPayment.amount,
                            description: selectedPayment.description || "Thanh toan Smart Pay",
                            accountName: selectedPayment.recvAccountName
                          })}
                          alt="VietQR Napas Quick Pay code"
                          className="w-28 h-28 p-2 bg-white rounded-2xl border border-slate-150 shadow-sm shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-base font-black text-slate-800 leading-tight mb-1">Cấp mã Napas VietQR</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 leading-tight">
                            Khi hoàn thành, quét mã này để thực hiện chuyển tiền từ tài khoản nguồn
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Live VietQR Sync
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs font-semibold italic">
                        Điền đầy đủ Ngân hàng và Số tài khoản thụ hưởng để đồng bộ mã quét QR thanh toán tức thời.
                      </p>
                    </div>
                  )}

                  {/* Choose Sender Corporate Source Account For disbursement ledger */}
                  <div className="p-6 bg-blue-50 border border-blue-150 rounded-3xl space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10.5px] font-black text-blue-600 uppercase tracking-widest ml-1 block leading-none">
                        Tài khoản nguồn xuất quỹ chi
                      </label>
                      <select
                        onChange={(e) => handleUpdateSelectedPaymentField({ senderAccountId: e.target.value })}
                        value={selectedPayment.senderAccountId || ""}
                        className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-xl font-bold outline-none focus:border-blue-600 text-xs text-slate-700"
                      >
                        <option value="">-- Chọn tài khoản nguồn chi --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountAlias} ({formatCurrency(acc.currentBalance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Confirmation & Reject Action Buttons */}
                  <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => handleRejectPaymentTask(selectedPayment.id)}
                      className="flex-1 py-5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-200 rounded-[28px] font-black text-sm transition-all active:scale-95 uppercase tracking-wider cursor-pointer"
                    >
                      Từ chối (REJECT)
                    </button>
                    
                    <button
                      onClick={() => handleCompletePaymentTask(selectedPayment.id, selectedPayment.senderAccountId!, selectedPayment.dealerGroupId)}
                      disabled={
                        !selectedPayment.senderAccountId || 
                        !selectedPayment.recvAccountNo || 
                        !selectedPayment.recvBankId || 
                        !selectedPayment.recvAccountName || 
                        !selectedPayment.amount || 
                        selectedPayment.amount <= 0
                      }
                      className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-[28px] shadow-[0_20px_50px_rgba(37,99,235,0.45)] disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm cursor-pointer"
                    >
                      <CheckCircle2 size={20} />
                      Xác nhận đã quét chi
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE BRAND-NEW COMPANY SENDER SOURCE ACCOUNT */}
      <AnimatePresence>
        {showAddAccountModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddAccountModal(false)} 
                className="absolute top-10 right-10 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                  <Wallet size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Thêm tài khoản nguồn</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Tạo ví thặng dư bảo chứng để lưu luồng tiền chi.</p>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nhóm ngân hàng</label>
                  <select 
                    value={accountForm.bankId}
                    onChange={(e) => setAccountForm({ ...accountForm, bankId: e.target.value })}
                    className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm"
                  >
                    {MASTER_BANKS.map(b => (
                      <option key={b.id} value={b.id}>{b.shortName} - {b.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tên gợi nhớ nguồn</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="VD: Techcombank Chuyển Tiền"
                    value={accountForm.accountAlias}
                    onChange={(e) => setAccountForm({ ...accountForm, accountAlias: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Số tài khoản chi quỹ</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold font-mono outline-none focus:border-blue-600"
                    placeholder="Nhập STK ngân hàng sở hữu"
                    value={accountForm.accountNo}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Số dư bảo chứng ban đầu (VND)</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black font-mono focus:bg-white"
                    placeholder="0"
                    value={accountForm.openingBalance ? formatNumberInput(accountForm.openingBalance) : ""}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      const num = clean ? parseInt(clean, 10) : 0;
                      setAccountForm({ ...accountForm, openingBalance: num });
                    }}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm cursor-pointer"
                >
                  <CheckCircle2 size={20} />
                  Xác nhận Tạo tài khoản
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: UPDATE / EDIT EXISTING SOURCE ACCOUNT */}
      <AnimatePresence>
        {editingAccount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingAccount(null)} 
                className="absolute top-10 right-10 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                  <Pencil size={40} className="text-white animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sửa tài khoản nguồn</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Cập nhật cấu hình thông tin tài khoản ngân hàng nguồn.</p>
              </div>

              <form onSubmit={handleEditAccountSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nhóm ngân hàng</label>
                  <select 
                    value={editAccountForm.bankId}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, bankId: e.target.value })}
                    className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm"
                  >
                    {MASTER_BANKS.map(b => (
                      <option key={b.id} value={b.id}>{b.shortName} - {b.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tên gợi nhớ nguồn</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="VD: Techcombank Chuyển Tiền"
                    value={editAccountForm.accountAlias}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, accountAlias: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Số tài khoản chi quỹ</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold font-mono outline-none focus:border-blue-600"
                    placeholder="Nhập STK ngân hàng sở hữu"
                    value={editAccountForm.accountNo}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, accountNo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Số dư bảo chứng ban đầu (VND)</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black font-mono focus:bg-white"
                    placeholder="0"
                    value={editAccountForm.openingBalance ? formatNumberInput(editAccountForm.openingBalance) : ""}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      const num = clean ? parseInt(clean, 10) : 0;
                      setEditAccountForm({ ...editAccountForm, openingBalance: num });
                    }}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm cursor-pointer"
                >
                  <CheckCircle2 size={20} />
                  Xác nhận Cập nhật
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD EXTRA FUNDING QUOTA BALANCES (Ghi có / Nạp quỹ) */}
      <AnimatePresence>
        {showFundModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowFundModal(false)} 
                className="absolute top-10 right-10 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-emerald-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100">
                  <CheckCircle2 size={40} className="text-white animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">Báo Có Nạp Hạn Mức Quỹ</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Nạp tiền mặt bổ sung hạn mức chi tiêu cho tài khoản nguồn.</p>
              </div>

              <form onSubmit={handleFundAccount} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nhận nạp vào tài khoản nguồn</label>
                  <select 
                    value={fundForm.accountId}
                    onChange={(e) => setFundForm({ ...fundForm, accountId: e.target.value })}
                    className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all text-sm text-slate-700"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountAlias} ({formatCurrency(a.currentBalance)})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Số tiền thăng thêm VND</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4.5 bg-white border-2 border-slate-100 rounded-2xl text-2xl outline-none focus:border-emerald-600 font-mono font-black text-emerald-600 shadow-inner"
                    placeholder="0"
                    value={fundForm.amount ? formatNumberInput(fundForm.amount) : ""}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      const num = clean ? parseInt(clean, 10) : 0;
                      setFundForm({ ...fundForm, amount: num });
                    }}
                  />
                  <div className="text-right text-[11px] text-slate-400 font-bold italic mr-2 mt-1">
                    {formatCurrency(fundForm.amount)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mô tả lý do điều quỹ</label>
                  <textarea 
                    rows={2}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-semibold outline-none focus:border-emerald-600 resize-none transition-all placeholder:italic"
                    placeholder="Ghi chú nghiệp vụ..."
                    value={fundForm.note}
                    onChange={(e) => setFundForm({ ...fundForm, note: e.target.value })}
                  />
                </div>

                {fundForm.accountId && (
                  <div className="p-4 bg-slate-50 rounded-2xl border flex items-center gap-4">
                    <img 
                      src={generateVietQRUrl({
                        binCode: MASTER_BANKS.find(b => b.id === accounts.find(a => a.id === fundForm.accountId)?.bankId)?.binCode,
                        accountNo: accounts.find(a => a.id === fundForm.accountId)?.accountNo,
                        amount: fundForm.amount,
                        description: fundForm.note || "Nap tiền quy",
                        accountName: accounts.find(a => a.id === fundForm.accountId)?.accountAlias
                      })}
                      alt="VietQR Funding"
                      className="w-20 h-20 p-1.5 bg-white border rounded-xl shadow-xs"
                    />
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Mã chuyển khoản nhanh</h4>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Đã bổ túc STK ngân hàng nguồn nhận</p>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm cursor-pointer"
                >
                  <CheckCircle2 size={20} />
                  Xác nhận báo Ghi có liền hành
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT DEALER FORM */}
      <AnimatePresence>
        {showAddDealerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddDealerModal(false)} 
                className="absolute top-10 right-10 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                  <Store size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                  {selectedDealerId ? "Cập nhật đại lý" : "Khai báo đại lý mới"}
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Kết nối nhóm phiếu chi để phân chia theo đầu mục.</p>
              </div>

              <form onSubmit={handleCreateOrUpdateDealer} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mã đại lý giải ngân</label>
                  <input 
                    type="text"
                    required
                    disabled={!!selectedDealerId}
                    className="w-full px-6 py-4 bg-slate-50 disabled:bg-slate-100 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-600 text-sm placeholder:text-slate-400 uppercase"
                    placeholder="VD: TUYT, LINA, TRUM..."
                    value={dealerForm.code}
                    onChange={(e) => setDealerForm({ ...dealerForm, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tên tổ chức đại lý</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="VD: Nhà phân phối đại lý TUYT"
                    value={dealerForm.name}
                    onChange={(e) => setDealerForm({ ...dealerForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Số điện thoại liên hệ</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="VD: 0987654321..."
                    value={dealerForm.phone}
                    onChange={(e) => setDealerForm({ ...dealerForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Địa chỉ hoạt động</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="Nhập địa chỉ của đại lý..."
                    value={dealerForm.address}
                    onChange={(e) => setDealerForm({ ...dealerForm, address: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ghi chú / Mô tả chi tiết</label>
                  <textarea 
                    rows={2}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-semibold outline-none focus:border-blue-600 resize-none transition-all placeholder:italic text-xs"
                    placeholder="Thông tin đại lý liên kết..."
                    value={dealerForm.description}
                    onChange={(e) => setDealerForm({ ...dealerForm, description: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm cursor-pointer"
                >
                  <CheckCircle2 size={20} />
                  Xác nhận lưu thông tin
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog (IFrame-safe) */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 leading-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-bold">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all cursor-pointer text-sm"
                >
                  Bỏ qua
                </button>
                <button 
                  onClick={() => {
                    setConfirmModal({ ...confirmModal, show: false });
                    confirmModal.onConfirm();
                  }}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-100 cursor-pointer text-sm"
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Alert Dialog (IFrame-safe) */}
      {alertModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 leading-tight">
                  {alertModal.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-bold">
                  {alertModal.message}
                </p>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => setAlertModal({ ...alertModal, show: false })}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-100 cursor-pointer text-sm"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
