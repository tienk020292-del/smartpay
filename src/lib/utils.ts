export const formatCurrency = (amount?: number) => {
  if (amount === undefined || amount === null) return '---';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatAccountNumber = (accountNo?: string) => {
  if (!accountNo) return '';
  // Remove any non-digits
  const clean = accountNo.replace(/\D/g, '');
  // Generic grouping for better readability: groups of 3-4
  if (clean.length <= 6) return clean.replace(/(\d{3})(?=\d)/g, '$1 - ');
  if (clean.length <= 10) {
    if (clean.length === 10) return `${clean.slice(0, 3)} - ${clean.slice(3, 6)} - ${clean.slice(6)}`;
    return clean.replace(/(\d{3})(?=\d)/g, '$1 - ');
  }
  return clean.replace(/(\d{4})(?=\d)/g, '$1 - ');
};

export const formatAccountingNumber = (amount?: number) => {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('vi-VN').format(amount);
};

export const parseAccountingNumber = (str: string) => {
  // Remove dots and replace comma with dot for JS Number parsing
  return Number(str.replace(/\./g, '').replace(/,/g, '.'));
};

export const getVietQRUrl = ({
  binCode,
  accountNo,
  amount,
  description,
  accountName
}: {
  binCode?: string;
  accountNo?: string;
  amount?: number;
  description?: string;
  accountName?: string;
}) => {
  if (!binCode || !accountNo) return '';
  const baseUrl = `https://img.vietqr.io/image/${binCode}-${accountNo}-compact2.jpg`;
  const params = new URLSearchParams();
  if (amount) params.append('amount', amount.toString());
  if (description) params.append('addInfo', description);
  if (accountName) params.append('accountName', accountName);
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};
