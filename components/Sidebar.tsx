'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  CalendarCheck,
  CreditCard,
  Home,
  Landmark,
  Menu,
  PieChart,
  ReceiptText,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';

const UserGreetingClient = dynamic(() => import('./UserGreetingClient'), {
  ssr: false,
  loading: () => <p className="text-xs font-medium uppercase text-slate-400">Welcome</p>,
});

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  aliases?: string[];
};

type NavCategory = {
  name: string;
  items: NavItem[];
};

const navCategories: NavCategory[] = [
  {
    name: 'Workspace',
    items: [
      {
        href: '/',
        label: 'Dashboard',
        icon: <Home className="mr-3 h-5 w-5" />,
        aliases: ['/dashboard', '/snapshot', '/reports', '/api-test', '/onboarding'],
      },
      {
        href: '/cashflow',
        label: 'Cashflow',
        icon: <CalendarCheck className="mr-3 h-5 w-5" />,
        aliases: [
          '/plan',
          '/pay-settings',
          '/pending-transactions',
          '/recurring-transactions',
          '/recurring-categories',
        ],
      },
      {
        href: '/budget',
        label: 'Budget',
        icon: <PieChart className="mr-3 h-5 w-5" />,
        aliases: ['/overspending-analysis', '/big-purchases', '/transaction-categories'],
      },
      {
        href: '/accounts',
        label: 'Accounts',
        icon: <Landmark className="mr-3 h-5 w-5" />,
        aliases: ['/assets', '/fund-accounts', '/credit-cards', '/investments', '/stocks', '/stock-demo'],
      },
      {
        href: '/savings-plan',
        label: 'Savings Plan',
        icon: <TrendingUp className="mr-3 h-5 w-5" />,
      },
      {
        href: '/transactions',
        label: 'Transactions',
        icon: <ReceiptText className="mr-3 h-5 w-5" />,
        aliases: ['/receipt-scanner', '/transaction-categories'],
      },
    ],
  },
];

const settingsNavItem: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: <Settings className="mr-3 h-5 w-5" />,
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActiveLink = (item: NavItem) => {
    if (item.href === '/') {
      return pathname === '/' || item.aliases?.includes(pathname);
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`) || Boolean(item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)));
  };

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setIsMobileOpen(false)}
      className={`group flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
        isActiveLink(item)
          ? 'bg-slate-950 font-medium text-white'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );

  return (
    <>
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors hover:bg-slate-50 hover:text-slate-950"
          aria-expanded={isMobileOpen}
        >
          <span className="sr-only">Open sidebar menu</span>
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <aside className={`${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-800 shadow-[2px_0_8px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-in-out md:translate-x-0`}>
        <div className="border-b border-slate-200 p-6">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-lg font-semibold text-slate-950">Finance Tracker</span>
              <span className="text-xs text-slate-400">Money command center</span>
            </div>
          </Link>
        </div>

        <div className="px-4 py-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <UserGreetingClient initialName="" />
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-4 pb-6">
          <div className="flex-1 overflow-y-auto">
            {navCategories.map((category) => (
              <div key={category.name} className="mb-6">
                <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase text-slate-400">
                  {category.name}
                </h3>
                <div className="space-y-1">
                  {category.items.map(renderNavItem)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-4">
            {renderNavItem(settingsNavItem)}
          </div>
        </nav>
      </aside>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
