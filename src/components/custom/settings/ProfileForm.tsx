import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { updateUserProfile } from '@/features/profile/profileSlice';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const ProfileForm = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { profile, updateStatus } = useSelector((state: RootState) => state.profile);
    

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
        }
    }, [profile]);

    const handleSaveChanges = () => {
        dispatch(updateUserProfile({ name, email, phone }));
    };

    const isUpdating = updateStatus === 'loading';
    const hasChanges = name !== profile?.name || email !== profile?.email || phone !== profile?.phone;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Personal Information</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This information will be displayed publicly so be careful what you share.</p>
            </div>
            <div className="p-8 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg ">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <Label htmlFor="name">Full Name</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="md:col-span-1">
                        <Label htmlFor="email">Email Address</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <div className="md:col-span-1">
                        <Label htmlFor="phone">Phone Number</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button className='cursor-pointer' onClick={handleSaveChanges} disabled={isUpdating || !hasChanges}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
};