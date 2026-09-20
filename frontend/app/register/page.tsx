'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { postAuthApi } from '@/app/api/auth';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phoneNumber: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await postAuthApi.register(form);
      router.push('/login?registered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-50 p-6'>
      <form onSubmit={submit} className='w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm'>
        <div>
          <p className='text-sm font-medium text-blue-600'>Report Daily App</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Tạo tài khoản</h1>
          <p className='mt-1 text-sm text-slate-500'>Không cần KYC hay xác thực OTP.</p>
        </div>
        <label className='block text-sm font-medium text-slate-700'>Họ và tên<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className='mt-2 w-full rounded-lg border px-3 py-2' /></label>
        <label className='block text-sm font-medium text-slate-700'>Email<input required type='email' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className='mt-2 w-full rounded-lg border px-3 py-2' /></label>
        <label className='block text-sm font-medium text-slate-700'>Mật khẩu<input required minLength={8} type='password' value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className='mt-2 w-full rounded-lg border px-3 py-2' /></label>
        <label className='block text-sm font-medium text-slate-700'>Số điện thoại (không bắt buộc)<input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className='mt-2 w-full rounded-lg border px-3 py-2' /></label>
        {error && <p className='text-sm text-red-600'>{error}</p>}
        <button disabled={loading} className='w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-60'>{loading ? 'Đang tạo…' : 'Tạo tài khoản'}</button>
        <p className='text-center text-sm text-slate-500'>Đã có tài khoản? <Link className='font-medium text-blue-600' href='/login'>Đăng nhập</Link></p>
      </form>
    </main>
  );
}
