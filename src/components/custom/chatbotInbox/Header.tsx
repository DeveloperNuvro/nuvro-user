import { PiRobot } from "react-icons/pi";
import { FaRegWindowMinimize } from "react-icons/fa";

const Header = ({agentName, setOpen} : {agentName: string, setOpen: any}) => {
  return (
    <div className="w-[350px] h-[60px] justify-between rounded-t-[16px] p-4 flex items-center shadow-[0px_2px_4px_0px_#8C52FF40] bg-[radial-gradient(83.13%_223.4%_at_96.63%_91.88%,_#8C52FF_0%,_#5D17E9_100%)]">
                
    {/* Bot logo and agent name */}
    <div className="flex items-center justify-between">
        <div className="w-[40px] h-[40px]   bg-white rounded-full mr-2 flex items-center justify-center ">
            <div className="text-[20px] text-[#8C52FF] "><PiRobot /></div>
        </div>
        <div className="text-white font-semibold tracking-normal text-center">
            {
                agentName
            }
        </div>
    </div>

    {/* Bot logo and agent name */}
    <div className="flex items-center justify-center">
      <button className="text-white pb-2  cursor-pointer " onClick={() => setOpen(false)} ><FaRegWindowMinimize /></button>
    </div>

</div>
  )
}

export default Header