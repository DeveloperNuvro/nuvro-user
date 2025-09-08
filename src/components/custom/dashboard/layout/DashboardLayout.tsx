// src/layouts/DashboardLayout.tsx

import { useState, useEffect, useMemo, } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, CircleUser, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logo from "@/assets/images/LogoColor.png";
import logoWhite from "@/assets/images/logoWhiteColor.png";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "../../languageToggle";
import { MdOutlinePayment } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { logoutUser, User as AuthUser } from '@/features/auth/authSlice';
import { fetchBusinessById } from "@/features/business/businessSlice";
import toast from 'react-hot-toast';
import { format } from 'date-fns';
// import OneSignal from 'react-onesignal';
import { menuRoutes } from "@/appRoutes";
// import { registerPushToken } from "@/features/notification/notificationService";
import { useGlobalPresenceSocket } from "@/hooks/useGlobalPresenceSocket";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [imageSrc, setImageSrc] = useState<string>(logoWhite);
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth as { user: AuthUser | null });
  const { selectedBusiness } = useSelector((state: RootState) => state.business);

  useGlobalPresenceSocket();

  // const oneSignalInitialized = useRef(false);

  // useEffect(() => {
   
  //   if (!user) {
  //     oneSignalInitialized.current = false;
  //     return;
  //   }

  //   if (oneSignalInitialized.current) {
  //     return;
  //   }

  //   const initializeOneSignal = async () => {
  //     try {
  //       oneSignalInitialized.current = true;
  //       await OneSignal.init({
  //         appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
  //         allowLocalhostAsSecureOrigin: true,
  //       });

  //       // Use the new SDK methods to get the token
  //       const pushToken = OneSignal.User.PushSubscription.id;

  //       if (pushToken) {
  //         console.log('OneSignal push token available on init:', pushToken);
  //         await registerPushToken({ token: pushToken, platform: 'web' });
  //       } else {
  //         // If the token isn't immediately available, listen for changes
  //         const subscriptionChanged = async (change: any) => {
  //           if (change.current.id) {
  //             console.log('OneSignal push token became available after change:', change.current.id);
  //             await registerPushToken({ token: change.current.id, platform: 'web' });
  //             // Once we have the token, we don't need to listen anymore for this session
  //             OneSignal.User.PushSubscription.removeEventListener('change', subscriptionChanged);
  //           }
  //         };
  //         OneSignal.User.PushSubscription.addEventListener('change', subscriptionChanged);
  //       }
  //     } catch (error) {
  //       console.error("Failed to initialize OneSignal:", error);
  //       oneSignalInitialized.current = false; // Reset on failure to allow retry
  //     }
  //   };

  //   initializeOneSignal();
  // }, [user]); 

  // // This effect for handling notification clicks is correct.
  // useEffect(() => {
  //   const handleNotificationClick = (event: any) => {
  //     const additionalData = event.notification.additionalData || event.notification.data;
  //     const conversationId = additionalData?.conversationId;
  //     if (conversationId) {
  //       navigate(`/main-menu/inbox`);
  //     }
  //   };
  //   OneSignal.Notifications.addEventListener('click', handleNotificationClick);
  //   return () => {
  //     OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
  //   };
  // }, [navigate]);

  const menuItems = useMemo(() => {
    if (!user) return [];
    const accessibleRoutes = menuRoutes.filter(route => route.allowedRoles.includes(user.role));
    
    const grouped = accessibleRoutes.reduce((acc, route) => {
      if (!acc[route.section]) acc[route.section] = [];
      
      const labelKey = `sidebar.labels.${route.label.toLowerCase().replace(/[^a-z0-9]/gi, '')}`;
console.log(`[DEBUG] Input Label: "${route.label}"  |  Generated Key: "${labelKey}"`);
      acc[route.section].push({
        label: t(labelKey, route.label),
        to: `/main-menu/${route.path}`,
        icon: route.icon,
        action: route.action,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return [
      { title: t('sidebar.sections.mainmenu', 'Main Menu'), links: grouped["Main Menu"] || [] },
      { title: t('sidebar.sections.business', 'Business'), links: grouped["Business"] || [] },
      { title: t('sidebar.sections.account', 'Account'), links: grouped["Account"] || [] }
    ].filter(section => section.links.length > 0);

  }, [user, t]);


  const businessId = useMemo(() => user?.businessId, [user]);

  useEffect(() => {
    if (businessId && user?.role === 'business') {
      dispatch(fetchBusinessById(businessId));
    }
  }, [dispatch, businessId, user?.role]);

  const handleMenuClick = async (item: any) => {
    if (item.action === 'logout') {
      try {
        await dispatch(logoutUser()).unwrap();
        toast.success(t('toastLogoutSuccess'));
        navigate('/login');
      } catch (err) {
        toast.error(t('toastLogoutFailed'));
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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mediaQuery.removeEventListener('change', updateImage); observer.disconnect(); };
  }, []);

  const endDateRaw = selectedBusiness?.currentPeriodEnd || selectedBusiness?.trialEndDate;
  const endDate = endDateRaw ? format(new Date(endDateRaw), 'MMMM d, yyyy, h:mm a') : 'N/A';

   const SidebarContent = (
    <div className="w-[300px] bg-[#FAFAFA] dark:bg-[#1B1B20] scrollbar-hide overflow-y-auto h-full fixed inset-y-0 left-0 border-r-[0.5px] border-[#D4D8DE] dark:border-[#2C3139] z-40">
      <div className="px-6 my-6 max-h-[100px]">
        <img className="object-fill" src={imageSrc} alt="Nuvro logo" />
      </div>
      <ScrollArea className="h-[calc(100vh-64px)] px-4">
        <nav className="flex flex-col gap-6">
          {menuItems?.map((section) => (
            <div key={section.title}>
              <p className="text-[12px] font-400 text-[#A3ABB8] uppercase mb-2">{section.title}</p>
              <ul className="space-y-1">
                {section?.links?.map((link) => (
                  <li key={link.to}>
                    {link.action === 'logout' ? (
                      <button onClick={() => handleMenuClick(link)} className="w-full cursor-pointer text-left block rounded-md px-3 py-2 text-sm font-400 transition-colors text-[#A3ABB8] hover:text-[#ff21b0] hover:bg-muted/40">
                        <div className="flex items-center">{link.icon}{link.label}</div>
                      </button>
                    ) : (
                      <NavLink to={link.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn("block rounded-md px-3 py-2 text-sm font-400 transition-colors", isActive ? "bg-[#f7deee] dark:bg-[#ff21b0] text-[#ff21b0] dark:text-[#FFFFFF]" : "hover:text-[#ff21b0] text-[#A3ABB8] hover:bg-muted/40")}>
                        <div className="flex items-center">{link.icon}{link.label}</div>
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
      return (<span className={cn("text-[#D4D8DE] dark:text-[#A3ABB8] text-[16px]", isLast && "font-500 text-[16px] text-[#101214] dark:text-[#FFFFFF]")} key={index}>{index > 0 && <span className="mx-1">/</span>}{label}</span>);
    });
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">{SidebarContent}</div>
      <div className="flex-1 flex flex-col md:ml-[300px]">
        <header className="h-[64px] flex items-center sticky top-0 z-[50] bg-[#FAFAFA] dark:bg-[#1B1B20] border-b-[0.5px] border-[#D4D8DE] dark:border-[#2C3139] px-[20px] py-[40px] justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild><button className="md:hidden"><Menu className="h-6 w-6" /></button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-[300px]">{SidebarContent}</SheetContent>
            </Sheet>
            <div className="text-sm hidden md:flex items-center">{getBreadcrumb()}</div>
          </div>
          <div className="flex items-center gap-4">
            {user?.role === 'business' && (
              <div className="hidden md:flex flex-col items-center text-[16px] font-400 text-[#101214] dark:text-[#FFFFFF] border-[#D4D8DE] dark:border-[#2C3139] border-[1px] px-[16px] py-[8px] rounded-md cursor-pointer">
                <div className="flex items-center"> <MdOutlinePayment className="mr-2" /> {t('currentSubscription')} <ChevronDown size={16} className="ml-1" /> </div>
                <div className="text-[10px] text-[#A3ABB8] dark:text-[#ABA8B4]">{t('subscriptionDetails', { plan: selectedBusiness?.subscriptionPlan, endDate: endDate })}</div>
              </div>
            )}
            <LanguageToggle />
            <ModeToggle />
            <CircleUser className="w-6 h-6 cursor-pointer" />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-[#121212]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}