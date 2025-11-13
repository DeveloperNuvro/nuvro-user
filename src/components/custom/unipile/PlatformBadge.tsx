import { Badge } from "@/components/ui/badge";
import { Phone, Instagram, Mail, MessageSquare, Globe, Linkedin, Twitter, Facebook } from "lucide-react";

const platformIcons: Record<string, any> = {
  whatsapp: Phone,
  instagram: Instagram,
  telegram: MessageSquare,
  email: Mail,
  website: Globe,
  linkedin: Linkedin,
  google: Globe,
  microsoft: Globe,
  imap: Mail,
  twitter: Twitter,
  facebook: Facebook,
};

const platformColors: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  instagram: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  telegram: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  email: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  website: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  linkedin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  google: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  microsoft: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  imap: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  twitter: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  facebook: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

export const PlatformBadge = ({ platform, className = "" }: PlatformBadgeProps) => {
  const IconComponent = platformIcons[platform] || Globe;
  const colorClass = platformColors[platform] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  
  return (
    <Badge className={`${colorClass} ${className}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </Badge>
  );
};

export default PlatformBadge;
