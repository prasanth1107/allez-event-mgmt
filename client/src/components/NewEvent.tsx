
import * as React from "react";
import { useForm, SubmitHandler, SubmitErrorHandler, Controller } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message"
import Select, { MultiValue } from "react-select";
import DatePicker from "react-datepicker";
import { addDays, parseJSON, format } from "date-fns";
import {useJsApiLoader} from "@react-google-maps/api";
import { Combobox } from "react-widgets/cjs";
import usePlacesAutocomplete, { getGeocode, getLatLng, getZipCode } from "use-places-autocomplete";

import "react-datepicker/dist/react-datepicker.css";
import "react-widgets/styles.css";
import Map from "./Map";
import ImageModal from "./ImageModal";
import Event from "../models/events.model";
import axios, { AxiosResponse } from "axios";
import { useParams } from "react-router-dom";

type newEventData = {
    name: string;
    price: number;
    description: string;
    totalSeats: number;
    minAge: number;
    category: string[];
    eventTimeStamp: string;
    venue: string;
    
}

type venue = {
    address: string,
    city: string,
    state: string,
    zip: string,
    geoLocation: {
        lat: number,
        long: number
    }
}


type LatLng = google.maps.LatLngLiteral;
type GeocodeResult = google.maps.GeocoderResult[];


export enum EventType {
    "NEW" = 0,
    "EDIT" = 1
}

type EventProps = {
    type: EventType
}


