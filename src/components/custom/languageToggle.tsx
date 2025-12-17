

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../app/store';
import { updateUserLanguage } from '../../features/auth/authSlice';
import toast from 'react-hot-toast';


const supportedLanguages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "bn", name: "বাংলা" },
]

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const changeLanguage = async (lng: string) => {
    try {
      // 🔧 FIX: Validate language code before proceeding
      const supportedLanguageCodes = ['en', 'es', 'bn'];
      if (!supportedLanguageCodes.includes(lng)) {
        toast.error(`Unsupported language: ${lng}. Supported: ${supportedLanguageCodes.join(', ')}`);
        return;
      }

      // Change language immediately for UI update
      await i18n.changeLanguage(lng);
      
      // Save to backend if user is logged in
      if (user) {
        try {
          // 🔧 FIX: Use the same API call as settings page
          await dispatch(updateUserLanguage({ language: lng })).unwrap();
          toast.success(t('languageUpdatedSuccess', { language: supportedLanguages.find(l => l.code === lng)?.name || lng }));
        } catch (error: any) {
          console.error("Failed to save language preference:", error);
          const errorMessage = error?.payload || 
                              error?.message || 
                              error?.response?.data?.message || 
                              t('languageUpdatedFailed', 'Failed to save language preference');
          toast.error(errorMessage);
          
          // Revert language change if backend save failed
          const previousLang = user?.language || 'es';
          await i18n.changeLanguage(previousLang);
        }
      } else {
        // User not logged in, just show success for local change
        toast.success(t('languageUpdatedSuccess', { language: supportedLanguages.find(l => l.code === lng)?.name || lng }));
      }
    } catch (error) {
      console.error("Failed to change language:", error);
      toast.error(t('languageUpdatedFailed', 'Failed to change language'));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-800 relative">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span>{lang.name}</span>
            {i18n.language === lang.code && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}