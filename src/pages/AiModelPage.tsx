import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { fetchAiModelsByBusinessId } from "../features/aiModel/trainModelSlice";

export default function AiModelPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { aiModels, status } = useSelector((state: RootState) => state.trainModel);


  useEffect(() => {
    dispatch(fetchAiModelsByBusinessId());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">AI Model</h2>

      {status === 'loading' ? (
        <AiModelSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {aiModels?.map((model) => {
            const firstWord = model.name.split(" ")[0];
            return (
              <div
                key={model._id}
                className="rounded-xl bg-card border dark:border-[#2C3139]  cursor-pointer transition-all duration-200 overflow-hidden"
              >
                <div className="h-[180px] flex items-center justify-center bg-[#8C52FF]/90 text-white text-4xl font-bold tracking-wide">
                  {firstWord}
                </div>
                <div className="p-4">
                  <h3 className="text-base font-medium text-foreground">
                    {model.name}
                  </h3>
                </div>
              </div>
            );
          })}

          <Link to="/main-menu/ai-model/train-model">
            <div className="border border-dashed border-[#4D2D8C] rounded-xl flex items-center justify-center min-h-[240px] hover:border-[#8C52FF] cursor-pointer transition-all duration-150">
              <Plus className="text-[#8C52FF]" size={32} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

const AiModelSkeleton = () => {
  return (
    <div className="col-span-4 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 dark:border-white border-[#8C52FF]"></div>
    </div>
  );
}