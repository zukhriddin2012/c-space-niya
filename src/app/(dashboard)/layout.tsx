import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-server';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import NotificationBell from '@/components/NotificationBell';
import SidebarToggle from '@/components/SidebarToggle';
import TestBannerWrapper from '@/components/TestBannerWrapper';
import FloatingFeedbackButton from '@/components/FloatingFeedbackButton';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  const showNotifications = ['general_manager', 'ceo', 'hr'].includes(user.role);

  return (
    <AuthProvider initialUser={user}>
      <SidebarProvider>
        <TestBannerWrapper />
        <div className="flex min-h-screen bg-gray-50">
          {/* Desktop Sidebar - hidden on mobile */}
          <div className="hidden lg:block">
            <Sidebar user={user} />
          </div>

        {/* Mobile Navigation */}
        <MobileNav user={user} />

        <main className="flex-1 overflow-auto w-full">
          {/* Top Header Bar - hidden on mobile (mobile has its own header) */}
          <div className="hidden lg:flex sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 items-center justify-between">
            <SidebarToggle />
            <div className="flex items-center gap-4">
            {showNotifications && <NotificationBell />}
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-700 text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
            </div>
          </div>

          {/* Mobile Header Spacer */}
          <div className="lg:hidden h-14" />

          {/* Main Content */}
          <div className="p-4 lg:p-6">{children}</div>
        </main>

          {/* Floating Feedback Button */}
          <FloatingFeedbackButton userRole={user.role} />
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
