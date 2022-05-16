import React, { ReactFragment, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import EventModel from '../models/events.model'
import { ToastContainer, toast } from 'react-toastify';
import ImageGallery from 'react-image-gallery';
import axios from 'axios'
import noImage from '../images/noImage.jpg'

type carouselItem = {
    position: number,
    el: HTMLDivElement
}

type galleryType = {
    original: string
    thumbnail: string,
}

type singleAttendee = {
    "name": string,
    "email": string,
    "id": string
}

const EventDetails = () => {
    const [event, setEvent] = useState<EventModel>()
    const [image, setImage] = useState<string>()
    const [attendees, setAttendees] = useState<[{ "name": string, "email": string, "id": string }]>()
    const [cohosts, setCohosts] = useState<[{ "name": string, "email": string, "id": string }]>()
    const [render, setRender] = useState(true);
    let id = useParams().eventId
    let userId = window.sessionStorage.getItem("userId")

    useEffect(() => {
        async function fetchEventDetails() {
            await axios.get(`http://localhost:4000/events/event/`, {
                withCredentials: true,
                params: {
                    eventId: id

                }
            }).then(({ data }) => {

                setEvent(data.result)
                setAttendees(data.resultAttendees)
                setCohosts(data.resultCohosts)
            }
            )
        }
        fetchEventDetails()
    }, [id, render])

    // function renderImage(img: string) {
    //     return (
    //     )
    // }
    // let images = event?.eventImgs.map((img: string) => {
    //     return renderImage(img)
    // })

    const images: galleryType[] = []

    event?.eventImgs.map((img) => {
        let obj = {
            original: img as string,
            thumbnail: img as string,
        }
        images.push(obj)
    })
    // let imageCount = 0

    const registerUser = async () => {

        await axios(`http://localhost:4000/events/event/register/${event?._id}`, { method: "post", withCredentials: true }).then(({ data }) => {
            // await axios(`http://localhost:4000/events/event/register/paymentsession/${event?._id}/${userId}`, { method: "post", withCredentials: true }).then(({ data }) => {                
            let newEvent = event
            if (userId) newEvent?.attendeesArr?.push(userId)
            setEvent(newEvent)
            toast.success(data.result)
        }).catch(({ response }) => {
            toast.error(response.data.result)
        })
        setRender(!render);
    }

    const unRegisterUser = async () => {
        await axios(`http://localhost:4000/events/event/unregister/${event?._id}`, { method: "post", withCredentials: true }).then(({ data }) => {
            if (data.success === true) {
                let newEvent = event
                let myArray = newEvent?.attendeesArr

                if (userId) {
                    const index = myArray!.indexOf(userId!, 0);
                    if (index > -1) {
                        myArray!.splice(index, 1);
                    }
                    newEvent!.attendeesArr = myArray
                    setEvent(newEvent)
                    setRender(render);
                    toast.success(data.result)
                }
            }
        }).catch(({ response }) => {
            toast.error(response.data.result)
        })
        setRender(!render)
    }

    const addASACohost = async (attendeeId: string) => {
        console.log(attendeeId);
        await axios(`http://localhost:4000/events/event/${event?._id}/addcohost/${attendeeId}`, { method: "post", withCredentials: true }).then(({ data }) => {
            if (data.success === true) {
                let newEvent = event;
                if (userId) newEvent?.cohostArr?.push(userId)
                setEvent(newEvent)
                toast.success(data.result)
            }
        }).catch(({ response }) => {
            toast.error(response.data.result)
        })
        setRender(!render);
    }

    const removeASACohost = async (cohostId: string) => {
        await axios(`http://localhost:4000/events/event/${event?._id}/removecohost/${cohostId}`, { method: "post", withCredentials: true }).then(({ data }) => {
            if (data.success === true) {
                let newEvent = event;
                if (userId && newEvent?.cohostArr) {
                    for (let i = 0; i < newEvent?.cohostArr?.length; i++) {
                        if (newEvent.cohostArr[i] == userId) {
                            newEvent.cohostArr.splice(i, 1);
                            break;
                        }
                    }
                    newEvent?.cohostArr?.push(userId)
                }
                setEvent(newEvent)
                toast.success(data.result)
            }
        }).catch(({ response }) => {
            toast.error(response.data.result)
        })
        setRender(!render);
    }

    if (images.length === 0) {
        let obj = {
            original: noImage,
            thumbnail: noImage
        }
        images.push(obj)
    }

    const displayAttendees = (singleAttendee: singleAttendee) => {
        return (
            <div>
                <p>{singleAttendee.name}</p>
                <p>{singleAttendee.email}</p>
                {event?.hostId === window.sessionStorage.getItem("userId") && <button className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" onClick={() => addASACohost(singleAttendee.id)}>Make Cohost</button>}
            </div>
        )
    }

    const displayCohosts = (singleCohost: singleAttendee) => {
        return (
            <div>
                <p>{singleCohost.name}</p>
                <p>{singleCohost.email}</p>
                {event?.hostId === window.sessionStorage.getItem("userId") && <button className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" onClick={() => removeASACohost(singleCohost.id)}>Remove as Cohost</button>}
            </div>
        )
    }

    return (
        <div >
            <div className="container flex flex-col mx-auto my-10 overflow-hidden shadow-sm md:my-24 md:flex-row">
                <div>
                    <ImageGallery items={images} />
                </div>
                <div>
                    <div>
                        <h2>Event Name : {event?.name}</h2>
                        <p>{event?.description}</p>
                        <p>Capacity : {event?.attendeesArr!.length}/{event?.totalSeats}</p>
                        <p>MinAge: {event?.minAge}</p>
                    </div>
                    {userId &&
                        <div>
                            <Link className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" to={`/events/edit/${event?._id}`}> Edit</Link>
                            {(event?.hostId != window.sessionStorage.getItem('userId')) && (event && (event!.attendeesArr!.includes(userId!)) ? <button className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" onClick={unRegisterUser}> Unregister</button>
                                : <button className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" onClick={registerUser}>register</button>)}
                            <Link className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700" to={`/users/${event?.hostId}`}> View host details</Link>
                        </div>}
                </div>
                <br />
                <div>
                    Attendees:
                    {attendees && attendees.map((singleAttendee) => {
                        return displayAttendees(singleAttendee);
                    })}
                </div>
                <br />
                <div>
                    Cohosts:
                    {cohosts && cohosts.map((singleCohost) => {
                        return displayCohosts(singleCohost);
                    })}
                </div>
            </div>
            <ToastContainer closeButton={true} closeOnClick={true} />
        </div>
    )
}

export default EventDetails