import { ChoosePasswordPage } from './ChoosePasswordPage'

/** The page behind the link in the email an administrator's new account gets. */
export default function SetPasswordPage() {
  return (
    <ChoosePasswordPage
      copy={{
        title: 'Set your password',
        description: 'Choose a password to finish setting up your account.',
        invalidTitle: 'This link is not valid',
        invalidText:
          'This link is invalid or has expired. Links work once and expire after 24 hours. Use the link below to get a new one, or ask an administrator.',
        newLink: 'Send me a new link',
        button: 'Set password',
        notice: 'Password set. Sign in to continue.',
      }}
    />
  )
}
