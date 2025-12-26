import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { fetchUserProfile } from '@/features/profile/profileSlice';
import { updateUserLanguage, deleteUserAccount } from '@/features/auth/authSlice';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { User, Building, Shield, Settings, Globe, Trash2 } from 'lucide-react';
import { ProfileForm } from '../components/custom/settings/ProfileForm';
import { BusinessForm } from '../components/custom/settings/BusinessForm';
import { SecurityForm } from '../components/custom/settings/SecurityForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


const SettingsPageSkeleton = () => (
    <div className="grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
        </div>
        <div className="md:col-span-3 space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-24 ml-auto" />
        </div>
    </div>
);


const AccountSettingsPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();
    const { status: profileStatus } = useSelector((state: RootState) => state.profile);
    const { user, status: authStatus } = useSelector((state: RootState) => state.auth);

    const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'security'>('profile');
    
    // Detect if dark mode is active
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return theme === 'dark';
    });
    
    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
            setIsDarkMode(mediaQuery.matches);
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            setIsDarkMode(theme === 'dark');
        }
    }, [theme]);

    useEffect(() => {
        if (profileStatus === 'idle') {
            dispatch(fetchUserProfile());
        }
    }, [dispatch, profileStatus]);

    const TABS = useMemo(() => [
        { id: 'profile', label: t('settingsPage.tabs.profile'), icon: User },
        { id: 'business', label: t('settingsPage.tabs.business'), icon: Building },
        { id: 'security', label: t('settingsPage.tabs.security'), icon: Shield },
    ], [t]);


    const handleLanguageChange = async (lang: string) => {
        if (!lang || lang === i18n.language) return;

        try {
            // 🔧 FIX: Validate language code before proceeding
            const supportedLanguages = ['en', 'es', 'bn'];
            if (!supportedLanguages.includes(lang)) {
                toast.error(`Unsupported language: ${lang}. Supported: ${supportedLanguages.join(', ')}`);
                return;
            }

            // 🔧 FIX: Save to backend first, then update UI
            const result = await dispatch(updateUserLanguage({ language: lang })).unwrap();
            console.log('✅ Language updated successfully:', { lang, result: result?.language });
            
            // 🔧 FIX: Update i18n immediately after successful backend update
            await i18n.changeLanguage(lang);
            
            // 🔧 FIX: Store in localStorage for persistence (CRITICAL)
            localStorage.setItem('i18nextLng', lang);
            
            // 🔧 FIX: Force i18n to use this language (bypass detection)
            i18n.language = lang;
            
            console.log('✅ Language synced:', { i18nLanguage: i18n.language, localStorage: localStorage.getItem('i18nextLng') });
            
            toast.success(t('settingsPage.language.updateSuccess'));
        } catch (error: any) {
            // 🔧 FIX: Show actual error message for debugging
            console.error('Language change error details:', {
                error,
                message: error?.message,
                response: error?.response?.data,
                payload: error?.payload
            });
            
            const errorMessage = error?.payload || 
                                error?.message || 
                                error?.response?.data?.message || 
                                t('settingsPage.language.updateError');
            
            toast.error(`Failed to update language: ${errorMessage}`);
            
            // Don't change language if backend save failed
            return;
        }
    };

    // highlight-start
    const handleDeleteAccount = async () => {
        if (!user) {
            toast.error(t('settingsPage.delete.noUserError'));
            return;
        }

        try {
            await dispatch(deleteUserAccount(user._id!)).unwrap();
            toast.success(t('settingsPage.delete.success'));
        } catch (error: any) {
            toast.error(error || t('settingsPage.delete.error'));
        }
    };
    // highlight-end


    return (
        <div className="min-h-screen pb-8">
            <div className="container mx-auto max-w-6xl py-8 px-4 md:px-8 space-y-8">
                {/* Enhanced Header Section */}
                <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text flex items-center gap-3">
                        <div className={`
                            p-2 rounded-xl
                            ${isDarkMode 
                                ? 'bg-gradient-to-br from-primary/30 to-primary/20 border border-primary/30' 
                                : 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20'
                            }
                        `}>
                            <Settings className="h-6 w-6 text-primary" />
                        </div>
                        {t('settingsPage.title')}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                        {t('settingsPage.subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-4 gap-6 lg:gap-12">
                    {/* Enhanced Left Navigation Sidebar */}
                    <nav className="flex flex-col space-y-2 mb-8 md:mb-0">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                                    ${activeTab === tab.id
                                        ? isDarkMode
                                            ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-md shadow-primary/10'
                                            : 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 shadow-sm shadow-primary/5'
                                        : isDarkMode
                                            ? 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                                            : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                                    }
                                `}
                            >
                                <tab.icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                    
                    {/* Right Content Area */}
                    <div className="md:col-span-3 space-y-6">
                        {profileStatus === 'loading' ? (
                            <SettingsPageSkeleton />
                        ) : (
                            <div className="space-y-6">
                                {activeTab === 'profile' && (
                                    <div className="space-y-6">
                                        {/* Language Settings Card */}
                                        <Card className={`
                                            overflow-hidden border transition-all duration-300
                                            ${isDarkMode 
                                                ? 'bg-card border-border/60 shadow-lg shadow-black/10' 
                                                : 'bg-card border-border/80 shadow-md shadow-black/5'
                                            }
                                        `}>
                                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500`}></div>
                                            <CardHeader className="relative z-10">
                                                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                                    <div className={`
                                                        p-2 rounded-lg
                                                        ${isDarkMode 
                                                            ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-blue-400/30' 
                                                            : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-300/40'
                                                        }
                                                    `}>
                                                        <Globe className="h-5 w-5 text-blue-500" />
                                                    </div>
                                                    {t('settingsPage.language.title')}
                                                </CardTitle>
                                                <CardDescription>
                                                    {t('settingsPage.language.subtitle')}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="relative z-10">
                                                <div className="max-w-xs">
                                                    <Label htmlFor="language-select" className="text-sm font-medium">
                                                        {t('settingsPage.language.label')}
                                                    </Label>
                                                    <Select
                                                        value={i18n.language}
                                                        onValueChange={handleLanguageChange}
                                                        disabled={authStatus === 'loading'}
                                                    >
                                                        <SelectTrigger id="language-select" className="mt-2 cursor-pointer">
                                                        <SelectValue placeholder={t('settingsPage.language.selectPlaceholder', 'Select language')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="en" className="cursor-pointer">{t('settingsPage.language.english', 'English')}</SelectItem>
                                                        <SelectItem value="es" className="cursor-pointer">{t('settingsPage.language.spanish', 'Español (Spanish)')}</SelectItem>
                                                        <SelectItem value="bn" className="cursor-pointer">{t('settingsPage.language.bangla', 'বাংলা (Bangla)')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        
                                        {/* Original Profile Form */}
                                        <ProfileForm />

                                        {/* Enhanced Danger Zone Card */}
                                        <Card className={`
                                            overflow-hidden border transition-all duration-300 py-5
                                            ${isDarkMode 
                                                ? 'bg-card border-red-500/30 shadow-lg shadow-red-500/10' 
                                                : 'bg-card border-red-500/40 shadow-md shadow-red-500/5'
                                            }
                                        `}>
                                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-500`}></div>
                                            <CardHeader className="relative z-10">
                                                <CardTitle className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-500">
                                                    <div className={`
                                                        p-2 rounded-lg
                                                        ${isDarkMode 
                                                            ? 'bg-gradient-to-br from-red-500/30 to-rose-500/20 border border-red-400/30' 
                                                            : 'bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-300/40'
                                                        }
                                                    `}>
                                                        <Trash2 className="h-5 w-5 text-red-500" />
                                                    </div>
                                                    {t('settingsPage.dangerZone.title')}
                                                </CardTitle>
                                                <CardDescription>
                                                    {t('settingsPage.dangerZone.subtitle')}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="relative z-10">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="destructive" 
                                                            disabled={authStatus === 'loading'}
                                                            className="cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            {t('settingsPage.delete.buttonText')}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center gap-2">
                                                                <Trash2 className="h-5 w-5 text-red-500" />
                                                                {t('settingsPage.delete.confirmTitle')}
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('settingsPage.delete.confirmDescription')}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="cursor-pointer">{t('Cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={handleDeleteAccount}
                                                                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 cursor-pointer"
                                                            >
                                                                {t('settingsPage.delete.confirmButton')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                                {activeTab === 'business' && <BusinessForm />}
                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <SecurityForm />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettingsPage;