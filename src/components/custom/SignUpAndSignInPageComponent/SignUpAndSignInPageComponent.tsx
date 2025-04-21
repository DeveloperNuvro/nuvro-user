

import darkModeImage from '@/assets/images/DashboardDark.png';
import LightModeImage from '@/assets/images/DashboardLight.png';
import {useEffect, useState } from 'react';
import Header from '../header/Header';

const SignUpAndSignInPageComponent = ({children, heading, paragraph} : {children: React.ReactNode, heading: string, paragraph: string}) => {
    const [imageSrc, setImageSrc] = useState<string>(LightModeImage);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
        const updateImage = () => {
          const isDark = document.documentElement.classList.contains('dark');
          setImageSrc(isDark ? darkModeImage : LightModeImage);
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

      
  return (
    <div>
        <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      {/* Header */}
      <Header isColor={false} />

      {/* Left Section */}
      <div className=" hidden lg:w-1/2 h-full lg:flex justify-center items-center bg-gradient-to-r from-[#5D17E9] to-[#8C52FF] dark:from-[#3B1F72] dark:to-[#7342D4]">
        <div className="w-full md:h-[100px] lg:h-full p-6 sm:p-10 md:p-14 lg:p-0 lg:ml-[170px] lg:mt-[160px] flex items-center justify-center">
          <img
            src={imageSrc}
            alt="dashboard image"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex items-center justify-center px-10  lg:px-20 2xl:px-40">
        <div className="w-full max-w-[761px] space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[36px] font-semibold">
                {heading}
              
            </h1>
            <p className="text-[14px] sm:text-[16px] text-gray-600 dark:text-gray-300 px-2 sm:px-10">
                {paragraph}
              
            </p>
          </div>

          <div className="w-full max-w-[761px] flex items-center justify-center">
           <div>
              {children}
           </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default SignUpAndSignInPageComponent