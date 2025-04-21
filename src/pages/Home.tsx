import { ButtonExtraSmall } from '@/components/custom/button/Button'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className='flex justify-center items-center h-screen'>
        <div>
            <Link to="/signin">
             <ButtonExtraSmall value={"Sign In"} />
            </Link>
            <Link to="/signup" className='ml-2'>
              <ButtonExtraSmall value={"Sign Up"} />
            </Link>
            <Link to="/onboarding" className='ml-2'>
              <ButtonExtraSmall value={"Onboarding"} />
            </Link>
            <Link to="/main-menu" className='ml-2'>
              <ButtonExtraSmall value={"Main Menu"} />
            </Link>

        </div>
    </div>
  )
}

export default Home