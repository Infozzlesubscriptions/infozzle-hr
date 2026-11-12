import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusBadge, Modal } from '../components/ui'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

describe('shared UI', () => {
  it('renders status labels', () => {
    render(<StatusBadge status="approved" />)
    expect(screen.getByText('approved')).toBeInTheDocument()
  })

  it('closes a dialog from its close control', async () => {
    const close = vi.fn()
    render(<Modal open onClose={close} title="Test dialog"><p>Content</p></Modal>)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(close).toHaveBeenCalledOnce()
  })

  it('surfaces Zod validation errors through React Hook Form', async () => {
    function TestForm() {
      const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.email('Invalid email') })) })
      return <form onSubmit={handleSubmit(vi.fn())}><input aria-label="Email" {...register('email')} />{errors.email && <span>{errors.email.message}</span>}<button>Submit</button></form>
    }
    render(<TestForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findByText('Invalid email')).toBeInTheDocument()
  })
})
