import { Wrench } from "lucide-react";

export default function ComingSoon() {
  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center justify-center text-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#F4F0FF] text-[#8C52FF]">
          <Wrench className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-semibold text-[#101214] dark:text-white">
          We’re Working On It!
        </h2>
        <p className="text-[#6B7280] dark:text-[#A3ABB8] text-sm max-w-md">
          This section is still under development. Our team is working hard to bring it to life. Check back soon!
        </p>
      </div>
    </div>
  );
}
