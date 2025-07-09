import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { changeUserPassword } from '@/features/profile/profileSlice';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SecurityForm = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { updateStatus } = useSelector((state: RootState) => state.profile);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = () => {
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        dispatch(changeUserPassword({ oldPassword, newPassword }))
            .unwrap()
            .then(() => {
                toast.success("Password updated successfully!");
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            })
            
    };

    const isUpdating = updateStatus === 'loading';

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Change Password</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update the password used to log in to your account.</p>
            </div>
            <div className="p-8 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg ">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-6">
                    <div className="md:col-span-1">
                        <Label htmlFor="oldPassword">Current Password</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                    </div>

                    <div className="md:col-span-1">
                        <Label htmlFor="newPassword">New Password</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    
                    <div className="md:col-span-1">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <Button className='cursor-pointer' onClick={handlePasswordChange} disabled={isUpdating || !newPassword}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                </Button>
            </div>
        </div>
    );
};