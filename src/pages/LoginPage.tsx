import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../lib/api'
import { FieldError } from '../components/ui'

const schema = z.object({ email: z.string().email('Enter a valid work email'), password: z.string().min(8, 'Password must be at least 8 characters') })
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })
  if (user) return <Navigate to="/" replace />
  const submit = async (values: Values) => {
    try { await login(values.email, values.password); navigate((location.state as { from?: string })?.from || '/', { replace: true }) }
    catch (error) { setError('root', { message: messageFromError(error) }) }
  }
  return <main className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-forest-deep p-14 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-28 top-20 size-96 rounded-full border-[70px] border-lime/10" /><div className="absolute -bottom-20 left-28 size-72 rounded-full bg-mint/5" />
      <div className="relative w-fit rounded-xl bg-white px-4 py-2"><img src="/infozzle-logo.png" alt="Infozzle" className="h-10 w-auto" /></div>
      <div className="relative max-w-xl"><p className="eyebrow !text-lime/70">People, thoughtfully managed</p><h1 className="mt-5 font-display text-6xl leading-[1.06] text-white">A calmer way to run your workplace.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-white/55">One focused space for your people, leave, remote work, onboarding, and decisions.</p></div>
      <p className="relative text-xs text-white/35">Secure access for MD and HR teams</p>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-12"><div className="w-full max-w-md">
      <div className="mb-10 w-fit rounded-xl border border-black/8 bg-white px-3 py-2 lg:hidden"><img src="/infozzle-logo.png" alt="Infozzle" className="h-8 w-auto" /></div>
      <div className="mb-8"><span className="mb-5 grid size-11 place-items-center rounded-xl bg-mint text-forest"><ShieldCheck className="size-5" /></span><h2 className="page-title">Welcome back</h2><p className="mt-2 text-sm text-black/50">Sign in with your company credentials.</p></div>
      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <div><label className="label" htmlFor="email">Work email</label><input id="email" className="field" autoComplete="email" placeholder="you@infozzle.com" {...register('email')} /><FieldError message={errors.email?.message} /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" type="password" className="field" autoComplete="current-password" placeholder="••••••••" {...register('password')} /><FieldError message={errors.password?.message} /></div>
        {errors.root && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="size-4" /></>}</button>
      </form>
    </div></section>
  </main>
}
