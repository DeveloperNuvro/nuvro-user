import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '@/app/store';
import { updateBusinessProfile, uploadBusinessLogo } from '@/features/profile/profileSlice';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Building, Palette } from 'lucide-react';

export const BusinessForm = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation();
    const { profile, updateStatus } = useSelector((state: RootState) => state.profile);

    const [businessName, setBusinessName] = useState('');
    const [widgetColor, setWidgetColor] = useState('#ff21b0');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setBusinessName(profile.businessName || '');
            setWidgetColor(profile.widgetColor || '#ff21b0');
            setLogoPreview(profile.businessLogo || null);
        }
    }, [profile]);

    const handleNameSave = () => {
        dispatch(updateBusinessProfile({ businessName }));
    };

    const handleColorSave = () => {
        dispatch(updateBusinessProfile({ widgetColor }));
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setLogoPreview(URL.createObjectURL(file));
            dispatch(uploadBusinessLogo(file));
        }
    };

    const isUpdating = updateStatus === 'loading';
    const hasNameChanged = businessName !== profile?.businessName;
    const hasColorChanged = widgetColor !== (profile?.widgetColor || '#ff21b0');

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('businessForm.title')}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('businessForm.subtitle')}</p>
            </div>
            <div className="p-8 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg ">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-1">
                        <Label>{t('businessForm.logoLabel')}</Label>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden ring-2 ring-offset-2 ring-gray-200 dark:ring-offset-black dark:ring-gray-700">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Building className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUpdating}>
                            <Upload className="mr-2 h-4 w-4" />
                            {isUpdating ? t('businessForm.uploadingButton') : t('businessForm.changeLogoButton')}
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </div>

                    <div className="md:col-span-3"><hr className="dark:border-gray-800" /></div>

                    <div className="md:col-span-1">
                        <Label htmlFor="businessName">{t('businessForm.nameLabel')}</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>

                    <div className="md:col-span-3"><hr className="dark:border-gray-800" /></div>

                    <div className="md:col-span-1">
                        <Label htmlFor="widgetColor" className="flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Widget Color
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Customize your chat widget color
                        </p>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                id="widgetColor"
                                value={widgetColor}
                                onChange={(e) => setWidgetColor(e.target.value)}
                                className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                                style={{ backgroundColor: widgetColor }}
                            />
                            <Input
                                type="text"
                                value={widgetColor}
                                onChange={(e) => setWidgetColor(e.target.value)}
                                placeholder="#ff21b0"
                                className="w-32"
                                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={handleColorSave} 
                            disabled={isUpdating || !hasColorChanged}
                            size="sm"
                        >
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Color
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button className='cursor-pointer' onClick={handleNameSave} disabled={isUpdating || !hasNameChanged}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUpdating ? t('businessForm.savingButton') : t('businessForm.saveButton')}
                </Button>
            </div>
        </div>
    );
};