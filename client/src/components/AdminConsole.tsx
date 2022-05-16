import React, { ReactFragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Event from '../models/events.model'
import User from '../models/user.model';
import axios from 'axios'

const AdminConsole = (props: { id: string }) => {

    // let id = "627f543ee81f04fe77ae41db"
    const [hostedEvents, setHostedEvents] = useState<Event[]>([])

    useEffect(() => {
        async function fetchEventDetails() {
            // fetch user details
            await axios.get(`http://localhost:4000/events/event/`, {
                withCredentials: true,
                params: {
                    hostId: props.id
                }
            }).then(({ data }) => {
                setHostedEvents(data.result)
            })
        }


        console.log('inside use effect')
        fetchEventDetails()
        console.log("Hosteddd")
        console.log(hostedEvents)
    }, [props.id])
    return (
        <div>
            <div><h1> Hosted Events of User</h1></div>
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">
                                EventName
                            </th>

                            <th scope="col" className="px-6 py-3">
                                Price
                            </th>
                            <th scope="col" className="px-6 py-3">
                                Booked Seats
                            </th>
                            <th scope="col" className="px-6 py-3">
                                <span className="sr-only">Open</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {hostedEvents && hostedEvents.map((event) => {
                            return (
                                <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        {event.name}
                                    </th>
                                    <td className="px-6 py-4">
                                        {event.price}
                                    </td>
                                    <td className="px-6 py-4">
                                        {event.attendeesArr?.length}
                                    </td>
                                    {new Date(event.eventTimeStamp).getTime() > new Date().getTime() && <td className="px-6 py-4 text-right">
                                        <a href={`/events/${event._id}`} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Open</a>
                                    </td>}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {/* <div>
                {hostedEvents.map(function(event, idx){
                return (<li key={idx}>
                    
                        <div>
                            {event.name}<br></br>
                        </div>
                        <div>
                            Booked Seats: {event.bookedSeats}<br></br>
                        </div>
                            Description: {event.description}<br></br>
                            Price: {event.price} <br></br>
                            Venue: {event.venue.address} {event.venue.city} {event.venue.state} {event.venue.zip}
                            <br></br>
                            
                            </li>
                        )
                    })}
      </div> */}
        </div>
    )
}

export default AdminConsole
