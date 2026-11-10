import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

// Development-only catalogue; excluded from production builds.
const DevComponentsPage = import.meta.env.DEV
  ? lazy(() => import('@/features/dev/DevComponentsPage'))
  : null

export default function App() {
  return (
    <Routes>
      {DevComponentsPage && (
        <Route
          path="/dev/components"
          element={
            <Suspense fallback={null}>
              <DevComponentsPage />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<main>PlaceWise</main>} />
    </Routes>
  )
}
