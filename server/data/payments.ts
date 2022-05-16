import { Event } from "../models/events.model";
import { User } from "../models/user.model";
import Stripe from "stripe";
import "dotenv/config";
import { ObjectId, WithId } from "mongodb";
import usersdata from "./users";
import { collections, events, users } from "../config/mongoCollections";

let stripe_key : string;
if(process.env.STRIPE_PRIVATE_KEY) {
    stripe_key = process.env.STRIPE_PRIVATE_KEY
} else {
    throw new Error("Stripe Key is not set");
}

const stripe = new Stripe( stripe_key, {
    apiVersion: '2020-08-27'
});

type EventProduct = {
    id ?: string,
    name: string,
    description: string,
    images: string[],
    metadata: {
        category: string,
        totalSeats: number,
        hostId: string,
        minAge: number,
    }
}


type EventPrice = {
    id ?: string,
    product: string,
    currency: string,
    unit_amount: number,
    billing_scheme: Stripe.Price.BillingScheme
}

type Address = {
    line1: string,
    city: string,
    state: string,
    country: string,
    postal_code: string
}

type EventCustomer = {
    id ?: string,
    name: string,
    email: string,
    phone: string,
    metadata: {
        gender: string,
        dateOfBirth: Date
    }
    address: Address,
    shipping: {
        address: Stripe.Emptyable<Stripe.AddressParam>
        name: string,
        phone: string
    }
}

type Card = {
    number: string,
    exp_month: number,
    exp_year: number,
    cvc: string
}

async function addEvent(event: Event): Promise<boolean> {
    
    if((!event) ||(event._id === undefined) || (!event.name || event.name.trim().length === 0) || (!event.description || event.description.trim().length === 0)
        || (event.category.length === 0) || (!event.totalSeats || event.totalSeats === 0) || (event.hostId === undefined)) {
            throw [400, "Bad Request, Insufficient parameters sent."];
    }
    else {   
        let newEvent: EventProduct = {
            "id": event._id?.toString(),
            "name": event.name,
            "description": event.description,
            "images": event.eventImgs,
            "metadata": {
                "category": event.category.toString(),
                "totalSeats": event.totalSeats,
                "hostId": event.hostId.toString(),
                "minAge": event.minAge
            }
        }
        
        let insertedEvent = await stripe.products.create(newEvent);
        console.log(insertedEvent);
        if(insertedEvent){
            return true;
        } else {
            return false;
        }
    }   
}

async function getEvent(eventID: string): Promise<Stripe.Response<Stripe.Product>> {
    if(!eventID) {
        throw [400, "Bad Request, please enter a valid eventID"];
    }
    else {
        let event = await stripe.products.retrieve(eventID);
        if(event) {
            return event;
        } else {
            throw [404, "The event with this ID is not found."]
        }
    }
}

async function modifyEvent(event: Event) {
    
    if((!event) ||(event._id === undefined) || (!event.name || event.name.trim().length === 0) ||
     (!event.description || event.description.trim().length === 0)
    || (event.category.length === 0) || (!event.totalSeats || event.totalSeats === 0) || 
    (event.hostId === undefined) || (!event.minAge)) {
            throw [400, "Bad Request, Insufficient parameters sent."];
    }
    if(typeof(event.name)!='string' || typeof(event.venue.address)!='string' || typeof(event.venue.city)!='string'||
    typeof(event.venue.state)!='string' || typeof(event.venue.city)!='string' || typeof(event.venue.zip)!='string'
    ) throw [400, "Event Details Mgiht Not Be String Where Expected"]

    if (!event.name.trim() || !event.venue.address.trim() || !event.venue.city.trim() ||
     !event.venue.state.trim() || !event.venue.zip.trim()) throw [400, "Event Details Might Be Empty Strings"]

    if (isNaN(Number(event.totalSeats)) ||
     isNaN(Number(event.minAge)) ||
      isNaN(Number(event.venue.geoLocation.lat)) ||
     isNaN(Number(event.venue.geoLocation.long)) ||
     isNaN(Number(event.venue.zip))
     ) throw [400, "Events Data Might Not Be Number Where Expected"]

    if (!isNaN(Number(event.venue.address)) || !isNaN(Number(event.venue.city)) || 
    !isNaN(Number(event.venue.state))) throw [400, "Event Details Might Be A Number Where Expected A String."]
     else {
        let modEvent: EventProduct = {
            "id": event._id?.toString(),
            "name": event.name,
            "description": event.description,
            "images": event.eventImgs,
            "metadata": {
                "category": event.category.toString(),
                "totalSeats": event.totalSeats,
                "hostId": event.hostId.toString(),
                "minAge": event.minAge
            }
        }
        const product = await stripe.products.update(
            event._id.toString(),
            modEvent
          );
          let updatePrice = updateEventRegFee(event._id.toString(), event.price)
          return modEvent
    }
}

