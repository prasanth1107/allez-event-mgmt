import React, { ReactFragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Event from '../models/events.model'
import User from '../models/user.model';
import AdminConsole from './AdminConsole';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';

import axios from 'axios'

const UserProfile = () => {

    let id = useParams().userId!
    const [user, setUser] = useState<User>()

    useEffect(() => {
        async function fetchEventDetails() {
            console.log('fetch user details')
            console.log(id)

            // fetch user details
            await axios.get(`http://localhost:4000/users/${id}`, {
                method: "get", withCredentials: true
            }).then(({ data }) => {
                setUser(data.result)
            }).catch(({ response }) => {
                toast.error(response.data.result)
            }
            )
        }

        // hostArray = 
        console.log('inside use effect')
        fetchEventDetails()
        console.log(user)
    }, [])
    return (
        <div>
            <div>
                <div>
                    <h2>Name: {user?.name}</h2>
                    <h2>Email: {user?.email}</h2>
                    <h2>Gender: {user?.gender}</h2>
                    <h2>Phone: {user?.phone}</h2>
                </div>
                {(user?._id === window.sessionStorage.getItem('userId')) && <div>
                    <Link className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" to={`/users/${user?._id}`}> Edit</Link>
                </div>}
            </div>
            <AdminConsole id={user?._id!} />
            <ToastContainer />
        </div>
    )
}

export default UserProfile
