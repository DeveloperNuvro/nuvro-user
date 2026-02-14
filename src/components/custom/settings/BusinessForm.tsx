import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import moment from 'moment-timezone';
import { AppDispatch, RootState } from '@/app/store';
import { updateBusinessProfile, uploadBusinessLogo, type DefaultWorkingHours, type DefaultOutsideHoursBehavior } from '@/features/profile/profileSlice';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Building, Palette, Clock, MessageCircle } from 'lucide-react';
import Checkbox from '@/components/custom/checkbox/Checkbox';

const ALL_TIMEZONES = moment.tz.names();

export const BusinessForm = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation();
    const { profile, updateStatus } = useSelector((state: RootState) => state.profile);

    const [businessName, setBusinessName] = useState('');
    const [widgetColor, setWidgetColor] = useState('#ff21b0');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [defaultWorkingHours, setDefaultWorkingHours] = useState<DefaultWorkingHours | null>(null);
    const [defaultOutsideHoursBehavior, setDefaultOutsideHoursBehavior] = useState<DefaultOutsideHoursBehavior | null>(null);

    const defaultSchedule = (): { dayOfWeek: number; start: string; end: string }[] =>
        [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: '09:00', end: '17:00' }));
    const updateScheduleSlot = (dayOfWeek: number, field: 'start' | 'end', value: string) => {
        setDefaultWorkingHours((prev) => {
            const schedule = prev?.schedule ?? defaultSchedule();
            const idx = schedule.findIndex((s) => s.dayOfWeek === dayOfWeek);
            const next = [...schedule];
            if (idx >= 0) {
                next[idx] = { ...next[idx], [field]: value };
            } else {
                next.push({ dayOfWeek, start: field === 'start' ? value : '09:00', end: field === 'end' ? value : '17:00' });
                next.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
            }
            return {
                timezone: prev?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                enabled: prev?.enabled ?? false,
                schedule: next,
            };
        });
    };
    const getScheduleSlot = (dayOfWeek: number) =>
        (defaultWorkingHours?.schedule ?? []).find((s) => s.dayOfWeek === dayOfWeek) ?? { dayOfWeek, start: '', end: '' };

    const dayNames = [
        { dayOfWeek: 0, labelKey: 'companyDefaults.days.sunday' },
        { dayOfWeek: 1, labelKey: 'companyDefaults.days.monday' },
        { dayOfWeek: 2, labelKey: 'companyDefaults.days.tuesday' },
        { dayOfWeek: 3, labelKey: 'companyDefaults.days.wednesday' },
        { dayOfWeek: 4, labelKey: 'companyDefaults.days.thursday' },
        { dayOfWeek: 5, labelKey: 'companyDefaults.days.friday' },
        { dayOfWeek: 6, labelKey: 'companyDefaults.days.saturday' },
    ];

    useEffect(() => {
        if (profile) {
            setBusinessName(profile.businessName || '');
            setWidgetColor(profile.widgetColor || '#ff21b0');
            setLogoPreview(profile.businessLogo || null);
            const wh = profile.defaultWorkingHours ?? null;
            if (wh && Array.isArray(wh.schedule) && wh.schedule.length) {
                setDefaultWorkingHours(wh);
            } else {
                setDefaultWorkingHours(wh ? { ...wh, schedule: defaultSchedule() } : null);
            }
            setDefaultOutsideHoursBehavior(profile.defaultOutsideHoursBehavior ?? null);
        }
    }, [profile]);

    const handleNameSave = () => {
        dispatch(updateBusinessProfile({ businessName }));
    };

    const handleColorSave = () => {
        dispatch(updateBusinessProfile({ widgetColor }));
    };

    const handleSaveCompanyDefaults = () => {
        const wh = defaultWorkingHours
            ? {
                ...defaultWorkingHours,
                schedule: (defaultWorkingHours.schedule ?? []).filter((s) => s.start && s.end),
            }
            : null;
        dispatch(updateBusinessProfile({ defaultWorkingHours: wh, defaultOutsideHoursBehavior: defaultOutsideHoursBehavior ?? null }));
    };

    const toggleOutsideOption = (opt: 'create_ticket' | 'talk_with_ai' | 'wait_for_human') => {
        const opts = defaultOutsideHoursBehavior?.options ?? ['create_ticket', 'talk_with_ai', 'wait_for_human'];
        const next = opts.includes(opt) ? opts.filter((o) => o !== opt) : [...opts, opt];
        setDefaultOutsideHoursBehavior({ ...defaultOutsideHoursBehavior, options: next, showClosedMessage: defaultOutsideHoursBehavior?.showClosedMessage !== false });
    };

    const hasCompanyDefaultsChanged =
        JSON.stringify(defaultWorkingHours ?? null) !== JSON.stringify(profile?.defaultWorkingHours ?? null) ||
        JSON.stringify(defaultOutsideHoursBehavior ?? null) !== JSON.stringify(profile?.defaultOutsideHoursBehavior ?? null);

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

                    <div className="md:col-span-3"><hr className="dark:border-gray-800" /></div>

                    <div className="md:col-span-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <Label>{t('companyDefaults.title')}</Label>
                    </div>
                    <div className="md:col-span-2 text-sm text-gray-500 dark:text-gray-400">
                        {t('companyDefaults.subtitle')}
                    </div>

                    <div className="md:col-span-1">
                        <Label>{t('companyDefaults.defaultWorkingHours')}</Label>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="wh-enabled"
                                checked={defaultWorkingHours?.enabled ?? false}
                                onCheckedChange={(checked) =>
                                    setDefaultWorkingHours({
                                        timezone: defaultWorkingHours?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                                        enabled: !!checked,
                                        schedule: defaultWorkingHours?.schedule ?? [],
                                    })
                                }
                            />
                            <Label htmlFor="wh-enabled" className="font-normal">{t('companyDefaults.useWorkingHours')}</Label>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('companyDefaults.timezone')}</Label>
                            <Select
                                value={defaultWorkingHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || ''}
                                onValueChange={(value) =>
                                    setDefaultWorkingHours({
                                        timezone: value,
                                        enabled: defaultWorkingHours?.enabled ?? false,
                                        schedule: defaultWorkingHours?.schedule ?? defaultSchedule(),
                                    })
                                }
                            >
                                <SelectTrigger className="w-full max-w-md">
                                    <SelectValue placeholder={t('companyDefaults.timezonePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[280px]">
                                    {ALL_TIMEZONES.map((tz) => (
                                        <SelectItem key={tz} value={tz}>
                                            {tz}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {(defaultWorkingHours?.enabled ?? false) && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('companyDefaults.hoursPerDay')}</p>
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{t('companyDefaults.day')}</th>
                                                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{t('companyDefaults.start')}</th>
                                                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{t('companyDefaults.end')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dayNames.map(({ dayOfWeek, labelKey }) => {
                                                const slot = getScheduleSlot(dayOfWeek);
                                                return (
                                                    <tr key={dayOfWeek} className="border-t border-gray-200 dark:border-gray-700">
                                                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{t(labelKey)}</td>
                                                        <td className="py-1 px-2">
                                                            <Input
                                                                type="time"
                                                                value={slot.start}
                                                                onChange={(e) => updateScheduleSlot(dayOfWeek, 'start', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <Input
                                                                type="time"
                                                                value={slot.end}
                                                                onChange={(e) => updateScheduleSlot(dayOfWeek, 'end', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-1">
                        <Label className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            {t('companyDefaults.outsideHoursBehavior')}
                        </Label>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="show-closed"
                                checked={defaultOutsideHoursBehavior?.showClosedMessage !== false}
                                onCheckedChange={(checked) =>
                                    setDefaultOutsideHoursBehavior({
                                        ...defaultOutsideHoursBehavior,
                                        showClosedMessage: checked !== false,
                                        options: defaultOutsideHoursBehavior?.options ?? ['create_ticket', 'talk_with_ai', 'wait_for_human'],
                                    })
                                }
                            />
                            <Label htmlFor="show-closed" className="font-normal">{t('companyDefaults.showClosedMessage')}</Label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('companyDefaults.optionsWhenClosed')}</p>
                        <div className="flex flex-wrap gap-4">
                            {(['create_ticket', 'talk_with_ai', 'wait_for_human'] as const).map((opt) => (
                                <div key={opt} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`opt-${opt}`}
                                        checked={(defaultOutsideHoursBehavior?.options ?? ['create_ticket', 'talk_with_ai', 'wait_for_human']).includes(opt)}
                                        onCheckedChange={() => toggleOutsideOption(opt)}
                                    />
                                    <Label htmlFor={`opt-${opt}`} className="font-normal capitalize">
                                        {t(`companyDefaults.option.${opt}`)}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSaveCompanyDefaults} disabled={isUpdating || !hasCompanyDefaultsChanged}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('companyDefaults.saveButton')}
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