async function removeEvent(eventID: string): Promise<Stripe.Response<Stripe.Product>> {
    if(!eventID) {
        throw [400, "Bad Request, please enter a valid eventID"];
    } else {
        let event = await stripe.products.retrieve(eventID);
        if(event) {
            let delEvent = await stripe.products.update(event.id, {active: false});
            return delEvent
        } else {
            throw [404, "This event does not exist in Stripe"];
        }
    }
}

async function addEventRegFee(eventID: string, price: number) {
    if(!eventID) {
        throw [400, "Bad Parameters, Please enter a valid event ID"]
    }
    else {
        let event = await stripe.products.retrieve(eventID);
        if(event) {
            let eventFee: EventPrice = {
                product: eventID,
                currency: "usd",
                unit_amount: price*100,
                billing_scheme: "per_unit",
            }
            
            let newFee = await stripe.prices.create(eventFee)
            if(newFee) {
                return newFee;
            } else {
                throw [400, "Unable to add price to event."]
            }
        }
    }
}

async function updateEventRegFee(eventID: string, price: number) {
    if(!eventID) {
        throw [400, "Bad Parameters, Please enter a valid event ID"]
    }
    else {
        let event = await stripe.products.retrieve(eventID);
        if(event) {
            let eventFee: Stripe.Response<Stripe.ApiList<Stripe.Price>> = await stripe.prices.list({
                product: event.id,
                active: true
            })
            
            if(eventFee.data && eventFee.data.length > 0) {
                let eventPriceId: string = eventFee.data[0].id;
                let updatedPriceObj = await stripe.prices.update(eventPriceId, {active: false});
                if(!updatedPriceObj.active) {
                    let eventFee: EventPrice = {
                        product: event.id,
                        currency: "usd",
                        unit_amount: price*100,
                        billing_scheme: "per_unit",
                    }
                    let newPriceObj = await stripe.prices.create(eventFee);
                    return newPriceObj;
                } else {
                    throw [500, "Unable to modify price from the product"]
                }
            } else {
                throw [404, "This product does not have any active prices."]
            }
        } else {
            throw [400, "This event does not exist in Stripe."]
        }
    }
}

async function getEventPrice(eventId: string) {
    if(!eventId) {
        throw [400, "Bad Parameters, Please enter a valid event ID"]
    }
    else {
        let event = await stripe.products.retrieve(eventId);
        if(event) {
            let eventFee: Stripe.Response<Stripe.ApiList<Stripe.Price>> = await stripe.prices.list({
                product: event.id,
                active: true
            })

            if(eventFee.data && eventFee.data.length > 0) {
                let eventPriceId: string = eventFee.data[0].id;
                return eventPriceId;
            } else {
                throw [404, "This product does not have any active prices."]
            }
        } else {
            throw [400, "This event does not exist in Stripe."]
        }
    }
}

async function addCustomer(customer: User) {
    let newCustomer: Stripe.CustomerCreateParams = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone.toString(),
        metadata: {
            gender: customer.gender,
        },
        
        shipping: {
            name: customer.name,
            address: customer.address,
            phone: customer.phone.toString()
        }
    } 

    let insertedCustomer = await stripe.customers.create(newCustomer)
    return insertedCustomer;
}

