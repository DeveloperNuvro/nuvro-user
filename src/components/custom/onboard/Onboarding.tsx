import { useState, useMemo } from 'react';
import { RegularInput as Input } from "@/components/custom/inputbox/InputBox";
import { ButtonSmall } from "@/components/custom/button/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Header from '../header/Header';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { submitOnboarding } from '@/features/onboarding/onboardingSlice';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ===================================================================
// FIX 1: Restore the original OPTIONS. This is what the backend expects.
// ===================================================================
const ORIGINAL_OPTIONS = {
    businessType: ["B2B", "B2C", "e-Commerce Store", "Other"],
    industry: ["E-commerce", "Retail", "Education", "Healthcare", "Finance", "Travel & Hospitality", "Real Estate", "Food & Beverage", "Technology", "Entertainment", "Other"],
    platform: ["Custom Website", "Webflow", "WordPress", "Shopify", "WooCommerce", "BigCommerce", "Other"],
    supportSize: ["Just Me", "2-5", "6-9", "10 & Above"],
    supportChannels: ["Just getting started", "Email", "Messenger", "Zoho Desk", "ZenDesk", "LiveChat", "Tawk.to", "Intercom", "Other"],
    websiteTraffic: ["Up to 1000", "1000-5000", "5000-10000", "Over 10000", "I don’t know"],
    monthlyConversations: ["Up to 200", "200-1000", "1000-5000", "5000-10000", "Over 10000", "I don’t know"],
    goals: ["Offer 24/7 Support", "Boost Lead Generation and Sales", "Automate Ticketing System", "Reduce Operational Costs", "Streamline Internal Processes"]
};

// These keys are ONLY for looking up translations. They are not sent to the backend.
const OPTIONS_KEYS = {
    businessType: ["b2b", "b2c", "ecommerce", "other"],
    industry: ["ecommerce", "retail", "education", "healthcare", "finance", "travel", "realEstate", "food", "technology", "entertainment", "other"],
    platform: ["custom", "webflow", "wordpress", "shopify", "wooCommerce", "bigCommerce", "other"],
    supportSize: ["justMe", "size2_5", "size6_9", "size10plus"],
    supportChannels: ["gettingStarted", "email", "messenger", "zoho", "zendesk", "livechat", "tawkto", "intercom", "other"],
    websiteTraffic: ["upTo1k", "size1k_5k", "size5k_10k", "over10k", "dontKnow"],
    monthlyConversations: ["upTo200", "size200_1k", "size1k_5k", "size5k_10k", "over10k", "dontKnow"],
    goals: ["support247", "boostSales", "automateTickets", "reduceCosts", "streamlineProcesses"]
};


