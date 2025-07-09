import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/app/store";
import { fetchAiAgentsByBusinessId } from "../features/aiAgent/aiAgentSlice";

export default function AiAgentPage() {

  const dispatch = useDispatch<AppDispatch>();
  const { aiAgents, status } = useSelector((state: RootState) => state.aiAgent);

  useEffect(() => {

    dispatch(fetchAiAgentsByBusinessId());

  }, [dispatch]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">AI Agent</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">

        {status === "loading" && (
          <AiAgentSkeleton />
        )}

        {status !== "loading" && aiAgents?.map((agent) => {
          const firstWord = agent.name.split(" ")[0]; // "Sales" from "Sales Agent"
          return (
            <div
              key={agent._id}
              className="rounded-xl bg-card border dark:border-[#2C3139]  cursor-pointer transition-all duration-200 overflow-hidden"
            >
              <Link to={`/main-menu/ai-agent/${agent._id}`}>
              <div className="h-[180px] flex items-center justify-center bg-[#ff21b0]/90 text-white text-4xl font-bold tracking-wide">
                {firstWord}
              </div>
              <div className="p-4">
                <h3 className="text-base font-medium text-foreground">
                  {agent.name}
                </h3>
              </div>
              </Link>
            </div>
          );
        })}

        {
          status !== "loading" && (
            <Link to="/main-menu/ai-agent/create">
              <div className="border border-dashed border-[#ff21b0] rounded-xl flex items-center justify-center min-h-[240px] hover:border-[#ff21b0] cursor-pointer transition-all duration-150">
                <Plus className="text-[#ff21b0]" size={32} />
              </div>
            </Link>
          )
        }

      </div>
    </div>
  );
}


//create loading skeleton for each card
const AiAgentSkeleton = () => {
  return (
    <div className="col-span-4 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 dark:border-white border-[#ff21b0]"></div>
    </div>
  );
}