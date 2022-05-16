import express from 'express';
import { ObjectId } from 'mongodb';
import firestoreDb from "../app";
import { User } from '../models/user.model';
import bcrypt from "bcrypt";
const router = express.Router();
import data from "../data";
const usersData = data.usersData;
const xss = require('xss');
const bcryptRounds: number = 10; // used for encrypting the password using bcrypt

router.get("/logout", async(req, res) => {
    try{
        let statuscode: number = 200;
        req.session.destroy((err) =>{
            if(err) throw "Signout failed"
        })
        return res.status(200).json({"success": true, "result": "user has successfully logged out"})
    }catch(e){
        return res.status(400).json({"success": false, "result": e})
    }
})

router.get("/:userId", async(req, res) => {
    try{
        if (!ObjectId.isValid(req.params.userId.toString())) throw [400, "Bad Parameters, Invalid user ID"]
        let id: string = xss(req.params.userId);
        let getUserDetails = await usersData.getUser(id);
        console.log(getUserDetails);
        res.status(200).json({ "success": true, "result": getUserDetails });
        return;
    }catch(e: ?){
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
})

router.post("/login", async(req, res) => {
    try{
        if(req.session.userId) throw [400, "user is already loggedin."];
        if(typeof(req.body.email)!='string'||typeof(req.body.password)!='string') throw [400, "Login Details Not In String Format"]
        if(!req.body.email.trim() || !req.body.password.trim()) throw [400, "Login Details Might Be Empty"]
        let email: string = xss(req.body.email.trim().toLowerCase());
        let password: string = xss(req.body.password.trim());
        // const hashPassword = await bcrypt.hash(password, bcryptRounds)
        // retrieve if there is data with the given email
        
        let userId = null;
        const querySnapshot = await firestoreDb.collection("users").where("email", "==", email.toLowerCase()).get();

        if(querySnapshot.docs[0]){

            let storedPassword = querySnapshot.docs[0].data().password
            let compare = await bcrypt.compare(password, storedPassword)
            console.log(compare)
            if(!compare) throw [400, "Either email or password are invalid."];
            let getUserDetails = await usersData.getUser(xss(querySnapshot.docs[0].data().userId));
            req.session.userId = querySnapshot.docs[0].data().userId;
            req.session.userName = getUserDetails.name;
            userId = req.session.userId;
            
        }else throw [400, "Either email or password are invalid."];
        
        res.status(200).json({ "success": true, "result": "successful in login", "userId": userId });
        return;
    }catch(e: ?){
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
})

router.post("/signup", async(req, res) => {
    try{
        let {user, password} = req.body;
        console.log(user)
        console.log(password)
        if(typeof(user.name)!='string'||typeof(user.gender)!='string'||typeof(user.email.toLowerCase())!='string'||
        typeof(user.address.postal_code) !='string' ||
        typeof(user.address.city)!='string'||
        typeof(user.address.state)!='string'||
        typeof(user.address.country)!='string' ||
        typeof(password)!='string') throw [400, "Registration Details Not In String Format"]

        if(!user.name.trim() || !user.gender.trim() || !user.email.trim().toLowerCase()  || 
        !user.address.city.trim() || !user.address.state.trim() || !user.address.postal_code ||
         !user.address.country.trim() ||
         !password.trim()) throw [400, "Registration Details Might Be Empty Strings"]

         if(isNaN(Number(user.phone)))throw [400, "Phone Number Is Not Number"]
         if(isNaN(Number(user.address.postal_code))) throw [400, "ZIP Is Not Number"]
         if( !isNaN(Number(user.name.trim())) || !isNaN(Number(user.address.city.trim())) || !isNaN(Number(user.address.state.trim())) ||
        !isNaN(Number( user.address.country.trim())) || !isNaN(Number(user.gender.trim())) ||
         !isNaN(Number(user.email.trim().toLowerCase()))
         ) throw [400, "Any Detail Of The User Might Be A Number Which Require To Be A String"]
        let newUser: User = {
            "name": xss(user.name.trim()),
            "address": {
                "city": xss(user.address.city.trim()),
                "state": xss(user.address.state.trim()),
                "postal_code": xss(Number(user.address.postal_code)),
                "country": xss(user.address.country.trim())
            },
            "phone": xss(Number(user.phone)),
            "gender": xss(user.gender.trim()),
            "email": xss(user.email.trim().toLowerCase()),
            "dateOfBirth": xss(user.dateOfBirth),
            "hostEventArray": [],
            "attendEventArray": []
        }

        let newlyCreatedUser = await usersData.createUser(newUser);
        if(!newlyCreatedUser) throw [500, "User cannot be signed up."]
        const hashPassword = await bcrypt.hash(password.trim(), bcryptRounds)
        const prequerySnapshot = await firestoreDb.collection("users").where("email", "==", user.email.trim().toLowerCase()).get();
        if(prequerySnapshot.docs[0]) throw [400, "User already exists with that email."]
        const querySnapshot = await firestoreDb.collection("users").add({
            email: user.email.trim().toLowerCase(),
            password: hashPassword,
            userId: newlyCreatedUser._id
        });

        req.session.userId = newlyCreatedUser._id.toString();
        req.session.userName = newlyCreatedUser.name;

        return res.status(200).json({ "success": true, "newUser": newlyCreatedUser, "firestoreId": querySnapshot.id});
        //return;
    }catch(e: ?){
        console.log(e)
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
    return;
})

router.put("/", async(req, res) => {
    try{
        if(!req.session.userId) throw [400, "User Not Logged In"]
        if(typeof(req.body.name)!='string'||typeof(req.body.gender)!='string'||typeof(req.body.email.toLowerCase())!='string'||
        typeof(req.body.address.city)!='string'||
        typeof(req.body.address.postal_code) !='string' ||
        typeof(req.body.address.state)!='string'||
        typeof(req.body.address.country)!='string'||
        typeof(req.body.password)!='string') throw [400, "Updation Details Not In String Format"]

        if(!req.body.name.trim() || !req.body.gender.trim() || !req.body.email.trim().toLowerCase()  || 
        !req.body.address.city.trim() || !req.body.address.state.trim() || !req.body.address.postal_code ||
         !req.body.address.country.trim() 
         || !req.body.trim()) throw [400, "Updation Details Might Be Empty Strings"]

         if(isNaN(Number(req.body.phone)))throw [400, "Phone Number Is Not Number"]
        if(isNaN(Number(req.body.address.postal_code))) throw [400, "ZIP Is Not Number"]
         if( !isNaN(Number(req.body.name.trim())) || !isNaN(Number(req.body.address.city.trim())) || !isNaN(Number(req.body.address.state.trim())) ||
            !isNaN(Number(req.body.address.country.trim())) || 
            !isNaN(Number(req.body.gender.trim())) ||
            !isNaN(Number(req.body.email.trim().toLowerCase()))
         ) throw [400, "Any Detail Of The User Might Be A Number Which Require To Be A String"]

        let newUser: User = {
            "_id": xss(req.session.id),
            "name": xss(req.body.name.trim()),
            "address": {
                "city": xss(req.body.address.city.trim()),
                "state": xss(req.body.address.state.trim()),
                "postal_code": xss(Number(req.body.address.postal_code)),
                "country": xss(req.body.address.country.trim())
            },
            "phone": xss(Number(req.body.phone)),
            "gender": xss(req.body.gender.trim()),
            "email": xss(req.body.email.trim().toLowerCase()),
            "dateOfBirth": xss(req.body.dateOfBirth.trim()),
            "hostEventArray": xss(req.body.hostEventArray),
            "attendEventArray": xss(req.body.attendEventArray)
        }

        let updatedUser = await usersData.modifyUser(newUser);
        console.log(updatedUser);

        req.session.userName = updatedUser.name;
        const prequerySnapshotEmail = await firestoreDb.collection("users").where("userId", "!=", req.session.userId).where("email", "==", req.body.email.trim().toLowerCase()).get();
        if(prequerySnapshotEmail) throw [400, "A user already exists with that email."]

        // changing email in firebase too
        const prequerySnapshot = await firestoreDb.collection("users").where("userId", "==", req.session.userId).get();
        if(!prequerySnapshot.docs[0]) throw [400, "Old Password is incorrect."];

        const firebaseId = prequerySnapshot.docs[0].id;

        const querySnapshot = await firestoreDb.collection("users").doc(firebaseId).update({
            "email": req.body.email.trim().toLowerCase(),
        });

        res.status(200).json({ "success": true, "result": updatedUser });
        return;
    }catch(e: ?){
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
})

router.get("/HostedEvents", async(req, res) => {
    try{
        if(!req.session.userId) throw [400, "User Not Logged In"]
        let hostedEvents = await usersData.getHostedEvents(xss(req.session.userId));
        console.log(hostedEvents);
        res.status(200).json({ "success": true, "result": hostedEvents });
        return;
    }catch(e: ?){
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
})

router.get("/RegisteredEvents", async(req, res) => {
    try{
        if(!req.session.userId) throw [400, "User Not Logged In"]
        let registeredEvents = await usersData.getRegisteredEvents(xss(req.session.userId));
        console.log('test')
        console.log(registeredEvents);
        return res.status(200).json({ "success": true, "result": registeredEvents });
    }catch(e){
        return res.status(400).json({ "success": false, "result": e });
    }
})

router.post("/changepassword", async(req, res) => {
    try{
        if(!req.session.userId) throw [400, "User Not Logged In"]
        if(typeof(req.body.oldPassword)!='string'||typeof(req.body.newPassword)!='string') throw [400, "Passwords Not In String"]
        if(!req.body.oldPassword.trim() || !req.body.newPassword.trim() ) throw [400, "Passwords Might Be Empty Strings"]

        let oldPassword: string = req.body.oldPassword.trim()
        let newPassword: string = req.body.newPassword.trim();
        let userId: string = req.session.userId;
        // const hasholdPassword = await bcrypt.hash(oldPassword.trim(), bcryptRounds)
        const hashnewPassword = await bcrypt.hash(newPassword.trim(), bcryptRounds)
        console.log("userId", userId);

        // const prequerySnapshot = await firestoreDb.collection("users").where("userId", "==", userId).where("password", "==", hasholdPassword).get();
        const querySnapshot = await firestoreDb.collection("users").where("userId", "==", userId).get();

        if(querySnapshot.docs[0]){

            let storedPassword = querySnapshot.docs[0].data().password
            let compare = await bcrypt.compare(oldPassword, storedPassword)
            console.log(compare)
            if(!compare) throw [400, "Password is invalid."]; 
            const firebaseId = querySnapshot.docs[0].id;

            const changequerySnapshot = await firestoreDb.collection("users").doc(firebaseId).update({
                "password": hashnewPassword,
            });
        }
        else throw [400,"User doesn't exist."];
        console.log(querySnapshot);
        res.status(200).json({"success": true, "result": "password changed successfully"});
        return;

    }catch(e: ?){
        console.log(e);
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
})

router.delete("/", async(req, res) => {
    try{
        if(!req.session.userId) throw [400, "User Not Logged In"]
        let deleteRequestedUser = await usersData.deleteUser(xss(req.session.userId));
        const prequerySnapshot = await firestoreDb.collection("users").where("userId", "==", req.session.userId).get();
        const firebaseId = prequerySnapshot.docs[0].id;
        if(!firebaseId) throw [400, "could not find any account with the given userId"];
        const querySnapshot = await firestoreDb.collection("users").doc(firebaseId).delete()
        req.session.destroy((err) => {
        })
        if(!req.session) res.status(200).json({ "success": true, "result": deleteRequestedUser });
        return;
    }catch(e: ?){
        res.status(e[0]).json({ "success": false, "result": e[1]})
        return;
    }
})

export default router;