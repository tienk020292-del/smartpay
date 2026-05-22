import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Mail, 
  Key, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { UserRole, AppUser, DealerGroup } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [dealers, setDealers] = useState<DealerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: UserRole.DEALER,
    dealerId: ''
  });

  const fetchData = async () => {
    const token = localStorage.getItem('smart_pay_token');
    if (!token) return;

    try {
      // Fetch user accounts
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData);
      }

      // Fetch dealer groups
      const dealersRes = await fetch('/api/dealers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (dealersRes.ok) {
        const dData = await dealersRes.json();
        setDealers(dData);
      }
    } catch (err) {
      console.error("Failed to load administration data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Setup standard 5-second interval poll for administrative updates
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('smart_pay_token');
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setSuccess(`Đã tạo tài khoản cho ${formData.email} thành công!`);
      setShowAddModal(false);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: UserRole.DEALER,
        dealerId: ''
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Có lỗi xảy ra khi tạo người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Bạn có chắc muốn xóa người dùng này? Thao tác này sẽ loại bỏ quyền truy cập vào hệ thống.")) {
      try {
        const token = localStorage.getItem('smart_pay_token');
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to delete user');
        }

        setSuccess('Đã xóa người dùng thành công khỏi hệ thống quản lý.');
        fetchData();
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Lỗi khi gỡ quyền truy cập của người dùng.');
      }
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-2">Quản trị nhân sự</h1>
          <p className="text-slate-400 font-bold italic text-sm">Cấp phát tài khoản đăng nhập trực tiếp cho nhân viên kế toán (STAFF) và đại lý liên kết (DEALER).</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center gap-3 active:scale-95 uppercase tracking-widest text-xs cursor-pointer"
        >
          <UserPlus size={18} />
          Cấp tài khoản mới
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold animate-in zoom-in duration-300">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={u.uid}
            className="bg-white rounded-[32px] p-8 border-2 border-slate-50 shadow-sm relative group overflow-hidden"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <Users size={28} />
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                u.role === UserRole.ADMIN ? 'bg-red-50 text-red-600' :
                u.role === UserRole.STAFF ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {u.role}
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-black text-slate-800 truncate">{u.displayName || 'Chưa đặt tên'}</h3>
              <p className="text-slate-400 text-xs font-bold truncate flex items-center gap-2">
                <Mail size={12} /> {u.email}
              </p>
            </div>

            {u.role === UserRole.DEALER && u.dealerId && (
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Đại lý liên kết</div>
                <div className="text-xs font-black text-slate-700">
                  {dealers.find(d => d.id === u.dealerId)?.name || u.dealerId}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => handleDeleteUser(u.uid)}
                className="flex-1 py-3 bg-red-50 text-red-500 font-bold rounded-xl text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 size={14} /> Xóa truy cập
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 cursor-pointer">
                <X size={24} />
              </button>

              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                  <UserPlus size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight animate-pulse">Cấp tài khoản mới</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Mật khẩu khởi tạo sẽ do Quản trị viên bàn giao.</p>
              </div>

              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Họ và tên</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Đăng nhập</label>
                  <input 
                    type="email"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="email@vidu.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mật khẩu khởi tạo</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                    placeholder="Tối thiểu 6 ký tự"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Phân quyền</label>
                    <select 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    >
                      <option value={UserRole.STAFF}>STAFF (Kế toán)</option>
                      <option value={UserRole.DEALER}>DEALER (Đại lý)</option>
                      <option value={UserRole.ADMIN}>ADMIN (Quản trị)</option>
                    </select>
                  </div>

                  {formData.role === UserRole.DEALER && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Chọn đại lý</label>
                      <select 
                        required
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-600"
                        value={formData.dealerId}
                        onChange={(e) => setFormData({...formData, dealerId: e.target.value})}
                      >
                        <option value="">-- Chọn đại lý --</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm cursor-pointer"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  {isLoading ? 'Đang khởi tạo...' : 'Xác nhận tạo tài khoản'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
