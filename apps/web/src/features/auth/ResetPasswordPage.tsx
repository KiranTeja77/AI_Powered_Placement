import { ChoosePasswordPage } from './ChoosePasswordPage'

export default function ResetPasswordPage() {
  return (
    <ChoosePasswordPage
      copy={{
        title: 'Choose a new password',
        description: 'You will be signed out of all devices.',
        invalidTitle: 'Reset link not valid',
        invalidText:
          'This reset link is invalid or has expired. Links work once and expire after 30 minutes.',
        newLink: 'Request a new link',
        button: 'Update password',
        notice: 'Password updated. Sign in with your new password.',
      }}
    />
  )
}