export default function OnboardingStep() {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        businessName: '',
        businessDomain: '',
        industry: '',
        businessType: '',
        platform: '',
        supportSize: '',
        supportChannels: [] as string[],
        websiteTraffic: '',
        monthlyConversations: '',
        goals: [] as string[],
    });

    // This part is correct: it creates the translated text for the UI buttons.
    const translatedOptions = useMemo(() => {
        const translate = (key: string, subkey: string) => t(`onboardingPage.options.${key}.${subkey}`);
        return {
            businessType: OPTIONS_KEYS.businessType.map(key => translate('businessType', key)),
            industry: OPTIONS_KEYS.industry.map(key => translate('industry', key)),
            platform: OPTIONS_KEYS.platform.map(key => translate('platform', key)),
            supportSize: OPTIONS_KEYS.supportSize.map(key => translate('supportSize', key)),
            supportChannels: OPTIONS_KEYS.supportChannels.map(key => translate('supportChannels', key)),
            websiteTraffic: OPTIONS_KEYS.websiteTraffic.map(key => translate('websiteTraffic', key)),
            monthlyConversations: OPTIONS_KEYS.monthlyConversations.map(key => translate('monthlyConversations', key)),
            goals: OPTIONS_KEYS.goals.map(key => translate('goals', key)),
        }
    }, [t]);

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleMultiSelect = (field: keyof typeof formData, option: string) => {
        const selected = formData[field] as string[];
        const exists = selected.includes(option);
        const updated = exists ? selected.filter(o => o !== option) : [...selected, option];
        handleChange(field, updated);
    };

    const isStepValid = () => {
        switch (step) {
            case 1: return !!formData.businessName.trim();
            case 2: return !!formData.businessDomain.trim();
            case 3: return !!formData.industry.trim();
            case 4: return !!formData.businessType;
            case 5: return !!formData.platform;
            case 6: return !!formData.supportSize;
            case 7: return formData.supportChannels.length > 0;
            case 8: return !!formData.websiteTraffic;
            case 9: return !!formData.monthlyConversations;
            case 10: return formData.goals.length > 0;
            default: return true;
        }
    };

    const handleNext = () => {
        if (step < 11) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const navigate = useNavigate();
    const sendToMainMenu = () => {
        setTimeout(() => { navigate('/main-menu/pricing'); }, 2000);
    }

    const dispatch = useDispatch<AppDispatch>();
    const { status } = useSelector((state: any) => state.onboarding);
    
    const hanleClick = async () => {
        try {
            // ===================================================================
            // FIX 2: This logic now correctly maps the translated UI selection
            // back to the ORIGINAL English value that the backend expects.
            // ===================================================================
            const dataToSend = {
                ...formData,
                industry: ORIGINAL_OPTIONS.industry[translatedOptions.industry.indexOf(formData.industry)],
                businessType: ORIGINAL_OPTIONS.businessType[translatedOptions.businessType.indexOf(formData.businessType)],
                platform: ORIGINAL_OPTIONS.platform[translatedOptions.platform.indexOf(formData.platform)],
                supportSize: ORIGINAL_OPTIONS.supportSize[translatedOptions.supportSize.indexOf(formData.supportSize)],
                websiteTraffic: ORIGINAL_OPTIONS.websiteTraffic[translatedOptions.websiteTraffic.indexOf(formData.websiteTraffic)],
                monthlyConversations: ORIGINAL_OPTIONS.monthlyConversations[translatedOptions.monthlyConversations.indexOf(formData.monthlyConversations)],
                supportChannels: formData.supportChannels.map(sc => ORIGINAL_OPTIONS.supportChannels[translatedOptions.supportChannels.indexOf(sc)]),
                goals: formData.goals.map(g => ORIGINAL_OPTIONS.goals[translatedOptions.goals.indexOf(g)]),
            };
            
            const res = await dispatch(submitOnboarding(dataToSend)).unwrap();
            toast.success(res.message || t('onboardingPage.toasts.success'));
            sendToMainMenu();
        } catch (err: any) {
            toast.error(err || t('onboardingPage.toasts.error'));
        }
    }

    const renderButtons = (field: keyof typeof formData, options: string[], isMulti = false) => (
        <div className="flex flex-wrap gap-2 justify-center">
            {options.map(opt => {
                const selected = isMulti
                    ? (formData[field] as string[]).includes(opt)
                    : formData[field] === opt;
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => isMulti ? toggleMultiSelect(field, opt) : handleChange(field, opt)}
                        className={`px-4 py-2 rounded-[6px] border text-[14px] cursor-pointer ${selected
                            ? "bg-[#DBC9FF] text-[#ff21b0] border-[#ff21b0]"
                            : " text-[#A3ABB8] dark:text-[#89888C] border-[#D4D8DE] dark:border-[#2C3139]"
                            }`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step1.label')}</label>
                        <Input
                            placeholder={t('onboardingPage.steps.step1.placeholder')}
                            value={formData.businessName}
                            onChange={(e) => handleChange('businessName', e.target.value)}
                            className="w-full"
                        />
                    </>
                );
            case 2:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step2.label')}</label>
                        <Input
                            placeholder={t('onboardingPage.steps.step2.placeholder')}
                            value={formData.businessDomain}
                            onChange={(e) => handleChange('businessDomain', e.target.value)}
                            className="w-full"
                        />
                    </>
                );
            case 3:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step3.label')}</label>
                        {renderButtons('industry', translatedOptions.industry)}
                    </>
                );
            case 4:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step4.label')}</label>
                        {renderButtons('businessType', translatedOptions.businessType)}
                    </>
                );
            case 5:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step5.label')}</label>
                        {renderButtons('platform', translatedOptions.platform)}
                    </>
                );
            case 6:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step6.label')}</label>
                        {renderButtons('supportSize', translatedOptions.supportSize)}
                    </>
                );
            case 7:
                return (
                    <>
                        <label className="text-[18px] font-500 dark:text-[#FFFFFF] text-[#101214] text-center">
                            {t('onboardingPage.steps.step7.label')} <br />
                            <span className="text-sm">{t('onboardingPage.steps.step7.select_all')}</span>
                        </label>
                        {renderButtons('supportChannels', translatedOptions.supportChannels, true)}
                    </>
                );
            case 8:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step8.label')}</label>
                        {renderButtons('websiteTraffic', translatedOptions.websiteTraffic)}
                    </>
                );
            case 9:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">{t('onboardingPage.steps.step9.label')}</label>
                        {renderButtons('monthlyConversations', translatedOptions.monthlyConversations)}
                    </>
                );
            case 10:
                return (
                    <>
                        <label className="text-[18px] font-500 dark:text-[#FFFFFF] text-[#101214] text-center">
                            {t('onboardingPage.steps.step10.label')} <br />
                            <span className="text-sm">{t('onboardingPage.steps.step10.select_all')}</span>
                        </label>
                        {renderButtons('goals', translatedOptions.goals, true)}
                    </>
                );
            case 11:
                return (
                    <div className="text-center space-y-4">
                        <h2 className="text-[28px] font-500 text[#101214]">{t('onboardingPage.steps.step11.title')}</h2>
                        <p className="text-[#A3ABB8]">{t('onboardingPage.steps.step11.subtitle')}</p>
                        <ButtonSmall value={status === "loading" ? t('onboardingPage.buttons.loading') : t('onboardingPage.buttons.launch')} onClick={hanleClick} />
                    </div>
                );
            default:
                return null;
        }
    };
    
    const getTitle = () => {
        if (step >= 1 && step <= 4) return t('onboardingPage.titles.introduce');
        if (step >= 5 && step <= 9) return t('onboardingPage.titles.interactions');
        if (step === 10) return t('onboardingPage.titles.goals');
        return "";
    }

    const getSubtitle = () => {
        if (step === 1) return t('onboardingPage.subtitles.step1');
        if (step === 2) return t('onboardingPage.subtitles.step2');
        if (step === 3) return t('onboardingPage.subtitles.step3');
        if (step >= 4 && step <= 6) return t('onboardingPage.subtitles.step4_5_6');
        if (step === 7) return t('onboardingPage.subtitles.step7');
        if (step === 8) return t('onboardingPage.subtitles.step8');
        if (step === 9) return t('onboardingPage.subtitles.step9');
        if (step === 10) return t('onboardingPage.subtitles.step10');
        return "";
    }

    return (
        <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 relative">
            <Header isColor={true} />
            <Card className="w-full rounded-[16px] max-w-2xl border border-[#D4D8DE] dark:border-[#2C3139]">
                <CardContent className="py-10 px-6 flex flex-col items-center gap-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-[28px] font-500 text-[#101214] dark:text-[#FFFFFF] ">{getTitle()}</h1>
                        <p className="text-sm text-[#A3ABB8] dark:text-[#ABA8B4]">{getSubtitle()}</p>
                    </div>

                    <div className="w-full space-y-4 flex flex-col items-center">{renderStepContent()}</div>

                    {step < 11 && (
                        <div className="w-full mt-6 flex justify-center items-center gap-5">
                            {step > 1 && (
                                <ButtonSmall
                                    isOutline={true}
                                    type="button"
                                    onClick={handleBack}
                                    value={t('onboardingPage.buttons.back')}
                                />
                            )}
                            <ButtonSmall
                                type="button"
                                onClick={handleNext}
                                disabled={!isStepValid()}
                                value={step === 10 ? t('onboardingPage.buttons.complete') : t('onboardingPage.buttons.next')}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="w-full max-w-xl text-center mt-6 px-6 bottom-[80px] absolute">
                <div className='text-[14px] font-400 text-[#A3ABB8] w-full mb-5'>{t('onboardingPage.footer.progressText')}</div>
                <Progress value={(step / 11) * 100} />
            </div>
        </div>
    );
}