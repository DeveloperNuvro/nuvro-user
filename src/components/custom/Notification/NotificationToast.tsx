
const NotificationToast = ({t, name, msg} : any) => {
    return (
        <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-[#8C52FF] shadow-lg p-2 rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5`}
        >
            <div className='font-bold'>{name}</div>
            <div className='text-sm'>{msg}</div>
        </div>
    )
}

export default NotificationToast