async function searchCustomer(email: string) {
    let emailRegex: RegExp = /^\S+@\S+\.\S+$/;
    if(!email) {
        throw [400,"Please enter an email"];
    } else if (email.trim().length === 0 || !emailRegex.test(email)) {
        throw [400, "Invalid Email"];
    }else {
        let {data} = await stripe.customers.search({query: `email:${email}`})
        let idList: string[] = [];
        if(data && data.length > 0) {
            data.forEach(e => {
                idList.push(e.id);
            })
            return idList;
        }
    }
}
async function removeCustomer(customerID: string) {
    if(!customerID) {
        throw [400, "Invalid Customer Details"];
    } else {
        let customer = await stripe.customers.retrieve(customerID);
        if(customer && !Object.keys(customer).includes('deleted')) {
            let delCustomer = await stripe.customers.del(customerID);
            return delCustomer.deleted;
        }
    }
}

async function createSession(eventId: string, custId: string) {
    
    if(!ObjectId.isValid(eventId.toString())) throw [400, "Event ID Is Invalid"]
    if(!ObjectId.isValid(custId.toString())) throw [400, "User ID Is Invalid"]
    let userData = await usersdata.getUser(custId.toString().trim())
    let dob = userData.dateOfBirth
    let ageInYears = new Date().getFullYear() - new Date(dob).getFullYear();
    let eventId_objId = new ObjectId(eventId.toString().trim())
    await events();
    let requestedEvent = await collections.events?.findOne({ _id: eventId_objId })
    
    if (!requestedEvent) throw [400, "Event Not Found"]
    if(ageInYears < requestedEvent?.minAge) throw [400, "You Do Not Meet The Minimum Age Requirements To Attend This Event."]
    if (requestedEvent?.totalSeats === requestedEvent?.bookedSeats) {
        throw [400, 'Event Is Full Already']
    }
    if (custId === requestedEvent?.hostId) {
        throw [400, "You're the Host"]
    }
    if (requestedEvent?.cohostArr?.includes(custId)) {
        throw [400, "You're A Cohost"]
    }
    else {
        if (!userData.attendEventArray.includes(eventId)) {
            throw [400, "You Have Already Registered For The Event"]
        } else {
            const eventPriceID: string = await getEventPrice(eventId);
            await users();
            let user = await collections.users?.findOne({_id: new ObjectId(custId)});
            if(user) {
                let custEmail = user.email;
                let custId = await searchCustomer(custEmail);
                if(custId && custId.length > 0) {}
                const session: Stripe.Response<Stripe.Checkout.Session> = await stripe.checkout.sessions.create({
                    success_url: "http://localhost:3000/events/eventDashboard",
                    cancel_url: "http://localhost:3000/error",
                    line_items: [
                        {price: eventPriceID}
                    ],
                    customer_creation: "always",
                    payment_method_types: ["card"],
                    mode: "payment"
                })
                console.log(session);
                return session.url;
            }

        }
    }
}

async function expireSession() {

}

// async function paymentMethod (cardDetails: Card, address: Address) {
//     let {cvc, number, exp_month, exp_year} = cardDetails;
//     if()
// }


// async function createPaymentIntent(amount: number, customerId: string, eventId: string, email: string) {
//     try {
//         if(!amount || !customerId || !eventId) {
//             console.log('Invalid Details');
//         } else {
//             let customer: Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer> = await stripe.customers.retrieve(customerId);
//             if(customer && Object.keys(customer).includes('email')) {
//                 email = (customer as Stripe.Customer).email!;
//             }
//             let newPaymentIntent: Stripe.PaymentIntentCreateParams = {
//                 amount: amount*100,
//                 customer: customerId,
//                 currency: 'usd',
//                 confirm: true,
//                 receipt_email: email,
//                 metadata: {
//                     eventId: eventId
//                 }
//             }
    
//             let createdIntent = await stripe.paymentIntents.create(newPaymentIntent)
//             return createdIntent;
//         }
//     } catch(e) {
//         console.log(e);
//     }
// }

export default {
    addEvent,
    getEvent,
    removeEvent,
    addEventRegFee,
    updateEventRegFee,
    addCustomer,
    removeCustomer,
    // createPaymentIntent,
    modifyEvent,
    createSession
}