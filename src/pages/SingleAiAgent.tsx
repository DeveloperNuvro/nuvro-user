import { useEffect, useState } from "react";
import { Copy} from "lucide-react";
import toast from "react-hot-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../app/store";
import { fetchAIAgentById } from "@/features/aiAgent/aiAgentSlice";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";

export default function SingleAiAgent() {
    const [copied, setCopied] = useState(false);
    const { id }: any = useParams();
    console.log(id)
    const dispatch = useDispatch<AppDispatch>();
    const { selectedAgent, status, apiKey } = useSelector((state: RootState) => state.aiAgent);

    useEffect(() => {
        try {
            dispatch(fetchAIAgentById(id));
        } catch (error) {
            console.log(error)
        }
    }, [dispatch, id]);


    const script = `<script src="https://nuvro-dtao9.ondigitalocean.app/public/widget.js?apiKey=${apiKey}&agentName=${encodeURIComponent(selectedAgent?.name || '')}" async></script>`;


    const handleCopy = () => {
        navigator.clipboard.writeText(script);
        toast.success("Script copied to clipboard!");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };



    return (
        <div className="p-6 md:p-10">

            
            {
                status !== "loading" && (
                    <div className="flex items-center justify-start gap-2">
                        <div className="text-2xl font-semibold text-[#000000] dark:text-[#FFFFFF] mb-6">{selectedAgent?.name}</div>
                        <div>{selectedAgent?.active === true ? <div className="px-2 py-1 rounded-full text-sm bg-[#8C52FF] text-white">Active</div> : <div className="px-2 py-1 rounded-md bg-red-400 text-sm text-white" >Inactive</div>}</div>
                    </div>
                )
            }

            {/* Tabs */}
            <Tabs defaultValue="integration">
                <TabsList className="mb-8 rounded-[12px] p-[4px] w-fit  bg-[#FAFAFA] dark:bg-[#383841]">
                    {/* <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger> */}
                    <TabsTrigger value="integration" className="dark:text-[#FFFFFF] border-none">Integration</TabsTrigger>
                    {/* <TabsTrigger value="settings">Settings</TabsTrigger> */}
                </TabsList>
            </Tabs>



            <div className="flex lg:flex-row lg:justify-start flex-col gap-6">

                {/* Sidebar */}
                <div className="space-y-2 w-[242px]">
                    <Card className="px-4 py-2 w-full border-l-4 rounded-[8px] border-[#8C52FF] bg-[#F4F1FD] dark:bg-[#383841] dark:text-[#FFFFFF]  text-[#8C52FF] font-medium cursor-pointer ">
                        &lt; Embed
                    </Card>
                    {/* <Card className="p-4 text-muted-foreground cursor-pointer">🪄 Connect</Card> */}
                </div>

                {/* Embed Script */}
                <div className="col-span-2 flex lg:flex-row  flex-col gap-5">


                    <Card className="w-full max-w-full p-5 border border-[#D4D8DE] dark:border-[#2C3139] overflow-hidden">
                        <h2 className="text-lg font-semibold dark:text-white text-[#101214]">Embed</h2>

                        <pre className="bg-[#F1F2F4] dark:bg-[#101214] rounded-md p-4 break-words whitespace-pre-wrap text-sm text-[#101214] dark:text-[#ABA8B4] w-full">
                            {script}
                        </pre>

                        <Button
                            onClick={handleCopy}
                            variant="outline"
                            className="mt-4 text-[#8C52FF] dark:text-[#A3ABB8] border-[#8C52FF] cursor-pointer"
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            {copied ? "Copied!" : "Copy script"}
                        </Button>
                    </Card>




                    {/* Instructions */}
                    <Card className=" px-6 lg:w-1/3 border dark:border-[#2C3139]  border-[#D4D8DE p-5">
                        <h3 className="text-md font-semibold mb-2">Instruction</h3>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                            <li>Click the "Copy Script" button to copy the provided script.</li>
                            <li>
                                Open your website’s HTML file and paste the script inside the
                                &lt;head&gt; tag or before closing the &lt;/body&gt; tag.
                            </li>
                            <li>
                                Save the file & refresh your website to check if the chatbot appears.
                            </li>
                        </ol>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">or watch the tutorial</p>
                            <div className="mt-3 w-full h-[140px] bg-[#F1F2F4] dark:bg-[#101214] rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                ▶️ Video Placeholder
                            </div>
                        </div>
                    </Card>

                </div>

            </div>




        </div>
    );
}
