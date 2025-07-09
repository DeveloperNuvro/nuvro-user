// components/layout/DashboardLayout.tsx
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, CircleUser, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logo from "@/assets/images/LogoColor.png";
import logoWhite from "@/assets/images/logoWhiteColor.png";
import { ModeToggle } from "@/components/mode-toggle";

import { FiGrid } from "react-icons/fi"; //overview
import { GoInbox } from "react-icons/go" //inbox
import { LuTicket } from "react-icons/lu"; //ticket
import { SiProbot } from "react-icons/si"; //AI agent
import { TbBoxModel2 } from "react-icons/tb"; //AI model
import { FiUsers } from "react-icons/fi"; //customers
import { FiTrendingUp } from "react-icons/fi"; //analytics
import { MdOutlinePayment } from "react-icons/md"; //plan & payment

import { IoSettingsOutline } from "react-icons/io5"; //settings
import { IoIosLogOut } from "react-icons/io"; //log out


import { useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { logoutUser } from '@/features/auth/authSlice';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux";
import { fetchBusinessById } from "@/features/business/businessSlice";
import { format } from 'date-fns';


const menuItems = [
  {
    title: "Main Menu",
    links: [
      { label: "Overview", to: "/main-menu/overview", icon: <FiGrid className="mr-2" /> },
      { label: "Inbox", to: "/main-menu/inbox", icon: <GoInbox className="mr-2" /> },
      { label: "Ticket", to: "/main-menu/ticket", icon: <LuTicket className="mr-2" /> },
      { label: "AI Model", to: "/main-menu/ai-model", icon: <TbBoxModel2 className="mr-2" /> },
      { label: "AI Agent", to: "/main-menu/ai-agent/setup", icon: <SiProbot className="mr-2" /> },
    ],
  },
  {
    title: "Business",
    links: [
      { label: "Customers", to: "/main-menu/customers", icon: <FiUsers className="mr-2" /> },
      { label: "Analytics", to: "/main-menu/analytics", icon: <FiTrendingUp className="mr-2" /> },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Plan & Payment", to: "/main-menu/pricing", icon: <MdOutlinePayment className="mr-2" /> },

      { label: "Settings", to: "/main-menu/settings", icon: <IoSettingsOutline className="mr-2" /> },
      { label: "Log Out", to: "logout", icon: <IoIosLogOut className="mr-2" />, action: "logout" },
    ],
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [imageSrc, setImageSrc] = useState<string>(logoWhite);


  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { user } = useSelector((state: RootState) => state.auth);

  const { selectedBusiness } = useSelector((state: RootState) => state.business);

  const businessId = user?.businessId || '';
  useEffect(() => {
    if (businessId) {
      dispatch(fetchBusinessById(businessId));
    }
  }, [dispatch, businessId]);

  const handleMenuClick = async (item: any) => {
    if (item.action === 'logout') {
      try {
        await dispatch(logoutUser()).unwrap();
        toast.success('Logged out successfully');
        navigate('/signin');
      } catch (err) {
        toast.error('Logout failed');
      }
    }
  };

   useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateImage = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setImageSrc(isDark ? logo : logoWhite);
    };

    updateImage();
    mediaQuery.addEventListener('change', updateImage);
    const observer = new MutationObserver(updateImage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      mediaQuery.removeEventListener('change', updateImage);
      observer.disconnect();
    };
  }, []);

  const endDateRaw = selectedBusiness?.currentPeriodEnd || selectedBusiness?.trialEndDate;
  const endDate = endDateRaw ? format(new Date(endDateRaw), 'MMMM d, yyyy, h:mm a') : 'N/A';

  const SidebarContent = (
    <div className="w-[300px] bg-[#FAFAFA] dark:bg-[#1B1B20] scrollbar-hide overflow-y-auto h-full  fixed inset-y-0 left-0 border-r-[0.5px] border-[#D4D8DE]
     dark:border-[#2C3139] z-40">
      <div className="px-6  my-6 max-h-[100px]">
        <img className="object-fill" src={imageSrc} alt="Nuvro logo" />
      </div>
      <ScrollArea className="h-[calc(100vh-64px)] px-4">
        <nav className="flex flex-col gap-6">
          {menuItems?.map((section) => (
            <div key={section.title}>
              <p className="text-[12px] font-400 text-[#A3ABB8] uppercase mb-2">{section.title}</p>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.to}>
                    {link.action === 'logout' ? (
                      <button
                        onClick={() => handleMenuClick(link)}
                        className="w-full cursor-pointer text-left block rounded-md px-3 py-2 text-sm font-400 transition-colors text-[#A3ABB8] hover:text-[#ff21b0] hover:bg-muted/40"
                      >
                        <div className="flex items-center">
                          {link.icon}
                          {link.label}
                        </div>
                      </button>
                    ) : (
                      <NavLink
                        to={link.to}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-md px-3 py-2 text-sm font-400 transition-colors",
                            isActive
                              ? "bg-[#f7deee] dark:bg-[#ff21b0] text-[#ff21b0] dark:text-[#FFFFFF]"
                              : "hover:text-[#ff21b0] text-[#A3ABB8] hover:bg-muted/40"
                          )
                        }
                      >
                        <div className="flex items-center">
                          {link.icon}
                          {link.label}
                        </div>
                      </NavLink>
                    )}

                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  const getBreadcrumb = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const label = segment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      const isLast = index === segments.length - 1;
      return (
        <span className={cn("text-[#D4D8DE] dark:text-[#A3ABB8] text-[16px]", isLast && "font-500 text-[16px] text-[#101214] dark:text-[#FFFFFF]")} key={index}>
          {index > 0 && <span className="mx-1">/</span>}
          {label}
        </span>
      );
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for md+ */}
      <div className="hidden md:block">
        {SidebarContent}
      </div>



      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-[300px]">
        {/* Header */}
        <header className="h-[64px]  flex items-center sticky  top-0  z-[50] bg-[#FAFAFA] dark:bg-[#1B1B20] border-b-[0.5px] border-[#D4D8DE] dark:border-[#2C3139] px-[20px] py-[40px] justify-end md:justify-between ">

          {/* Sidebar for mobile */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden py-4 fixed top-4 left-4 z-51" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[300px]">
              {SidebarContent}
            </SheetContent>
          </Sheet>

          <div className="text-sm md:flex hidden items-center">
            {getBreadcrumb()}
          </div>

          <div className="flex items-center gap-4">
            {/* <input
              type="text"
              placeholder="Search"
              className="rounded-md border px-3 py-1.5 text-sm bg-muted focus:outline-none"
            /> */}
            <div className="hidden md:flex flex-col items-center text-[16px] font-400 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] border-[1px] px-[16px] py-[8px] rounded-md cursor-pointer">
              <div className="flex items-center">
                <MdOutlinePayment className="mr-2" />
                Current Subscription
                <ChevronDown size={16} className="ml-1" />
              </div>
              <div className="text-[10px] text-[#A3ABB8] dark:text-[#ABA8B4]">
                You're on <span className="font-bold">{selectedBusiness?.subscriptionPlan}</span> Plan, <span className="font-bold">End: {endDate}</span>
              </div>
            </div>
            {/* <Languages className="w-5 h-5 cursor-pointer" /> */}
            <ModeToggle />
            <CircleUser className="w-6 h-6 cursor-pointer" />
          </div>
        </header>

        {/* Page Content with animation */}
        <main className="flex-1  p-6 overflow-y-auto">

          <div>
            <Outlet />
          </div>

        </main>
      </div>
    </div>
  );
}