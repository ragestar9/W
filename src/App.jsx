import { useRoute } from '@/lib/router'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { LandingPage } from '@/pages/Landing'
import { ModelsPage } from '@/pages/Models'
import { PricingPage } from '@/pages/Pricing'
import { DocsPage } from '@/pages/Docs'
import { StatusPage } from '@/pages/Status'
import { SignInPage } from '@/pages/SignIn'
import { SignUpPage } from '@/pages/SignUp'
import { DashboardPage } from '@/pages/Dashboard'
import { NotFoundPage } from '@/pages/NotFound'

const routes = {
  '/': LandingPage,
  '/models': ModelsPage,
  '/pricing': PricingPage,
  '/docs': DocsPage,
  '/status': StatusPage,
  '/sign-in': SignInPage,
  '/sign-up': SignUpPage,
  '/dashboard': DashboardPage,
}

export function App() {
  const path = useRoute()
  const Page = routes[path] || NotFoundPage

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Page />
      </main>
      <Footer />
    </div>
  )
}
