import * as admin from "firebase-admin/app";
import * as keyAdmin from "firebase-admin";
import * as firestore from "firebase-admin/firestore";
import cors from "cors"
import express from 'express';
import session from "express-session";
import configRoutes from "./routes";
import xss from "xss";
const regex = "^\/users(\/login|\/signup)?(\/)?$";
let shouldAuthenticate = true;
const app = express();
app.use(cors({credentials: true, origin: "http://localhost:3000"}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({credentials: true}));
app.use(session({
    name: 'AuthCookie',
    secret: 'some secret string!',
    resave: false,
    saveUninitialized: true
}))

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

/**
 * Middleware Functions
 */
app.use("*", (req, res, next) => {
    console.log("Incoming URL: " + req.url + " " + req.method + " " + new Date() + req.session.userId + " ");
    next();
});


app.post(regex, (req, res, next) => {
    if(req.session.userId)
        return res.status(401).json({ "success": false, "result": 'user is already logged in.'});
    shouldAuthenticate = false;
    next();
});
app.use('*', (req, res, next) => {
    if(shouldAuthenticate && !req.session.userId)
        return res.status(401).json({ "success": false, "result": 'user must be logged in.'});
    next();
});
app.use('*', (req, res, next) => {
    if(req.body) {
        for(let param in req.body) {
            console.log(req.body[param])
            //req.body[param] = xss(req.body[param]);
        }
    }
    next();
});

/**
 * Firebase Configurations
 */
const firebaseConfig = {
    apiKey: "AIzaSyAhlIfs1X-mXFWaNqJX15Ew83SY9X-_NLs",
    authDomain: "allez-3e5a1.firebaseapp.com",
    projectId: "allez-3e5a1",
    storageBucket: "allez-3e5a1.appspot.com",
    messagingSenderId: "491306185561",
    appId: "1:491306185561:web:78fbfcb2570c17c1659248",
    measurementId: "G-2BMLN6HEX9"
  };
const credential = {credential: keyAdmin.credential.cert(require('../firebase-private-key.json'))}; // initialize firebase
const firebaseApp = admin.initializeApp(credential); // initialize the database and the collection
const firestoreDb = firestore.getFirestore();
// exports.firestoreDb = firestoreDb;
export default firestoreDb;


configRoutes(app);

// exports.app = functions.https.onRequest(app);

app.listen(4000, () => {
    console.log("We have now got a server");
    console.log('Your routes will be running on http://localhost:4000');
})
