"use client";

import {
  ActivityIcon,
  ArchiveRestoreIcon,
  BadgeDollarSignIcon,
  BellIcon,
  BookAIcon,
  BrainCircuitIcon,
  BrainIcon,
  BrushCleaningIcon,
  Building2Icon,
  CalendarIcon,
  ChartBarDecreasingIcon,
  ChartPieIcon,
  ClipboardCheckIcon,
  ClipboardMinusIcon,
  ComponentIcon,
  CookieIcon,
  CreditCardIcon,
  FingerprintIcon,
  FolderDotIcon,
  FolderIcon,
  GaugeIcon,
  GithubIcon,
  GraduationCapIcon,
  ImagesIcon,
  KeyIcon,
  MailIcon,
  MessageSquareHeartIcon,
  MessageSquareIcon,
  ProportionsIcon,
  PuzzleIcon,
  RedoDotIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SpeechIcon,
  SquareCheckIcon,
  SquareKanbanIcon,
  StickyNoteIcon,
  UserIcon,
  UsersIcon,
  WalletMinimalIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  isComing?: boolean;
  isDataBadge?: string;
  isNew?: boolean;
  newTab?: boolean;
  items?: NavItem[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navItems: NavGroup[] = [
  {
    title: "Dashboards",
    items: [
      {
        title: "Classic Dashboard",
        href: "/dashboard/default",
        icon: ChartPieIcon,
      },
      {
        title: "E-commerce",
        href: "#",
        icon: ShoppingBagIcon,
        items: [
          { title: "Dashboard", href: "/dashboard/ecommerce" },
          { title: "Product List", href: "/dashboard/pages/products" },
          { title: "Product Detail", href: "/dashboard/pages/products/1" },
          { title: "Add Product", href: "/dashboard/pages/products/create" },
          { title: "Order List", href: "/dashboard/pages/orders" },
          { title: "Order Detail", href: "/dashboard/pages/orders/detail" },
        ],
      },
      {
        title: "Payment Dashboard",
        href: "/dashboard/payment",
        icon: CreditCardIcon,
        items: [
          { title: "Dashboard", href: "/dashboard/payment" },
          { title: "Transactions", href: "/dashboard/payment/transactions" },
        ],
      },
      {
        title: "Hotel Dashboard",
        href: "/dashboard/hotel",
        icon: Building2Icon,
        items: [
          { title: "Dashboard", href: "/dashboard/hotel" },
          { title: "Bookings", href: "/dashboard/hotel/bookings" },
        ],
      },
      {
        title: "Project Management",
        href: "/dashboard/project-management",
        icon: FolderDotIcon,
        items: [
          { title: "Dashboard", href: "/dashboard/project-management" },
          { title: "Project List", href: "/dashboard/project-list" },
        ],
      },
      { title: "Sales", href: "/dashboard/sales", icon: BadgeDollarSignIcon },
      { title: "CRM", href: "/dashboard/crm", icon: ChartBarDecreasingIcon },
      {
        title: "Website Analytics",
        href: "/dashboard/website-analytics",
        icon: GaugeIcon,
      },
      {
        title: "File Manager",
        href: "/dashboard/file-manager",
        icon: FolderIcon,
      },
      { title: "Crypto", href: "/dashboard/crypto", icon: WalletMinimalIcon },
      {
        title: "Academy/School",
        href: "/dashboard/academy",
        icon: GraduationCapIcon,
      },
      {
        title: "Hospital Management",
        href: "/dashboard/hospital-management",
        icon: ActivityIcon,
      },
      {
        title: "Finance Dashboard",
        href: "/dashboard/finance",
        icon: WalletMinimalIcon,
      },
    ],
  },
  {
    title: "Apps",
    items: [
      {
        title: "Kanban",
        href: "/dashboard/apps/kanban",
        icon: SquareKanbanIcon,
      },
      {
        title: "Notes",
        href: "/dashboard/apps/notes",
        icon: StickyNoteIcon,
        isDataBadge: "8",
      },
      {
        title: "Chats",
        href: "/dashboard/apps/chat",
        icon: MessageSquareIcon,
        isDataBadge: "5",
      },
      {
        title: "Social Media",
        href: "/dashboard/apps/social-media",
        icon: MessageSquareHeartIcon,
        isNew: true,
      },
      { title: "Mail", href: "/dashboard/apps/mail", icon: MailIcon },
      {
        title: "Todo List App",
        href: "/dashboard/apps/todo-list-app",
        icon: SquareCheckIcon,
      },
      {
        title: "Tasks",
        href: "/dashboard/apps/tasks",
        icon: ClipboardCheckIcon,
      },
      {
        title: "Calendar",
        href: "/dashboard/apps/calendar",
        icon: CalendarIcon,
      },
      {
        title: "File Manager",
        href: "/dashboard/apps/file-manager",
        icon: ArchiveRestoreIcon,
        isNew: true,
      },
      { title: "Api Keys", href: "/dashboard/apps/api-keys", icon: KeyIcon },
      {
        title: "POS App",
        href: "/dashboard/apps/pos-system",
        icon: CookieIcon,
      },
      {
        title: "Courses",
        href: "/dashboard/apps/courses",
        icon: BookAIcon,
        isNew: true,
      },
    ],
  },
  {
    title: "AI Apps",
    items: [
      { title: "AI Chat", href: "/dashboard/apps/ai-chat", icon: BrainIcon },
      {
        title: "AI Chat V2",
        href: "/dashboard/apps/ai-chat-v2",
        icon: BrainCircuitIcon,
        isNew: true,
      },
      {
        title: "Image Generator",
        href: "/dashboard/apps/ai-image-generator",
        icon: ImagesIcon,
      },
      {
        title: "Text to Speech",
        href: "/dashboard/apps/text-to-speech",
        icon: SpeechIcon,
        isComing: true,
      },
    ],
  },
  {
    title: "Pages",
    items: [
      {
        title: "Users List",
        href: "/dashboard/pages/users",
        icon: UsersIcon,
      },
      {
        title: "Profile V1",
        href: "/dashboard/pages/profile",
        icon: UserIcon,
      },
      {
        title: "Profile V2",
        href: "/dashboard/pages/user-profile",
        icon: UserIcon,
      },
      {
        title: "Onboarding Flow",
        href: "/dashboard/pages/onboarding-flow",
        icon: RedoDotIcon,
      },
      {
        title: "Empty States",
        href: "/dashboard/pages/empty-states/01",
        icon: BrushCleaningIcon,
        items: [
          {
            title: "Empty States 01",
            href: "/dashboard/pages/empty-states/01",
          },
          {
            title: "Empty States 02",
            href: "/dashboard/pages/empty-states/02",
          },
          {
            title: "Empty States 03",
            href: "/dashboard/pages/empty-states/03",
          },
          {
            title: "Empty States 04",
            href: "/dashboard/pages/empty-states/04",
          },
        ],
      },
      {
        title: "Settings",
        href: "/dashboard/pages/settings",
        icon: SettingsIcon,
        items: [
          { title: "Profile", href: "/dashboard/pages/settings" },
          { title: "Account", href: "/dashboard/pages/settings/account" },
          { title: "Billing", href: "/dashboard/pages/settings/billing" },
          { title: "Appearance", href: "/dashboard/pages/settings/appearance" },
          {
            title: "Notifications",
            href: "/dashboard/pages/settings/notifications",
          },
          { title: "Display", href: "/dashboard/pages/settings/display" },
        ],
      },
      {
        title: "Pricing",
        href: "#",
        icon: BadgeDollarSignIcon,
        items: [
          { title: "Column Pricing", href: "/dashboard/pages/pricing/column" },
          { title: "Table Pricing", href: "/dashboard/pages/pricing/table" },
          { title: "Single Pricing", href: "/dashboard/pages/pricing/single" },
        ],
      },
      {
        title: "Authentication",
        href: "/",
        icon: FingerprintIcon,
        items: [
          { title: "Login v1", href: "/dashboard/login/v1" },
          { title: "Login v2", href: "/dashboard/login/v2" },
          { title: "Register v1", href: "/dashboard/register/v1" },
          { title: "Register v2", href: "/dashboard/register/v2" },
          { title: "Forgot Password", href: "/dashboard/forgot-password" },
        ],
      },
      {
        title: "Notifications Page",
        href: "/dashboard/pages/notifications",
        icon: BellIcon,
      },
      {
        title: "Error Pages",
        href: "/",
        icon: FingerprintIcon,
        items: [
          { title: "404", href: "/dashboard/pages/error/404" },
          { title: "500", href: "/dashboard/pages/error/500" },
          { title: "403", href: "/dashboard/pages/error/403" },
        ],
      },
    ],
  },
  {
    title: "Others",
    items: [
      {
        title: "Widgets",
        href: "#",
        icon: PuzzleIcon,
        items: [
          { title: "Fitness", href: "/dashboard/widgets/fitness" },
          { title: "E-commerce", href: "/dashboard/widgets/ecommerce" },
          { title: "Analytics", href: "/dashboard/widgets/analytics" },
        ],
      },
      {
        title: "Download Shadcn UI Kit",
        href: "/pricing",
        icon: ClipboardMinusIcon,
        newTab: true,
      },
      {
        title: "Components",
        href: "/components",
        icon: ComponentIcon,
        newTab: true,
      },
      {
        title: "Blocks",
        href: "/blocks",
        icon: ComponentIcon,
        newTab: true,
      },
      {
        title: "Examples",
        href: "/examples",
        icon: ComponentIcon,
        newTab: true,
      },
      {
        title: "WebsiteTemplates",
        href: "/templates",
        icon: ProportionsIcon,
        newTab: true,
      },
      {
        title: "Github",
        href: "https://github.com/bundui",
        icon: GithubIcon,
        newTab: true,
      },
    ],
  },
];

