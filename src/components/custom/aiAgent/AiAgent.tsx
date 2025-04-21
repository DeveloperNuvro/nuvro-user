
import { Button } from "@/components/custom/button/Button";
import { useNavigate } from "react-router-dom";
import chatbot from "@/assets/images/chatbot.png";
import LightModeImage from "@/assets/images/chatbotLight.png";
import { useEffect, useState } from "react";

export default function AIAgent() {
  const navigate = useNavigate();


  const [imageSrc, setImageSrc] = useState<string>(LightModeImage);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
        const updateImage = () => {
          const isDark = document.documentElement.classList.contains('dark');
          setImageSrc(isDark ? chatbot : LightModeImage);
        };
    
        updateImage();
        mediaQuery.addEventListener('change', updateImage);
        const observer = new MutationObserver(updateImage);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
    
        return () => {
          mediaQuery.removeEventListener('change', updateImage);
          observer.disconnect();
        };
      }, []);



  const points = [
    "Instantly respond to queries without human intervention.",
    "Create multiple AI agents for different business needs.",
    "Connect your AI agent to websites, WhatsApp, and more.",
    "Never miss a lead, inquiry, or support request—day or night.",
    "Get started quickly with ready-made templates or customize for your needs."
  ];

  return (
    <div className="w-full h-full px-6 md:px-16 pt-10 pb-20 flex flex-col lg:flex-row items-center justify-between ">
      {/* Left Content */}
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#101214] dark:text-white">
            Scale Your Business with <br />
            <span className="text-[#8C52FF]">AI-Powered Agents!</span>
          </h1>
          <p className="text-[#A3ABB8] text-[15px] mt-3">
            Our AI-powered agents help you automate interactions, scale effortlessly,
            and <span className="font-semibold text-[#101214] dark:text-white">provide 24/7 support</span> without missing a beat.
          </p>
        </div>

        {/* Bullet Points */}
        <ul className="space-y-3 text-sm">
          {points?.map((point, idx) => (
            <li key={idx} className="flex items-start text-[#101214] dark:text-[#A3ABB8]">
              <span className="text-[#8C52FF] mt-1 mr-2">✔</span>
              {point}
            </li>
          ))}
        </ul>

        <Button
          value="Set up AI Agent"
          onClick={() => navigate("/main-menu/ai-agent/setup")}
        //   iconRight={<span className="ml-2 text-lg">+</span>}
        />
      </div>

      {/* Chat UI Preview */}
      <div className="mt-10 lg:mt-0 lg:ml-10 ">
        <img className="max-w-full" src={imageSrc} alt="ChatBot Image" />
      </div>
    </div>
  );
}
