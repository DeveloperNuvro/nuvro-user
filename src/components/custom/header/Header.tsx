import { ModeToggle } from '@/components/mode-toggle'
import logo from '@/assets/images/Logo.png';
import logoColor from '@/assets/images/LogoColor.png';


const Header = ({isColor=false} : {isColor: boolean}) => {
    return (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-5 py-4">
            <img src={isColor ? logoColor : logo} alt="Nuvro logo" className="h-6 md:h-8" />
            <ModeToggle />
        </div>
    )
}

export default Header