const NewEvent: React.FC<EventProps> = ({type}) => {
    console.log("Check");
    console.log(type)
    let { eventId } = useParams();
    const [eventData, setEventData] = React.useState<newEventData|undefined>(undefined);
    let catg: {label: string, value: string}[]= [];
    if(eventData?.category) {
        eventData.category.forEach(e => {
            let eCat = {
                label: e,
                value: e
            }
            catg.push(eCat);
        })
    }
    
    React.useEffect(() => {
        async function getEventDetails(eventId: string) {
            if(type === 1 && eventId) {
                let retrievedEvent: AxiosResponse = await axios.get(`http://localhost:4000/events/event?eventId=${eventId}`, {withCredentials: true})
                console.log(retrievedEvent);
                if(retrievedEvent) {
                    let {data} = retrievedEvent;
                        setEventData(data.result);
                        let {address, city, state} = data.result.venue;
                        setVenue(`${address}, ${city}, ${state}`);
                    }
                // }
                
                }
                
            }
            if(eventId !== undefined) {
                getEventDetails(eventId!);
                
            }
        }, [eventId, type])
        
        React.useEffect(() => {
            reset(eventData)
        },[eventData])
        
        const onErrors: SubmitErrorHandler<newEventData> = data => console.log(data);
        const [venue, setVenue] = React.useState<string>("");
        const [selectedDate, setSelectedDate] = React.useState<Date>();
        const [showImageModal, setShowImageModal] = React.useState<boolean>(false);
        const [eventImages, setEventImages] = React.useState<File[]>([]);
        const {register, handleSubmit, reset, formState: {errors}, control} = useForm<newEventData>({
            defaultValues: {
                "name": eventData?.name,
                "description": eventData?.description,
                "minAge": eventData?.minAge,
                "totalSeats": eventData?.totalSeats,
                "price": eventData?.price
                // "eventTimeStamp": format(new Date(eventData?.eventTimeStamp!), "MMM DD YYYY")
            }
        });
        
    const onSubmit: SubmitHandler<newEventData> = async data => {
        let { zipCode, venueCoord } = await getGCAndZip(venue);
        let eventVenue: string[] = venue.split(",");

        let venueType:venue = {
            address: eventVenue[0],
            city: eventVenue[1],
            state: eventVenue[2],
            zip: zipCode,
            geoLocation: {
                lat: venueCoord?.lat!,
                long: venueCoord?.lng!
            }
        }

        let formData = new FormData()
        formData.append("name", data.name)
        formData.append("category", JSON.stringify(data.category))
        formData.append("price", JSON.stringify(data.price))
        formData.append("description", data.description)
        formData.append("totalSeats", JSON.stringify(data.totalSeats))
        formData.append("bookedSeats", '0')
        formData.append("minAge", JSON.stringify(data.minAge) || '0')
        formData.append("venue", JSON.stringify(venueType))
        formData.append("eventTimeStamp", data.eventTimeStamp)

        eventImages.map(file => {
            formData.append('images', file, file.name)
        })

        // let newEvent: Event = {
        //     name: data.name,
        //     category: data.category,
        //     price: data.price,
        //     description: data.description,
        //     totalSeats: data.totalSeats,
        //     bookedSeats: 0,
        //     minAge: data.minAge || 0,
        //     venue: {
        //         address: eventVenue[0],
        //         city: eventVenue[1],
        //         state: eventVenue[2],
        //         zip: zipCode,
        //         geoLocation: {
        //             lat: venueCoord?.lat!,
        //             long: venueCoord?.lng!
        //         }
        //     },
        //     eventTimeStamp: data.eventTimeStamp,
        //     eventImgs: eventImages
        // }
        let createdEvent = await axios("http://localhost:4000/events/create", { method: "post", data: formData, withCredentials: true });
        console.log(createdEvent);
    };
    const { isLoaded } = useJsApiLoader({
        id: "google-script",
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API!,
        libraries: ["places"]
        
    })

    const {suggestions: {data, status}, setValue: setVenueVal , clearSuggestions, init} = usePlacesAutocomplete({
        initOnMount: false,
        requestOptions: {
            componentRestrictions: {
                country: "us"
            }
        },
        debounce: 300
    });
    
    if(isLoaded) {
        init();
    }

    

    const renderSuggestions = (): string[] => {
        let dataList: string[] = [];
        if(status === "OK") {
            data.forEach((suggestion) => {
                const {description} = suggestion;
                dataList.push(description);
            });
        }
        return dataList;

    }

    const handleSelect = (val: string) => {
            setVenueVal(val, false);
            setVenue(val);
            clearSuggestions();
    }

    const getGCAndZip = async (venue: string) => {
        let geoCode: GeocodeResult = await getGeocode({
            address: venue,
            region: "us",
            componentRestrictions: {
                country: "us"
            }
        });

        let newZip: string = "";
        let newCoord: LatLng = getLatLng(geoCode[0]);
        if(getZipCode(geoCode[0], false) !== null) {
            newZip = getZipCode(geoCode[0], false) as string;
        }

        return {zipCode: newZip, venueCoord: newCoord}
    }

    const previewImgsFunc = (images: File[]) => {
        setEventImages(images);
    }
    
    const showModal = () => {
        setShowImageModal(true);
    }

    const hideModal = () => {
        setShowImageModal(false);
    }

    return(
        <div>
            <div className="mx-4 my-2">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="w-full">
                        <form onSubmit={handleSubmit(onSubmit, onErrors)} autoComplete="off" className="px-8 pt-6 pb-8 bg-white rounded shadow-md">
                        <div className="mb-6">
                                <div className="md:flex md:items-center">
                                    <div className="md:w-1/3">
                                        <label className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left" htmlFor="name">Event Name: </label>
                                    </div>
                                    <div className="md:w-2/3">
                                        <input className={`shadow appearance-none border-2 border-gray-200 w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline  ${errors.name ? 'border-red-600': ''}`} id="name" type="text" {...register("name", {required: {value: true, message: "Please enter a name for the event."}, validate: {
                                            trim: eName => eName.trim().length > 0 || "Please enter a valid username"
                                        }})}></input>
                                    </div>
                                </div>
                                <ErrorMessage errors={errors} name="name"
                                render={({message}) => (
                                    <small className="mb-6 text-red-400">{message}</small>
                                    )}
                                />
                            </div>
                            {   isLoaded && (
                                <div className="mb-6">
                                    <div className="md:flex md:items-center">
                                        <div className="md:w-1/3">
                                            <label className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left" htmlFor="venue">Venue: </label>
                                        </div>
                                        <div className="md:w-2/3">
                                            <Controller 
                                                name="venue"
                                                control={control}
                                                render={({field: {onChange, ref}}) => (
                                                    <Combobox
                                                        ref={ref}
                                                        className={`w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline  ${errors.venue ? 'border-red-600': ''}`}
                                                        data={renderSuggestions()}
                                                        dataKey="id"
                                                        textField="loc"
                                                        onSelect={(val) => {
                                                            handleSelect(val);
                                                            onChange(val);
                                                        }}
                                                        onChange={(val) => {
                                                            setVenueVal(val);
                                                            if(val === "" ) {
                                                                onChange(val);
                                                                setVenue("");
                                                            }
                                                        }}
                                                        hideEmptyPopup
                                                        hideCaret />
                                                )}
                                                rules={{
                                                    required: "Please enter a valid address.",
                                                    validate: eVenue => {
                                                        return eVenue && eVenue.trim().length > 0
                                                    }  
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <ErrorMessage errors={errors} name="venue"
                                    render={({message}) => (
                                        <small className="mb-6 text-red-400">{message}</small>
                                        )}
                                    />
                                </div>
                                )
                            }
                            <div className={"mb-6"}>
                                <div className="md:flex md:items-center">
                                    <div className="md:w-2/3">
                                        <label className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left" htmlFor="price">Registration Fee: </label>
                                    </div>
                                    <div className="md:w-1/3">
                                        <input className={`shadow border-2 border-gray-200 w-full focus:m-0 rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline content-start ${errors.price ? 'border-red-600': ''}`} 
                                            id="price" type="number" min={0} {...register("price", {required: "Please enter a valid registration fee for the event, or enter 0 if free.", valueAsNumber: true })}/>
                                    </div>
                                </div>
                                <ErrorMessage errors={errors} name="price"
                                render={({message}) => (
                                    <small className="mb-6 text-red-400">{message}</small>
                                    )}
                                />
                            </div>

                            <div className="mb-6 md:flex md:items-center">
                                <div className="md:w-1/3">
                                    <label className="block pr-4 mb-5 text-sm font-bold text-gray-700 md:text-left" htmlFor="description">Description: </label>
                                </div>
                                <div className="md:w-2/3">
                                    <textarea rows={6} className={`shadow appearance-none border-2 border-gray-200 w-full rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline  ${errors.description ? 'border-red-600': ''}`} id="description" {...register("description", {required: "Please enter a description for the event.", validate: {
                                        trim: eventDesc => eventDesc.trim().length > 0 || "Please enter a valid description"
                                    }})}/>
                                    <br/>
                                    <small className="text-red-400">
                                        {errors.description && errors.description.message}
                                    </small>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="md:flex md:items-center">
                                    <div className="md:w-1/3">
                                        <label className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left" htmlFor="category">Category: </label>
                                    </div>
                                    <div className="md:w-2/3">
                                        <Controller
                                            control={control}
                                            name="category"
                                            render={({field: {onChange}}) => (
                                                <Select
                                                    id="category"
                                                    defaultValue={catg}
                                                    options={[
                                                        {value: "Career", label: "Career"},
                                                        {value: "Music", label: "Music"},
                                                        {value: "Food and Drink", label: "Food and Drink"},
                                                        {value: "Charity", label: "Charity"},
                                                        {value: "Exploration", label: "Exploration"},
                                                        {value: "Entertainment", label: "Entertainment"},
                                                        {value: "Night Life", label: "Night Life"},
                                                        {value: "Other", label: "Other"}
                                                    ]}
                                                    onChange={(newVal: MultiValue<{value: string, label: string}>) => {
                                                        onChange((newVal.map(e => e.value)))
                                                    }}
                                                    isMulti
                                                    />
                                            )}
                                            rules={{
                                                required: "Please select a category."
                                            }}/>
                                    </div>
                                </div>
                                <ErrorMessage errors={errors} name="category"
                                render={({message}) => (
                                    <small className="mb-6 text-red-400">{message}</small>
                                    )}
                                />
                            </div>
                            <br/>
                            
                            <div className={"mb-6"}>
                                <div className="md:flex md:items-center">
                                    <div className="md:w-2/3">
                                        <label className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left" htmlFor="totalSeats">Total Seats: </label>
                                    </div>
                                    <div className="md:w-1/3">
                                        <input className={`shadow border-2 border-gray-200 w-full focus:m-0 rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline content-start ${errors.totalSeats ? 'border-red-600': ''}`} 
                                            id="totalSeats" type="number" min={0} {...register("totalSeats", {required: "Please enter a valid number for the total seats", valueAsNumber: true })}/>
                                    </div>
                                </div>
                                <ErrorMessage errors={errors} name="totalSeats"
                                render={({message}) => (
                                    <small className="mb-6 text-red-400">{message}</small>
                                    )}
                                />
                            </div>

                            <br/>
                            <div className={"mb-6"}>
                                <div className="md:flex md:items-center">
                                    <div className="md:w-2/3">
                                        <label className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left" htmlFor="minAge">Minimum Age: </label>
                                    </div>
                                    <div className="md:w-1/3">
                                        <input className={`shadow border-2 border-gray-200 w-full focus:m-0 rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline content-start ${errors.minAge ? 'border-red-600': ''}`} 
                                            id="minAge" type="number" min={0} {...register("minAge", {valueAsNumber: true })}/>
                                    </div>
                                </div>
                                <ErrorMessage errors={errors} name="minAge"
                                render={({message}) => (
                                    <small className="mb-6 text-red-400">{message}</small>
                                    )}
                                />
                            </div>
                            <br/>
                            <div className="grid grid-cols-2 mb-6">
                                <div>
                                    <div>

                                        <label htmlFor="eventTimeStamp" className="block pr-4 mb-0 text-sm font-bold text-gray-700 md:text-left">Event Date: 
                                        <Controller
                                            control={control}
                                            name="eventTimeStamp"
                                            render={({ field: {onChange, value, ref} }) => (
                                            <DatePicker
                                                ref={ref}
                                                placeholderText="Select date"
                                                onChange={(selected: Date) => {
                                                    onChange(selected)
                                                    setSelectedDate(selected);
                                                    return selected;
                                                }}
                                                selected={selectedDate}
                                                dateFormat="MM/dd/yyyy"
                                                minDate={addDays(new Date(), 1)}
                                                fixedHeight
                                                className={`mt-2 shadow border-2 border-gray-200 w-72 focus:m-0 rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline content-start ${errors.eventTimeStamp && "border-red-600"}`}
                                                
                                            />
                                            )}

                                            //format(parseISO(value), 'MMM dd YYYY')
                                            rules = {{
                                                required: "Please enter a valid date."
                                            }
                                            }
                                        />
                                        </label>
                                    </div>
                                    <ErrorMessage errors={errors} name="eventTimeStamp"
                                        render={({message}) => (
                                            <small className="mb-6 text-red-400">{message}</small>
                                            )}
                                />
                                </div>
                            </div>
                            <br/>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <button className="px-4 py-2 font-bold text-white bg-indigo-500 rounded hover:bg-indigo-700 focus:outline-none focus:shadow-outline" type="button" onClick={showModal}>
                                        Upload Images
                                    </button>
                                
                                </div>
                                <div>
                                    <button className="px-8 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline" type="submit">
                                        Add Event
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div>
                        {isLoaded ? <Map venue = {venue}/> : <div className="w-full h-screen animate-spin"></div>}
                    </div>
                </div>
            </div>
            <div id="imageModal" tabIndex={-1} className={`overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 w-full md:inset-0 h-modal md:h-full ${!showImageModal && "hidden" }`}>
                <div className="w-full h-full max-w-4xl p-4 m-auto">
                    <ImageModal previewImgs={previewImgsFunc} hideModal={hideModal}/>
                </div>

            </div>
        </div>
    )
}

export default NewEvent;