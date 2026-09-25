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
import { ApiKeysPage } from '@/pages/dashboard/ApiKeys'
import { UsagePage } from '@/pages/dashboard/Usage'
import { PlaygroundPage } from '@/pages/dashboard/Playground'
import { BillingPage } from '@/pages/dashboard/Billing'
import { AdminUpstreamsPage } from '@/pages/admin/AdminUpstreams'
import { AdminKeysPage } from '@/pages/admin/AdminKeys'
import { AdminModelsPage } from '@/pages/admin/AdminModels'
import { AdminUsersPage } from '@/pages/admin/AdminUsers'
import { AdminLogsPage } from '@/pages/admin/AdminLogs'
import { AdminSettingsPage } from '@/pages/admin/AdminSettings'

const routes = {
  '/': LandingPage,
  '/models': ModelsPage,
  '/pricing': PricingPage,
  '/docs': DocsPage,
  '/status': StatusPage,
  '/sign-in': SignInPage,
  '/sign-up': SignUpPage,
  '/dashboard': DashboardPage,
  '/dashboard/keys': ApiKeysPage,
  '/dashboard/usage': UsagePage,
  '/dashboard/playground': PlaygroundPage,
  '/dashboard/billing': BillingPage,
  '/admin': AdminUpstreamsPage,
  '/admin/keys': AdminKeysPage,
  '/admin/models': AdminModelsPage,
  '/admin/users': AdminUsersPage,
  '/admin/logs': AdminLogsPage,
  '/admin/settings': AdminSettingsPage,
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
