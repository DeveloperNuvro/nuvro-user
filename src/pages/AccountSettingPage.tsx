import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { fetchUserProfile } from '@/features/profile/profileSlice';
import { User, Building, Shield } from 'lucide-react';
import { ProfileForm } from '../components/custom/settings/ProfileForm';
import { BusinessForm } from '../components/custom/settings/BusinessForm';
import { SecurityForm } from '../components/custom/settings/SecurityForm';
import { Skeleton } from '@/components/ui/skeleton';

// --- Loading Skeleton Component (No text, no changes needed) ---
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

// --- Main Page Component ---
const AccountSettingsPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation();
    const { status } = useSelector((state: RootState) => state.profile);

    const [activeTab, setActiveTab] = useState<'profile' | 'business' | 'security'>('profile');

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchUserProfile());
        }
    }, [dispatch, status]);

    // Use useMemo to prevent re-creating the array on every render
    const TABS = useMemo(() => [
        { id: 'profile', label: t('settingsPage.tabs.profile'), icon: User },
        { id: 'business', label: t('settingsPage.tabs.business'), icon: Building },
        { id: 'security', label: t('settingsPage.tabs.security'), icon: Shield },
    ], [t]);

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
                        {status === 'loading' ? (
                            <SettingsPageSkeleton />
                        ) : (
                            <div>
                                {activeTab === 'profile' && <ProfileForm />}
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