import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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
  const [visibleFields, setVisibleFields] = useState({ current: false, password: false, confirmation: false })
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
    {requireCurrentPassword && <label>Current password<span className="password-change-input"><input type={visibleFields.current ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={isSaving} /><button className="password-visibility-button" type="button" onClick={() => setVisibleFields((current) => ({ ...current, current: !current.current }))} aria-label={visibleFields.current ? 'Hide current password' : 'Show current password'} aria-pressed={visibleFields.current} disabled={isSaving}>{visibleFields.current ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
    <label>New password<span className="password-change-input"><input type={visibleFields.password ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required disabled={isSaving} /><button className="password-visibility-button" type="button" onClick={() => setVisibleFields((current) => ({ ...current, password: !current.password }))} aria-label={visibleFields.password ? 'Hide new password' : 'Show new password'} aria-pressed={visibleFields.password} disabled={isSaving}>{visibleFields.password ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
    <label>Confirm new password<span className="password-change-input"><input type={visibleFields.confirmation ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} required disabled={isSaving} /><button className="password-visibility-button" type="button" onClick={() => setVisibleFields((current) => ({ ...current, confirmation: !current.confirmation }))} aria-label={visibleFields.confirmation ? 'Hide password confirmation' : 'Show password confirmation'} aria-pressed={visibleFields.confirmation} disabled={isSaving}>{visibleFields.confirmation ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
    {error && <span className="auth-reset-note" role="alert">{error}</span>}
    <div className="dialog-actions">{onCancel && <Button variant="ghost" type="button" onClick={onCancel} disabled={isSaving}>Cancel</Button>}<Button type="submit" isLoading={isSaving} loadingText="Saving…">{submitLabel}</Button></div>
  </form>
}
