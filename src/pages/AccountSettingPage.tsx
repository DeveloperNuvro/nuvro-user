import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { fetchUserProfile } from '@/features/profile/profileSlice';
// highlight-start
import { updateUserLanguage } from '@/features/auth/authSlice'; // Import the thunk
// highlight-end
import { User, Building, Shield } from 'lucide-react';
import { ProfileForm } from '../components/custom/settings/ProfileForm';
import { BusinessForm } from '../components/custom/settings/BusinessForm';
import { SecurityForm } from '../components/custom/settings/SecurityForm';
import { Skeleton } from '@/components/ui/skeleton';
// highlight-start
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
// highlight-end


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
    const { status: profileStatus } = useSelector((state: RootState) => state.profile);
    const { status: authStatus } = useSelector((state: RootState) => state.auth);


    const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'security'>('profile');

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

        i18n.changeLanguage(lang);

        try {
            await dispatch(updateUserLanguage({ language: lang })).unwrap();
            toast.success(t('settingsPage.language.updateSuccess'));
        } catch (error) {
            toast.error(t('settingsPage.language.updateError'));
        }
    };


    return (
        <div className="bg-gray-50 dark:bg-black min-h-screen">
            <div className="container mx-auto max-w-6xl py-12 px-4 md:px-8">
                <div className="space-y-1 mb-10">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                        {t('settingsPage.title')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('settingsPage.subtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-4 gap-x-12">
                    {/* Left Navigation Sidebar */}
                    <nav className="flex flex-col space-y-2 mb-8 md:mb-0">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
                                        : 'text-gray-500 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                <tab.icon className="mr-3 h-5 w-5" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                    
                    {/* Right Content Area */}
                    <div className="md:col-span-3">
                        {profileStatus === 'loading' ? (
                            <SettingsPageSkeleton />
                        ) : (
                            <div>
                                {activeTab === 'profile' && (
                                    // highlight-start
                                    <div className="space-y-8">
                                        {/* Language Settings Card */}
                                        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                                                {t('settingsPage.language.title')}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {t('settingsPage.language.subtitle')}
                                            </p>
                                            <div className="mt-4 max-w-xs">
                                                 <Label htmlFor="language-select">{t('settingsPage.language.label')}</Label>
                                                 <Select
                                                    value={i18n.language}
                                                    onValueChange={handleLanguageChange}
                                                    // The selector is disabled if any auth operation is loading
                                                    disabled={authStatus === 'loading'}
                                                 >
                                                    <SelectTrigger id="language-select" className="mt-2">
                                                        <SelectValue placeholder="Select language" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="en">English</SelectItem>
                                                        <SelectItem value="es">Español (Spanish)</SelectItem>
                                                        <SelectItem value="fr">Français (French)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        {/* Original Profile Form */}
                                        <ProfileForm />
                                    </div>
                                    // highlight-end
                                )}
                                {activeTab === 'business' && <BusinessForm />}
                                {activeTab === 'security' && <SecurityForm />}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettingsPage;