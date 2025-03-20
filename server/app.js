const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const blogRoutes = require('./routes/gameRoutes');

//express
const app = express();

const dbURI = 'mongodb+srv://Reese:Giantsus-2005@cluster0.9g6dv.mongodb.net/node-prac?retryWrites=true&w=majority&tls=true';
mongoose.connect(dbURI)
    .then((results) => app.listen(3000))
    .catch((err) => console.log(err));

//register view engine
app.set('view engine', 'ejs');

//liste for requests

//middleware & static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true}));
app.use(morgan('dev'));

//routes
app.get('/', (req, res) =>{
    //res.send('<p>Home page</p>');
   // res.sendFile('./episode/views/index.html', {root: __dirname});// this is a way to get the directory ame to make it a relative access
    res.redirect('/blogs');
});
app.get('/about', (req, res) =>{
    //res.sendFile('./episode/views/about.html', {root: __dirname});// this is a way to get the directory ame to make it a relative access 
    res.render('about', { title: 'About'});
});

//blog routes

app.use('/blogs', blogRoutes);

//404 page- this should always be after redirectng becase it will run it as it goes down
app.use((req, res) =>{
    //res.status(404).sendFile('./views/404.html', {root: __dirname});
    res.status(404).render('404', { title: '404'});
});
