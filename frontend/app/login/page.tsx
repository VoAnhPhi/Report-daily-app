'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { username, password, redirect: false });
    if (result?.error) setError('Email hoặc mật khẩu không đúng.');
    else router.push('/tasks');
    setLoading(false);
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-50 p-6'>
      <form onSubmit={submit} className='w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm'>
        <div>
          <p className='text-sm font-medium text-blue-600'>Report Daily App</p>
          <h1 className='mt-2 text-2xl font-semibold text-slate-900'>Đăng nhập</h1>
          <p className='mt-1 text-sm text-slate-500'>Dùng email hoặc mã tài khoản của bạn.</p>
        </div>
        <label className='block text-sm font-medium text-slate-700'>
          Email hoặc mã tài khoản
          <input required value={username} onChange={(event) => setUsername(event.target.value)} className='mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500' />
        </label>
        <label className='block text-sm font-medium text-slate-700'>
          Mật khẩu
          <input required type='password' value={password} onChange={(event) => setPassword(event.target.value)} className='mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500' />
        </label>
        {error && <p className='text-sm text-red-600'>{error}</p>}
        <button disabled={loading} className='w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-60'>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p className='text-center text-sm text-slate-500'>
          Chưa có tài khoản? <Link className='font-medium text-blue-600' href='/register'>Tạo tài khoản</Link>
        </p>
      </form>
    </main>
  );
}
