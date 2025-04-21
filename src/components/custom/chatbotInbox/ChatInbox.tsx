import ChatMessages from "./ChatMessages";
import DefaultResponseTemplete from "./DefaultResponseTemplate";
import Header from "./Header";
import InputBox from "./InputBox";


const ChatInbox = ({agentName, setOpen} : {agentName: string, setOpen: any}) => {
    return (
        <div className="w-[350px] dark:bg-[#1B1B20] bg-white shadow-sm relative rounded-[16px]  flex flex-col z-10 ">
           <Header agentName={agentName} setOpen={setOpen}/>
           <ChatMessages/>
           <DefaultResponseTemplete/>
           <InputBox/>
        </div>

    )
}

export default ChatInbox;