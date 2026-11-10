import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '@/App'

describe('App', () => {
  it('renders the product name', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('PlaceWise')).toBeInTheDocument()
  })
})
