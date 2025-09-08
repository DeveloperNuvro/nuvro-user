

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages, Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSelector } from 'react-redux';
import {  RootState } from '../../app/store';
import toast from 'react-hot-toast';


const supportedLanguages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "bn", name: "বাংলা" },
]

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);

  const changeLanguage = async (lng: string) => {

    i18n.changeLanguage(lng);
    if (user) {
      try {
        i18n.changeLanguage(lng);
      } catch (error) {

        toast.error(t('languageUpdatedFailed'));
        console.error("Failed to save language preference:", error);
      }
    } else {
      i18n.changeLanguage(lng);
    }
  }

  return (
    <DropdownMenu>
    <DropdownMenuTrigger asChild >
    <Button variant= "ghost" size = "icon" >
      <Languages className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only" > Toggle language </span>
          </Button>
          </DropdownMenuTrigger>
          < DropdownMenuContent align = "end" >
            {
              supportedLanguages?.map((lang) => (
                <DropdownMenuItem
            key= { lang.code }

  onClick = {() => changeLanguage(lang.code)
}
className = "cursor-pointer"
  >
  { lang.name }
{
  i18n.language === lang.code && (
    <Check className="ml-auto h-4 w-4" />
            )
}
</DropdownMenuItem>
        ))
}
</DropdownMenuContent>
  </DropdownMenu>
  )
}