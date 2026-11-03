import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'

interface PasswordChangeFormProps {
  requireCurrentPassword: boolean
  submitLabel: string
  onSave: (password: string, currentPassword?: string) => Promise<string | null>
  onCancel?: () => void
}

export function PasswordChangeForm({ requireCurrentPassword, submitLabel, onSave, onCancel }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length < 12) {
      setError('Use at least 12 characters for your new password.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      const saveError = await onSave(password, requireCurrentPassword ? currentPassword : undefined)
      if (saveError) setError(saveError)
    } catch {
      setError('Could not update your password. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="password-change-form" onSubmit={submit}>
    {requireCurrentPassword && <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={isSaving} /></label>}
    <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required disabled={isSaving} /></label>
    <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} required disabled={isSaving} /></label>
    {error && <span className="auth-reset-note" role="alert">{error}</span>}
    <div className="dialog-actions">{onCancel && <Button variant="ghost" type="button" onClick={onCancel} disabled={isSaving}>Cancel</Button>}<Button type="submit" isLoading={isSaving} loadingText="Saving…">{submitLabel}</Button></div>
  </form>
}
