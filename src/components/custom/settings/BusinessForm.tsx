import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { updateBusinessProfile, uploadBusinessLogo } from '@/features/profile/profileSlice';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Building } from 'lucide-react';

export const BusinessForm = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { profile, updateStatus } = useSelector((state: RootState) => state.profile);

    const [businessName, setBusinessName] = useState('');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setBusinessName(profile.businessName || '');
            setLogoPreview(profile.businessLogo || null);
        }
    }, [profile]);

    const handleNameSave = () => {
        dispatch(updateBusinessProfile({ businessName }));
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

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Business Information</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update your company's name and logo.</p>
            </div>
            <div className="p-8 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg ">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-1">
                        <Label>Business Logo</Label>
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
                            {isUpdating ? 'Uploading...' : 'Change Logo'}
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </div>

                    <div className="md:col-span-3"><hr className="dark:border-gray-800" /></div>

                    <div className="md:col-span-1">
                        <Label htmlFor="businessName">Business Name</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button className='cursor-pointer' onClick={handleNameSave} disabled={isUpdating || !hasNameChanged}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
};