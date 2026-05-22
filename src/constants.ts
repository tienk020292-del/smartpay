import { Bank, CompanyAccount, DealerGroup } from './types';

export const MASTER_BANKS: Bank[] = [
  { id: 'vcb', binCode: '970436', shortName: 'Vietcombank', fullName: 'NH Ngoại Thương VN' },
  { id: 'mb', binCode: '970422', shortName: 'MBBank', fullName: 'NH Quân Đội' },
  { id: 'tcb', binCode: '970407', shortName: 'Techcombank', fullName: 'NH Kỹ Thương' },
  { id: 'bidv', binCode: '970418', shortName: 'BIDV', fullName: 'NH Đầu tư và Phát triển VN' },
  { id: 'acb', binCode: '970416', shortName: 'ACB', fullName: 'NH Á Châu' },
  { id: 'ncb', binCode: '970419', shortName: 'NCB', fullName: 'NH Quốc Dân' },
  { id: 'ctg', binCode: '970415', shortName: 'VietinBank', fullName: 'NH Công Thương VN' },
  { id: 'stb', binCode: '970403', shortName: 'Sacombank', fullName: 'NH Sài Gòn Thương Tín' },
  { id: 'agribank', binCode: '970405', shortName: 'Agribank', fullName: 'NH Nông nghiệp và Phát triển Nông thôn VN' },
  { id: 'tpbank', binCode: '970423', shortName: 'TPBank', fullName: 'NH Tiên Phong' },
  { id: 'vpbank', binCode: '970432', shortName: 'VPBank', fullName: 'NH Việt Nam Thịnh Vượng' },
  { id: 'hdb', binCode: '970437', shortName: 'HDBank', fullName: 'NH Phát triển TP.HCM' },
  { id: 'vab', binCode: '970427', shortName: 'VietABank', fullName: 'NH Việt Á' },
];

export const INITIAL_ACCOUNTS: CompanyAccount[] = [];

export const INITIAL_DEALERS: DealerGroup[] = [
  { id: 'dl-tuyt', code: 'TUYT', name: 'Đại lý TUYT', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dl-lina', code: 'LINA', name: 'Đại lý LINA', isActive: true, createdAt: new Date().toISOString() },
  { id: 'dl-trum', code: 'TRUM', name: 'Đại lý TRUM', isActive: true, createdAt: new Date().toISOString() },
];
