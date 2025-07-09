import { useState } from 'react';
import { RegularInput as Input } from "@/components/custom/inputbox/InputBox";
import { ButtonSmall } from "@/components/custom/button/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Header from '../header/Header';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store';
import { submitOnboarding } from '@/features/onboarding/onboardingSlice';
import toast from 'react-hot-toast';
import {useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';




const OPTIONS = {
    businessType: ["B2B", "B2C", "e-Commerce Store", "Other"],
    industry: ["E-commerce", "Retail", "Education", "Healthcare", "Finance", "Travel & Hospitality", "Real Estate", "Food & Beverage", "Technology", "Entertainment", "Other"],
    platform: ["Custom Website", "Webflow", "WordPress", "Shopify", "WooCommerce", "BigCommerce", "Other"],
    supportSize: ["Just Me", "2-5", "6-9", "10 & Above"],
    supportChannels: ["Just getting started", "Email", "Messenger", "Zoho Desk", "ZenDesk", "LiveChat", "Tawk.to", "Intercom", "Other"],
    websiteTraffic: ["Up to 1000", "1000-5000", "5000-10000", "Over 10000", "I don’t know"],
    monthlyConversations: ["Up to 200", "200-1000", "1000-5000", "5000-10000", "Over 10000", "I don’t know"],
    goals: ["Offer 24/7 Support", "Boost Lead Generation and Sales", "Automate Ticketing System", "Reduce Operational Costs", "Streamline Internal Processes"]
};

export default function OnboardingStep() {
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
        else console.log("✅ Final Submission:", formData);
    };



    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };


    // Redirect to main-menu after successful onboarding
    const sendToMainMenu = () => {
        setTimeout(() => { navigate('/main-menu/pricing'); }, 2000);
    }

    // Final submission logic
    const dispatch = useDispatch<AppDispatch>();
    const {status} = useSelector((state: any) => state.onboarding);

    const navigate = useNavigate();
    const hanleClick = async() => {
        try {
            const res = await dispatch(submitOnboarding(formData)).unwrap();
            toast.success(res.message || 'Onboarding complete! Redirecting...');
            sendToMainMenu();
        } catch (err: any) {
            toast.error(err || 'Something went wrong');
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
                        onClick={() =>
                            isMulti ? toggleMultiSelect(field, opt) : handleChange(field, opt)
                        }
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
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">What’s the name of your business?</label>
                        <Input
                            placeholder="Your Business Name"
                            value={formData.businessName}
                            onChange={(e) => handleChange('businessName', e.target.value)}
                            className="w-full"
                        />
                    </>
                );
                case 2:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">What’s the name of your business domain?</label>
                        <Input
                            placeholder="Your Business Domain (e.g., example.com)"
                            value={formData.businessDomain}
                            onChange={(e) => handleChange('businessDomain', e.target.value)}
                            className="w-full"
                        />
                    </>
                );
            case 3:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">Which industry best describes your business?</label>
                        {renderButtons('industry', OPTIONS.industry)}
                    </>
                );
            case 4:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">How does your business operate?</label>
                        {renderButtons('businessType', OPTIONS.businessType)}
                    </>
                );

            case 5:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">Which platform does your website run on?</label>
                        {renderButtons('platform', OPTIONS.platform)}
                    </>
                );

            case 6:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">Your Customer Support Team Size?</label>
                        {renderButtons('supportSize', OPTIONS.supportSize)}
                    </>
                );

            case 7:
                return (
                    <>
                        <label className="text-[18px] font-500 dark:text-[#FFFFFF] text-[#101214] text-center">
                            Your current go-to tools or channels to support customer communication? <br />
                            <span className="text-sm">(Select all that apply)</span>
                        </label>
                        {renderButtons('supportChannels', OPTIONS.supportChannels, true)}
                    </>
                );
            case 8:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">Your monthly website traffic?</label>
                        {renderButtons('websiteTraffic', OPTIONS.websiteTraffic)}
                    </>
                );
            case 9:
                return (
                    <>
                        <label className="text-[18px] font-500 text-[#101214] dark:text-[#FFFFFF] text-center">How many conversations do you have with clients each month?</label>
                        {renderButtons('monthlyConversations', OPTIONS.monthlyConversations)}
                    </>
                );
            case 10:
                return (
                    <>
                        <label className="text-[18px] font-500 dark:text-[#FFFFFF] text-[#101214] text-center">
                            Your main goals for using Nuvro? <br />
                            <span className="text-sm">(Select all that apply)</span>
                        </label>
                        {renderButtons('goals', OPTIONS.goals, true)}
                    </>
                );
            case 11:
                return (
                    <div className="text-center space-y-4">
                        <h2 className="text-[28px] font-500 text[#101214]">🎉 You’re All Set!</h2>
                        <p className="text-[#A3ABB8]">Your AI-powered support is ready to take your business to the next level.</p>
                        <ButtonSmall value={`${status === "loading" ? "Loading..." : "Launch Nuvro"}`} onClick={hanleClick} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 relative">
            <Header isColor={true} />

            <Card className="w-full rounded-[16px] max-w-2xl border border-[#D4D8DE] dark:border-[#2C3139]">
                <CardContent className="py-10 px-6 flex flex-col items-center gap-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-[28px] font-500 text-[#101214] dark:text-[#FFFFFF] ">
                            {step >= 5 && step < 8 ? "Understanding Your Customer Interactions" : step === 7 ? "Your AI Chatbot Objectives" : step !== 8 ? "Introduce Yourself & Your Business" : ""}
                        </h1>
                        <p className="text-sm text-[#A3ABB8] dark:text-[#ABA8B4]">
                            {
                                step === 1 ? "We’re excited to get started! Please tell us a bit about yourself." :
                                    step === 2 ? "Carefully write your busienss domain because it will be used to connect your AI chatbot to your website." :
                                    step === 3 ? "This helps us tailor our services to your needs." :
                                        step === 4 || step === 5 || step === 6 ? "This helps us understand your business better." :
                                            step === 7 ? "This helps us understand your current setup." :
                                                step === 8 ? "This helps us understand your audience." :
                                                    step === 9 ? "This helps us understand your customer interactions." :
                                                        step === 10 ? "This helps us tailor our services to your goals." : ""

                            }
                        </p>
                    </div>

                    <div className="w-full space-y-4 flex flex-col items-center">{renderStepContent()}</div>

                    {step < 11 && (
                        <div className="w-full mt-6 flex justify-center items-center gap-5">
                            {step > 1 && (
                                <ButtonSmall
                                    isOutline={true}
                                    type="button"
                                    onClick={handleBack}
                                    value="← Back"
                                />
                            )}
                            <ButtonSmall
                                type="button"
                                onClick={handleNext}
                                disabled={!isStepValid()}
                                value={step === 10 ? "Complete" : "Next →"}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="w-full max-w-xl text-center mt-6 px-6 bottom-[80px] absolute">
                <div className='text-[14px] font-400 text-[#A3ABB8] w-full mb-5'>Your response will help us create the best onboarding experience for you! </div>
                <Progress value={(step / 11) * 100} />
            </div>
        </div>
    );
}
