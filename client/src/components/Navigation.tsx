import React from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from "react-router-dom";

const Navigation = () => {
    let user = window.sessionStorage.getItem("userId")
    const navigation = useNavigate()
    const signout = async () => {
        await axios("http://localhost:4000/users/logout",{withCredentials:true}).then(({ data }) => {
            window.sessionStorage.removeItem("userId")
            toast.success(data.result)
            navigation("/users")
        }).catch(({ response }) => {
            toast.error(response.data.result)
        }

        )
    }
    console.log(user)
    return (
        <div >
            <nav className="sticky px-2 py-2 mb-2 bg-gray-600 border-gray-200 sm:px-4 dark:bg-gray-800">
                <div>
                    <div className="flex justify-between">
                        <Link to={"/"} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-in-out delay-300 rounded-md bg-slate-500 hover:bg-slate-300 hover:text-slate-800">Home</Link>
                        <div className="flex">
                            <Link to={"/eventDashboard"} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-in-out delay-300 rounded-md bg-slate-500 hover:bg-slate-300 hover:text-slate-800">Dashboard</Link>
                            <Link to={"/RegisteredEvents"} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-in-out delay-300 rounded-md bg-slate-500 hover:bg-slate-300 hover:text-slate-800">Registered Events</Link>
                        </div>
                        <div className="flex">
                            <Link to={"/events/create"} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-in-out delay-300 rounded-md bg-slate-500 hover:bg-slate-300 hover:text-slate-800">New Event</Link>
                        </div>
                        <div className="flex">
                            {(user) ?
                                <div>
                                    <Link to={`/users/${user}`} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-in-out delay-300 rounded-md bg-slate-500 hover:bg-slate-300 hover:text-slate-800">My Profile</Link>
                                    <button onClick={signout} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-out delay-300 bg-blue-700 rounded-md hover:bg-blue-300 hover:text-slate-800">Sign Out</button>
                                </div>
                                : <div><Link to={"/users"} className="px-6 py-2 mx-5 my-2 font-sans text-white transition ease-out delay-300 bg-blue-700 rounded-md hover:bg-blue-300 hover:text-slate-800">Login/Signup</Link></div>
                            }
                        </div>
                    </div>
                </div>
            </nav>
            <ToastContainer closeButton={true} closeOnClick={true} />
        </div>
    )
}

export default Navigation