//jshint esversion: 6

var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
var path = require('path');

const app = express();

//to render static content/pages
app.use('*/image',express.static(path.join(__dirname, 'public/image')));
app.use('*/js',express.static(path.join(__dirname, 'public/javascripts')));
app.use('*/css',express.static(path.join(__dirname, 'public/css')));

app.use(bodyParser.urlencoded({extended:true}) );

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "/signup.html"));
});

app.post("/", function (req, res) {
   var firstName = req.body.fName;
   var lastName = req.body.lName;
   var email = req.body.email;

   var data = {
       members: [
           {
               email_address: email,
               status: "subscribed",
               merge_fields: {
                   FNAME: firstName,
                   LNAME: lastName
               }
           }
       ]
   };

   var jsonData = JSON.stringify(data);

   var options = {
       url: "https://us18.api.mailchimp.com/3.0/lists/088018369f",
       method: "POST",
       headers: {
           "Authorization": "Thando 0c4675020c4a9c9cb56ed7e171f1b2e9-us18"
       },
       body: jsonData
   }
   request(options, function (error, response, body) {
        if (error) {
            res.sendFile(__dirname+"/failure.html")
        } else {
            console.log(response.statusCode);
            if (response.statusCode === 200) {
                res.sendFile(__dirname+"/success.html");
            }

        }
   })

});

app.post("/failure", function (req, res) {
   res.redirect("/");
});

app.listen(process.env.PORT || 3000, function () {
    console.log("listenning to port 3000");
});